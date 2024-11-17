package music

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/raffleberry/yams/app"
	"github.com/raffleberry/yams/db"
)

//go:embed ui
var uiEmbed embed.FS

func Api() http.Handler {

	for _, dbTable := range dbTables {
		_, err := db.L.Exec(dbTable)
		if err != nil {
			log.Fatal(err)
		}
	}

	d, err := os.Stat(app.RootDir)
	if err != nil || !d.IsDir() {
		log.Fatalf("couldn't find music directory, isDir()- %v, err: %v", d.IsDir(), err)
	}
	if !scanned() {
		go scan()
	}

	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
		Format:           "${time_custom} ${method} ${status} ${uri} ${error}\n",
		CustomTimeFormat: "2006-01-02 15:04:05",
	}))
	e.Use(middleware.Recover())

	fs := os.DirFS("./music")
	if os.Getenv("DEV") == "" {
		fs = uiEmbed
	}

	e.GET("/*", uiHandler(fs))

	e.GET("/api/all*", all)
	e.GET("/api/props*", props)
	e.GET("/api/files*", files)
	e.GET("/api/artwork*", artwork)
	e.GET("/api/search*", search)
	e.GET("/api/triggerScan*", triggerScan)
	e.GET("/api/isScanning*", func(c echo.Context) error {
		return c.JSON(http.StatusOK, isScanning)
	})
	e.Any("/api/history", history)
	e.GET("/api/artists/", allArtists)
	e.GET("/api/artists/:artists", getArtist)

	return e
}

func uiHandler(fsys fs.FS) func(c echo.Context) error {
	return func(c echo.Context) error {
		p := c.Request().RequestURI[1:]
		if strings.HasPrefix(p, "api") {
			return fmt.Errorf("api path not found")
		}

		pPath := filepath.Join("ui", p)
		fi, err := fs.Stat(uiEmbed, pPath)
		if err != nil || fi.IsDir() {
			b, err := fs.ReadFile(fsys, "ui/index.html")
			if err != nil {
				return err
			}
			return c.HTML(http.StatusOK, string(b))
		}

		f, err := fsys.Open(pPath)
		if err != nil {
			return err
		}
		return c.Stream(http.StatusOK, mime.TypeByExtension(filepath.Ext(p)), f)
	}
}

func props(c echo.Context) error {
	p := c.QueryParam("path")
	rows, err := db.L.Query("SELECT Props FROM files WHERE Path=?", p)
	if err != nil {
		return err
	}
	defer rows.Close()
	var props string
	for rows.Next() {
		if err := rows.Scan(&props); err != nil {
			return err
		}
	}
	var v interface{}
	json.Unmarshal([]byte(props), &v)
	return c.JSON(http.StatusOK, v)
}

func getArtist(c echo.Context) error {
	const limit = 30

	param := c.Param("artists")
	log.Println(param)
	offsetStr := c.QueryParam("offset")
	offset, err := strconv.Atoi(offsetStr)
	if err != nil {
		offset = 0
	}
	args := []interface{}{}
	for _, artist := range strings.Split(param, ",") {
		args = append(args, "%"+strings.TrimSpace(artist)+"%")
	}

	var baseQuery = `SELECT
		Path, Title, Size,
		Artists, Album, Genre,
		Year, Track, Length,
		Bitrate, Samplerate, Channels
	FROM files WHERE Path GLOB '` + app.RootDir + `*'`

	q := baseQuery

	for i := range args {
		if i == 0 {
			q += ` AND Artists LIKE ? `
		} else {
			q += ` AND Artists LIKE ? `
		}
	}
	q += " LIMIT ? OFFSET ?;"
	args = append(args, limit)
	args = append(args, offset)
	rows, err := db.L.Query(q, args...)
	if err != nil {
		return err
	}
	defer rows.Close()

	musics := []Music{}

	for rows.Next() {
		m := Music{}
		if err := rows.Scan(&m.Path, &m.Title, &m.Size,
			&m.Artists, &m.Album, &m.Genre,
			&m.Year, &m.Track, &m.Length,
			&m.Bitrate, &m.Samplerate, &m.Channels); err != nil {
			return err
		}
		musics = append(musics, m)
	}
	next := offset + limit
	if len(musics) < limit {
		next = -1
	}

	return c.JSON(http.StatusOK, struct {
		Musics []Music
		Next   int
	}{
		Musics: musics,
		Next:   next,
	})
}

