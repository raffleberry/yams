package music

import (
	"database/sql"
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
			m.addAux()
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
		`AND Album = ? GROUP BY Title, Artists ORDER BY Track ASC;`

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
		m.addAux()
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

			m.addAux()
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

	q += "GROUP BY Title, Artists, Album ORDER BY YEAR DESC;"

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
			m.addAux()
			musics = append(musics, m)
		}
	}

	return c.JSON(http.StatusOK, struct {
		Data []Music
	}{
		Data: musics,
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
		m.Music.addMeta()
		musics = append(musics, m)
	}
	if err := rows.Err(); err != nil {
		return err
	}

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

func addToHistory(c *server.Context) error {
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

func allPlaylists(c *server.Context) error {
	playlists := []Playlist{
		{
			Id:    -1,
			Name:  "Favourites",
			Count: getPlaylistCount(-1, "Favourites"),
		},
	}

	rows, err := db.R.Query(`SELECT Id, Name, Description, Type, Query FROM playlists;`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var p Playlist
		if err := rows.Scan(&p.Id, &p.Name, &p.Description, &p.Type, &p.Query); err != nil {
			return err
		}
		p.Count = getPlaylistCount(p.Id, p.Name)

		playlists = append(playlists, p)
	}

	return c.JSON(http.StatusOK, struct {
		Data []Playlist
	}{
		Data: playlists,
	})
}

func getPlayist(c *server.Context) error {
	offsetParam := c.R.URL.Query().Get("offset")
	idStr := c.R.PathValue("id")

	if idStr == "favourites" {
		return getFavourites(c)
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		return err
	}

	offset, err := strconv.Atoi(offsetParam)
	const limit = 10
	if err != nil {
		log.Println("WARN: Bad offset, setting offset to 0")
		offset = 0
	}
	var playlist Playlist
	row := db.R.QueryRow(`SELECT Id, Type, Query FROM playlists WHERE id = ?;`, id)
	err = row.Scan(&playlist.Id, &playlist.Type, &playlist.Query)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, "playlist not found")
		}
		return err
	}

	if playlist.Type == PlaylistTypeList {

		rows, err := db.R.Query(`SELECT
			Title, Artists, Album,
			Genre, Year, Track, Length
		FROM
			playlists_songs
		WHERE
			PlaylistId = ?;`, id)

		if err != nil {
			return err
		}
		defer rows.Close()

		musics := []Music{}
		for rows.Next() {
			m := Music{}
			if err := rows.Scan(&m.Title,
				&m.Artists, &m.Album, &m.Genre,
				&m.Year, &m.Track, &m.Length); err != nil {
				return err
			}
			m.addAux()
			m.addMeta()
			musics = append(musics, m)
		}
		if err := rows.Err(); err != nil {
			return err
		}

		next := offset + limit
		if len(musics) < limit {
			next = -1
		}
		return c.JSON(http.StatusOK, struct {
			Data []Music
			Next int
		}{
			Data: musics,
			Next: next,
		})
	} else if playlist.Type == PlaylistTypeQuery {

		rows, err := db.R.Query(playlist.Query)
		if err != nil {
			return err
		}

		cols, err := rows.Columns()
		if err != nil {
			return err
		}
		requiredCols := []string{"Title", "Artists", "Album"}
		for _, rc := range requiredCols {
			if !slices.Contains(cols, rc) {
				return fmt.Errorf("column: %s, not found in query. Required Columns - (%v)", rc, requiredCols)
			}
		}

		defer rows.Close()

		musics := []Music{}
		for rows.Next() {
			m := Music{}
			err := rows.Scan(&m.Title, &m.Artists, &m.Album)
			if err != nil {
				return err
			}
			m.addMeta()
			musics = append(musics, m)
		}
		if err := rows.Err(); err != nil {
			return err
		}

		next := offset + limit
		if len(musics) < limit {
			next = -1
		}
		return c.JSON(http.StatusOK, struct {
			Data []Music
			Next int
		}{
			Data: musics,
			Next: next,
		})
	}
	log.Println("Unimplemented")
	return nil
}

