package music

import (
	"database/sql"
	"embed"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/raffleberry/yams/app"
	"github.com/raffleberry/yams/db"
	"github.com/raffleberry/yams/server"
)

//go:embed ui
var uiEmbed embed.FS

func Api() http.Handler {
	err := initLtables()
	if err != nil {
		log.Fatal(err)
	}

	err = initRtables()
	if err != nil {
		log.Fatal(err)
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

	var h = server.WithCtx

	api := http.NewServeMux()

	api.HandleFunc("GET /all", h(all))
	api.HandleFunc("GET /props", h(props))
	api.HandleFunc("GET /files", h(files))
	api.HandleFunc("GET /artwork", h(artwork))
	api.HandleFunc("GET /search", h(search))

	api.HandleFunc("GET /history", h(getHistory))
	api.HandleFunc("POST /history", h(addToHistory))

	api.HandleFunc("GET /artists", h(allArtists))
	api.HandleFunc("GET /artists/{artists}", h(getArtist))

	api.HandleFunc("GET /albums", h(allAlbums))
	api.HandleFunc("GET /albums/{album}", h(getAlbum))

	api.HandleFunc("GET /playlists", h(allPlaylists))
	api.HandleFunc("GET /playlists/{id}", h(getPlayist))
	api.HandleFunc("POST /playlists/{id}", h(addToPlayist))
	api.HandleFunc("DELETE /playlists/{id}", h(deleteFromPlaylist))

	api.HandleFunc("GET /triggerScan", h(triggerScan))
	api.HandleFunc("GET /isScanning", h(func(c *server.Context) error {
		return c.JSON(http.StatusOK, isScanning)
	}))

	mux.Handle("/api/", http.StripPrefix("/api", api))
	mux.HandleFunc("/", server.WithCtx(uiHandler(fs)))
	return mux
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

func updateMeta(m *Music) {
	row := db.L.QueryRow(`SELECT 
		Path, Title, Size,
        Artists, Album, Genre,
        Year, Track, Length,
        Bitrate, Samplerate, Channels
	FROM files
	WHERE
		Title=? and Artists=? and Album=? limit 1;`,
		(*m).Title, (*m).Artists, (*m).Album,
	)
	err := row.Scan(
		(*m).Path, (*m).Title, (*m).Size,
		(*m).Artists, (*m).Album, (*m).Genre,
		(*m).Year, (*m).Track, (*m).Length,
		(*m).Bitrate, (*m).Samplerate, (*m).Channels,
	)
	if err != nil {
		log.Println("Err: ", err)
	}
}

func getPlaylistCount(id int, pname string) int {
	var count int
	var row *sql.Row
	if id != -1 {
		row = db.L.QueryRow("SELECT COUNT(*) FROM playlists_songs where PlaylistId=?;", id)
	} else {
		row = db.L.QueryRow("SELECT COUNT(*) FROM " + strings.ToLower(pname) + ";")
	}
	err := row.Scan(&count)
	if err != nil {
		log.Printf("ERR: Failed to get playlist count for %v, %v", id, pname)
		return 0
	}
	return count
}