func allArtists(c echo.Context) error {
	artists := []string{}
	rows, err := db.L.Query(`SELECT DISTINCT Artists FROM files WHERE Path GLOB '` + app.RootDir + `*'`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var artist string
		if err := rows.Scan(&artist); err != nil {
			return err
		}
		artists = append(artists, artist)
	}
	return c.JSON(http.StatusOK, artists)
}

func history(c echo.Context) error {
	if c.Request().Method == http.MethodPost {
		m := Music{}
		c.Bind(&m)

		_, err := db.L.Exec(`INSERT INTO history (
			Path, Size, Title,
			Artists, Album, Genre,
			Year, Track, Length) VALUES
			(?,?,?,
			?,?,?,
			?,?,?);`,
			m.Path, m.Size, m.Title,
			m.Artists, m.Album, m.Genre,
			m.Year, m.Track, m.Length,
		)

		if err != nil {
			return err
		}

		return c.JSON(http.StatusOK, struct {
			Message string
			Title   string
			Artists string
		}{
			Message: "Playback history updated",
			Title:   m.Title,
			Artists: m.Artists,
		})

	} else if c.Request().Method == http.MethodGet {
		offsetParam := c.QueryParam("offset")
		offset, err := strconv.Atoi(offsetParam)
		const limit = 10
		if err != nil {
			log.Println("WARN: Bad offset, setting offset to 0")
			offset = 0
		}
		rows, err := db.L.Query(`SELECT
			Time, Title, Size,
			Artists, Album, Genre,
			Year, Track, Length
		FROM
			history
		ORDER BY
			Time DESC LIMIT ? OFFSET ?;`, limit, offset)
		if err != nil {
			return err
		}
		defer rows.Close()

		musics := []History{}
		for rows.Next() {
			m := History{}
			if err := rows.Scan(&m.Time, &m.Title, &m.Size,
				&m.Artists, &m.Album, &m.Genre,
				&m.Year, &m.Track, &m.Length); err != nil {
				return err
			}
			musics = append(musics, m)
		}
		if err := rows.Err(); err != nil {
			return err
		}

		updateHistoryPaths(&musics)

		next := offset + limit
		if len(musics) < limit {
			next = -1
		}
		return c.JSON(http.StatusOK, struct {
			Data []History
			Next int
		}{
			Data: musics,
			Next: next,
		})
	} else {
		return c.JSON(http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func updateHistoryPaths(m *[]History) {
	for i := range len(*m) {
		row, err := db.L.Query("SELECT Path FROM files WHERE Title=? and Artists=? and Album=? limit 1;", (*m)[i].Title, (*m)[i].Artists, (*m)[i].Album)
		if err != nil {
			log.Println(err)
		}
		var newPath string
		defer row.Close()
		for row.Next() {
			if err := row.Scan(&newPath); err != nil {
				log.Println("Err: ", err)
			}
		}

		if newPath != "" {
			(*m)[i].Path = newPath
		}
	}
}

func triggerScan(c echo.Context) error {
	if isScanning {
		return c.JSON(http.StatusServiceUnavailable, "Scan already in progress")
	}
	go scan()
	return c.JSON(http.StatusOK, "Scan started")
}

func search(c echo.Context) error {
	const limit = 10
	query := c.QueryParam("query")
	offsetParam := c.QueryParam("offset")
	offset, err := strconv.Atoi(offsetParam)
	if err != nil {
		log.Println("WARN: Bad offset, setting offset to 0")
		offset = 0
	}
	musicFiles := []Music{}
	q := `SELECT
        Path, Title, Size,
        Artists, Album, Genre,
        Year, Track, Length,
        Bitrate, Samplerate, Channels
    FROM
        files
    WHERE
        Path GLOB '` + app.RootDir + `*'
    AND
        (
            Artists LIKE '%` + query + `%'
            OR Album LIKE '%` + query + `%'
            OR Title LIKE '%` + query + `%'
            OR Year LIKE '%` + query + `%'
        )
    LIMIT ? OFFSET ?;`
	rows, err := db.L.Query(q, limit, offset)

	if err != nil {
		return fmt.Errorf("failed to query database: %v", err)
	}
	defer rows.Close()
	for rows.Next() {
		var m Music
		if err := rows.Scan(
			&m.Path, &m.Title, &m.Size,
			&m.Artists, &m.Album, &m.Genre,
			&m.Year, &m.Track, &m.Length,
			&m.Bitrate, &m.Samplerate, &m.Channels); err != nil {
			log.Printf("failed to get row: %v\n", err)
			continue
		}
		musicFiles = append(musicFiles, m)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	next := offset + limit
	if len(musicFiles) < limit {
		next = -1
	}
	r := struct {
		Data []Music
		Next int
	}{
		Data: musicFiles,
		Next: next,
	}
	return c.JSON(http.StatusOK, r)
}

func ls(path string) ([]File, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var files []File
	for _, entry := range entries {
		isDir := entry.IsDir()
		sz := 0
		if !isDir {
			i, err := entry.Info()
			if err == nil {
				sz = int(i.Size())
			} else {
				log.Printf("Err: while getting file size %v\n", err)
			}
		}
		files = append(files, File{
			Path:    filepath.Join(path, entry.Name()),
			IsDir:   isDir,
			Size:    sz,
			IsMedia: isMedia(entry.Name()),
		})
	}

	return files, nil
}

func all(c echo.Context) error {
	const limit = 10
	musicFiles := []Music{}
	q := fmt.Sprintf(`SELECT
			Path, Title, Size,
			Artists, Album, Genre,
			Year, Track, Length,
			Bitrate, Samplerate, Channels
		FROM
			files
		WHERE
			Path
		GLOB '%s*' ORDER BY RANDOM() LIMIT ?;`, app.RootDir)
	rows, err := db.L.Query(q, limit)

	if err != nil {
		return fmt.Errorf("failed to query database: %v", err)
	}
	defer rows.Close()
	for rows.Next() {
		var m Music
		if err := rows.Scan(
			&m.Path, &m.Title, &m.Size,
			&m.Artists, &m.Album, &m.Genre,
			&m.Year, &m.Track, &m.Length,
			&m.Bitrate, &m.Samplerate, &m.Channels); err != nil {
			log.Printf("failed to get row: %v\n", err)
			continue
		}
		musicFiles = append(musicFiles, m)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	r := struct {
		Data []Music
		Next int
	}{
		Data: musicFiles,
		Next: -1,
	}
	return c.JSON(http.StatusOK, r)
}

func artwork(c echo.Context) error {
	p := c.QueryParam("path")
	rows, err := db.L.Query("SELECT Artwork from files where Path=?", p)
	if err != nil {
		return err
	}
	defer rows.Close()
	var artwork []byte
	for rows.Next() {
		if err := rows.Scan(&artwork); err != nil {
			return err
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	c.Response().Header().Set("Cache-Control", "public, max-age=15768000")
	return c.Blob(http.StatusOK, "image/*", artwork)
}

func files(c echo.Context) error {
	p := c.QueryParam("path")
	if p == "" {
		p = app.RootDir
	}
	// any filepath on system can be accessed, not safe for hosting
	stat, err := os.Stat(p)
	if err != nil {
		return c.JSON(http.StatusNotFound, struct{ message string }{
			message: "Err: " + http.StatusText(http.StatusNotFound),
		})
	}

	if !stat.IsDir() {
		return c.File(p)
	}

	fileInfos, err := ls(p)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, fileInfos)
}
