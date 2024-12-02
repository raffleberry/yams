package music

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"slices"
	"strconv"
	"strings"

	"github.com/raffleberry/yams/app"
	"github.com/raffleberry/yams/db"
	"github.com/raffleberry/yams/music/cache"
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

	mux := http.NewServeMux()

	fs := os.DirFS("./music")
	if os.Getenv("DEV") == "" {
		log.Println("Using embedded UI")
		fs = uiEmbed
	}

	api := http.NewServeMux()
	api.HandleFunc("GET /all", server.WithCtx(all))
	api.HandleFunc("GET /props", server.WithCtx(props))
	api.HandleFunc("GET /files", server.WithCtx(files))
	api.HandleFunc("GET /artwork", server.WithCtx(artwork))
	api.HandleFunc("GET /search", server.WithCtx(search))
	api.HandleFunc("GET /triggerScan", server.WithCtx(triggerScan))
	api.HandleFunc("GET /history", server.WithCtx(getHistory))
	api.HandleFunc("POST /history", server.WithCtx(postHistory))
	api.HandleFunc("GET /artists", server.WithCtx(allArtists))
	api.HandleFunc("GET /artists/{artists}", server.WithCtx(getArtist))
	api.HandleFunc("GET /albums", server.WithCtx(allAlbums))
	api.HandleFunc("GET /albums/{album}", server.WithCtx(getAlbum))
	api.HandleFunc("GET /isScanning", server.WithCtx(func(c *server.Context) error {
		return c.JSON(http.StatusOK, isScanning)
	}))

	mux.Handle("/api/", http.StripPrefix("/api", api))
	mux.HandleFunc("/", server.WithCtx(uiHandler(fs)))
	return mux
}

func uiHandler(fsys fs.FS) func(c *server.Context) error {
	return func(c *server.Context) error {
		p := c.R.URL.Path

		if strings.HasPrefix(p, "api") {
			return fmt.Errorf("api path not found")
		}

		rFilePath := path.Join("ui", p)
		fi, err := fs.Stat(fsys, rFilePath)

		if err != nil || fi.IsDir() {
			return c.FileFromFS(path.Join("ui", "index.html"), fsys)
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
	rArtists := []string{}
	for _, artist := range strings.Split(c.R.PathValue("artists"), ",") {
		rArtists = append(rArtists, strings.TrimSpace(artist))
	}

	args := []interface{}{}
	for _, artist := range rArtists {
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
		ok := false
		for _, artist := range strings.Split(m.Artists, ",") {
			ok = ok || slices.Contains(rArtists, strings.TrimSpace(artist))
		}
		if ok {
			musics = append(musics, m)
		}
	}

	return c.JSON(http.StatusOK, struct {
		Data []Music
	}{
		Data: musics,
	})
}

func allAlbums(c *server.Context) error {
	albums := []Music{}

	if cache.Exists("allAlbums") {
		json.Unmarshal(cache.Get("allAlbums"), &albums)

	} else {

		rows, err := db.L.Query(`SELECT Album, MIN(Artists) as Artists, Year FROM files WHERE Path GLOB '` + app.RootDir + `*' group by Album, Year;`)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var m Music
			if err := rows.Scan(&m.Album, &m.Artists, &m.Year); err != nil {
				return err
			}
			albums = append(albums, m)
		}
		b, err := json.Marshal(albums)
		if err != nil {
			log.Println("Error: failed to set cache", err)
		} else {
			cache.Set("allAlbums", b)
		}
	}

	return c.JSON(http.StatusOK, struct {
		Data []Music
	}{
		Data: albums,
	})
}

func getAlbum(c *server.Context) error {
	album := c.R.PathValue("album")

	var q = `SELECT
		Path, Title, Size,
		Artists, Album, Genre,
		Year, Track, Length,
		Bitrate, Samplerate, Channels
	FROM files WHERE Path GLOB '` + app.RootDir + `*'` +
		` AND Album = ?;`

	rows, err := db.L.Query(q, album)
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

	return c.JSON(http.StatusOK, struct {
		Data []Music
	}{
		Data: musics,
	})
}

func allArtists(c *server.Context) error {

	artists := []Music{}

	if cache.Exists("allArtists") {
		json.Unmarshal(cache.Get("allArtists"), &artists)

	} else {

		rows, err := db.L.Query(`SELECT Artists FROM files WHERE Path GLOB '` + app.RootDir + `*' group by Artists;`)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var m Music
			if err := rows.Scan(&m.Artists); err != nil {
				return err
			}
			artists = append(artists, m)
		}
		b, err := json.Marshal(artists)
		if err != nil {
			log.Println("Error: failed to set cache", err)
		} else {
			cache.Set("allArtists", b)
		}
	}

	return c.JSON(http.StatusOK, struct {
		Data []Music
	}{
		Data: artists,
	})

}

func getHistory(c *server.Context) error {

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
}

func postHistory(c *server.Context) error {
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
