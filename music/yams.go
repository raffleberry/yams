package music

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/raffleberry/yams/app"
	"github.com/raffleberry/yams/db"
	"github.com/raffleberry/yams/server"
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

	m := mux.NewRouter()

	fs := os.DirFS("./music")
	if os.Getenv("DEV") == "" {
		log.Println("Using embedded UI")
		fs = uiEmbed
	}

	m.HandleFunc("/api/all", server.WithCtx(all))
	m.HandleFunc("/api/props", server.WithCtx(props))
	m.HandleFunc("/api/files", server.WithCtx(files))
	m.HandleFunc("/api/artwork", server.WithCtx(artwork))
	m.HandleFunc("/api/search", server.WithCtx(search))
	m.HandleFunc("/api/triggerScan", server.WithCtx(triggerScan))
	m.HandleFunc("/api/history", server.WithCtx(history))
	m.HandleFunc("/api/artists", server.WithCtx(allArtists))
	m.HandleFunc("/api/artists/{artists}", server.WithCtx(getArtist))
	m.HandleFunc("/api/isScanning", server.WithCtx(func(c *server.Context) error {
		return c.JSON(http.StatusOK, isScanning)
	}))

	m.HandleFunc("/{path:.*}", server.WithCtx(uiHandler(fs)))
	return m
}

func uiHandler(fsys fs.FS) func(c *server.Context) error {
	return func(c *server.Context) error {
		p := mux.Vars(c.R)["path"]

		if strings.HasPrefix(p, "api") {
			return fmt.Errorf("api path not found")
		}

		rFilePath := filepath.Join("ui", p)
		fi, err := fs.Stat(fsys, rFilePath)

		if err != nil || fi.IsDir() {
			return c.FileFromFS(filepath.Join("./ui", "index.html"), fsys)
		}

		return c.FileFromFS(rFilePath, fsys)
	}
}

func props(c *server.Context) error {
	p := c.R.URL.Query().Get("path")
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

func getArtist(c *server.Context) error {
	const limit = 30
	vars := mux.Vars(c.R)
	artists := vars["artists"]
	log.Println(artists)
	offsetStr := c.R.URL.Query().Get("offset")
	offset, err := strconv.Atoi(offsetStr)
	if err != nil {
		offset = 0
	}
	args := []interface{}{}
	for _, artist := range strings.Split(artists, ",") {
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

func allArtists(c *server.Context) error {
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

func history(c *server.Context) error {
	if c.R.Method == http.MethodPost {
		m := Music{}
		err := json.NewDecoder(c.R.Body).Decode(&m)
		if err != nil {
			return c.Error(http.StatusBadRequest, err.Error())
		}

		_, err = db.R.Exec(`INSERT INTO history (
			Title,
			Artists, Album, Genre,
			Year, Track, Length) VALUES
			(?,
			?,?,?,
			?,?,?);`,
			m.Title,
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

	} else if c.R.Method == http.MethodGet {

		offsetParam := c.R.URL.Query().Get("offset")
		offset, err := strconv.Atoi(offsetParam)
		const limit = 10
		if err != nil {
			log.Println("WARN: Bad offset, setting offset to 0")
			offset = 0
		}
		rows, err := db.R.Query(`SELECT
			Time, Title, 
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
			if err := rows.Scan(&m.Time, &m.Title,
				&m.Artists, &m.Album, &m.Genre,
				&m.Year, &m.Track, &m.Length); err != nil {
				return err
			}
			musics = append(musics, m)
		}
		if err := rows.Err(); err != nil {
			return err
		}

		updateHistoryMeta(&musics)

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

func updateHistoryMeta(m *[]History) {
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

func triggerScan(c *server.Context) error {
	if isScanning {
		return c.JSON(http.StatusServiceUnavailable, "Scan already in progress")
	}
	go scan()
	return c.JSON(http.StatusOK, "Scan started")
}

func search(c *server.Context) error {
	const limit = 10
	params := c.R.URL.Query()
	query := params.Get("query")
	offsetParam := params.Get("offset")

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

func all(c *server.Context) error {
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

func artwork(c *server.Context) error {
	p := c.R.URL.Query().Get("path")
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
	c.W.Header().Set("Content-Type", "image/jpeg")
	c.W.Header().Set("Cache-Control", "public, max-age=15768000")
	c.W.Header().Set("Content-Length", strconv.Itoa(len(artwork)))
	_, err = c.W.Write(artwork)
	return err
}

func files(c *server.Context) error {
	p := c.R.URL.Query().Get("path")
	if p == "" {
		p = app.RootDir
	}
	p = filepath.Clean(p)
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