func addToPlayist(c *server.Context) error {

	idStr := c.R.PathValue("id")

	if idStr == "favourites" {
		return addToFavourites(c)
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		return err
	}

	row := db.R.QueryRow(`SELECT Id FROM playlists WHERE Id = ?;`, id)
	err = row.Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, "playlist not found")
		}
		return err
	}

	m := Music{}
	err = json.NewDecoder(c.R.Body).Decode(&m)
	if err != nil {
		return c.Error(http.StatusBadRequest, err.Error())
	}

	_, err = db.R.Exec(`INSERT INTO playlists_songs (
		PlaylistId, Title,
		Artists, Album, Genre,
		Year, Track, Length) VALUES
		(?, ?,
		?,?,?,
		?,?,?);`,
		id, m.Title,
		m.Artists, m.Album, m.Genre,
		m.Year, m.Track, m.Length,
	)

	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, "Added")
}

func deleteFromPlaylist(c *server.Context) error {

	idStr := c.R.PathValue("id")

	if idStr == "favourites" {
		return deleteFromFavourites(c)
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		return err
	}

	row := db.R.QueryRow(`SELECT Id FROM playlists WHERE Id = ?;`, id)
	err = row.Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusNotFound, "playlist not found")
		}
		return err
	}

	m := Music{}
	err = json.NewDecoder(c.R.Body).Decode(&m)
	if err != nil {
		return c.Error(http.StatusBadRequest, err.Error())
	}

	_, err = db.R.Exec(`DELETE FROM playlists_songs
		WHERE
		Title=? and Artists=? and Album=? and PlaylistId=?`,
		m.Title, m.Artists, m.Album, id)

	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, "Deleted")

}

func addToFavourites(c *server.Context) error {

	m := Music{}
	err := json.NewDecoder(c.R.Body).Decode(&m)
	if err != nil {
		return c.Error(http.StatusBadRequest, err.Error())
	}

	_, err = db.R.Exec(`INSERT INTO favourites (
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

	return c.JSON(http.StatusOK, "Added")

}

func deleteFromFavourites(c *server.Context) error {

	m := Music{}
	err := json.NewDecoder(c.R.Body).Decode(&m)
	if err != nil {
		return c.Error(http.StatusBadRequest, err.Error())
	}

	_, err = db.R.Exec(`DELETE FROM favourites
		WHERE
		Title=? and Artists=? and Album=?`,
		m.Title, m.Artists, m.Album)

	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, "Deleted")

}

func getFavourites(c *server.Context) error {
	offsetParam := c.R.URL.Query().Get("offset")
	offset, err := strconv.Atoi(offsetParam)
	const limit = 10
	if err != nil {
		log.Println("WARN: Bad offset, setting offset to 0")
		offset = 0
	}

	rows, err := db.R.Query(`SELECT
		Title, Artists, Album,
		Genre, Year, Track, Length
	FROM
		favourites`)

	if err != nil {
		return err
	}
	defer rows.Close()

	musics := []Music{}
	for rows.Next() {
		m := Music{}
		if err := rows.Scan(&m.Title,
			&m.Artists, &m.Album, &m.Genre,
			&m.Year, &m.Track, &m.Length); err != nil {
			return err
		}
		m.addAux()
		m.addMeta()
		musics = append(musics, m)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	next := offset + limit
	if len(musics) < limit {
		next = -1
	}
	return c.JSON(http.StatusOK, struct {
		Data []Music
		Next int
	}{
		Data: musics,
		Next: next,
	})
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
	GROUP BY Title, Artists, Album
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
		m.addAux()
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
		GLOB '%s*' GROUP BY Title, Artists, Album ORDER BY RANDOM() LIMIT ?;`, app.RootDir)
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
		m.addAux()

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
