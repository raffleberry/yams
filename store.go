package main

import (
	"database/sql"
	"errors"
	"fmt"
	"path/filepath"
	"strings"

	_ "modernc.org/sqlite"
)

const songCols = `Path, Title, Size, Artists, Album, Genre, Year, COALESCE(Track,0), COALESCE(Length,0), COALESCE(Bitrate,0), COALESCE(Samplerate,0), COALESCE(Channels,0)`

type Store struct {
	Local  *sql.DB
	Remote *sql.DB
	Lrc    *sql.DB
}

func OpenStore(cfgDir string) (*Store, error) {
	open := func(name string) (*sql.DB, error) {
		db, err := sql.Open("sqlite", filepath.Join(cfgDir, name))
		if err != nil {
			return nil, err
		}
		db.SetMaxOpenConns(8)
		if err := db.Ping(); err != nil {
			return nil, err
		}
		return db, nil
	}
	s := &Store{}
	var err error
	if s.Local, err = open("yams.sqlite"); err != nil {
		return nil, err
	}
	if s.Remote, err = open("yams_remote.sqlite"); err != nil {
		s.Close()
		return nil, err
	}
	if s.Lrc, err = open("yams_lrc.sqlite"); err != nil {
		s.Close()
		return nil, err
	}
	if err := s.init(); err != nil {
		s.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) Close() {
	if s.Local != nil {
		s.Local.Close()
	}
	if s.Remote != nil {
		s.Remote.Close()
	}
	if s.Lrc != nil {
		s.Lrc.Close()
	}
}

func (s *Store) init() error {
	local := []string{
		`CREATE TABLE IF NOT EXISTS files (
			Path TEXT PRIMARY KEY, Size INTEGER, Title TEXT, Artists TEXT,
			Album TEXT, AlbumArtist TEXT, Comment TEXT, Genre TEXT, Year TEXT,
			Track INTEGER, Length INTEGER, Bitrate INTEGER, Samplerate INTEGER,
			Channels INTEGER, Artwork BLOB, Lyrics TEXT);`,
		`CREATE TABLE IF NOT EXISTS last_scan (
			Time DATETIME, Path TEXT PRIMARY KEY, InDisk INTEGER, InDb INTEGER,
			MissingFiles INTEGER, NewFiles INTEGER, Err TEXT);`,
	}
	remote := []string{
		`CREATE TABLE IF NOT EXISTS history (
			Time DATETIME DEFAULT CURRENT_TIMESTAMP, Path TEXT, Size INTEGER,
			Title TEXT, Artists TEXT, Album TEXT, Genre TEXT, Year TEXT,
			Track INTEGER, Length INTEGER);`,
		`CREATE TABLE IF NOT EXISTS playlists (
			Id INTEGER PRIMARY KEY, Name TEXT, Description TEXT,
			Type CHECK(Type IN ('LIST', 'QUERY')), Query TEXT,
			CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
			UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP);`,
		`CREATE TABLE IF NOT EXISTS playlists_songs (
			PlaylistId INTEGER, Path TEXT, Size INTEGER, Title TEXT,
			Artists TEXT, Album TEXT, Genre TEXT, Year TEXT,
			Track INTEGER, Length INTEGER);`,
		`CREATE TABLE IF NOT EXISTS favourites (
			Path TEXT, Size INTEGER, Title TEXT, Artists TEXT, Album TEXT,
			Genre TEXT, Year TEXT, Track INTEGER, Length INTEGER);`,
	}
	lrc := []string{
		`CREATE TABLE IF NOT EXISTS lyrics (
			Title TEXT, Artists TEXT, Album TEXT, Lyrics TEXT,
			SyncedLyrics TEXT, Instrumental INTEGER,
			PRIMARY KEY (Title, Artists, Album));`,
	}
	run := func(db *sql.DB, stmts []string) error {
		for _, q := range stmts {
			if _, err := db.Exec(q); err != nil {
				return err
			}
		}
		return nil
	}
	if err := run(s.Local, local); err != nil {
		return err
	}
	if err := run(s.Remote, remote); err != nil {
		return err
	}
	return run(s.Lrc, lrc)
}

func scanSong(row interface{ Scan(...any) error }) (Song, error) {
	var m Song
	err := row.Scan(&m.Path, &m.Title, &m.Size, &m.Artists, &m.Album,
		&m.Genre, &m.Year, &m.Track, &m.Length, &m.Bitrate, &m.Samplerate, &m.Channels)
	return m, err
}

func asString(v any) string {
	switch v := v.(type) {
	case nil:
		return ""
	case string:
		return v
	case []byte:
		return string(v)
	default:
		return fmt.Sprint(v)
	}
}

func (s *Store) querySongs(db *sql.DB, q string, args ...any) ([]Song, error) {
	rows, err := db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Song{}
	for rows.Next() {
		m, err := scanSong(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Store) Aux(m *Song) error {
	err := s.Remote.QueryRow(
		`SELECT COUNT(*) FROM favourites WHERE Title=? AND Artists=? AND Album=?;`,
		m.Title, m.Artists, m.Album).Scan(&m.PlayCount)
	if err != nil {
		return err
	}
	m.IsFavourite = m.PlayCount > 0
	m.PlayCount = 0
	return s.Remote.QueryRow(
		`SELECT COUNT(*) FROM history WHERE Title=? AND Artists=? AND Album=?;`,
		m.Title, m.Artists, m.Album).Scan(&m.PlayCount)
}

func (s *Store) FillMeta(m *Song) error {
	found, err := scanSong(s.Local.QueryRow(
		`SELECT `+songCols+` FROM files WHERE Title=? AND Artists=? AND Album=? LIMIT 1;`,
		m.Title, m.Artists, m.Album))
	if err == sql.ErrNoRows {
		return nil
	}
	if err != nil {
		return err
	}
	found.IsFavourite = m.IsFavourite
	found.PlayCount = m.PlayCount
	*m = found
	return nil
}

func (s *Store) RandomSongs(musicDir string, limit int) ([]Song, error) {
	songs, err := s.querySongs(s.Local,
		`SELECT `+songCols+` FROM files WHERE Path GLOB ? GROUP BY Title, Artists, Album ORDER BY RANDOM() LIMIT ?;`,
		musicDir+"*", limit)
	if err != nil {
		return nil, err
	}
	return s.withAux(songs)
}

func (s *Store) withAux(songs []Song) ([]Song, error) {
	for i := range songs {
		if err := s.Aux(&songs[i]); err != nil {
			return nil, err
		}
	}
	return songs, nil
}

func (s *Store) SearchSongs(musicDir, query string, limit, offset int) ([]Song, error) {
	like := "%" + query + "%"
	songs, err := s.querySongs(s.Local,
		`SELECT `+songCols+` FROM files WHERE Path GLOB ?
		AND (Artists LIKE ? OR Album LIKE ? OR Title LIKE ? OR Year LIKE ?)
		GROUP BY Title, Artists, Album LIMIT ? OFFSET ?;`,
		musicDir+"*", like, like, like, like, limit, offset)
	if err != nil {
		return nil, err
	}
	return s.withAux(songs)
}

func (s *Store) Artists(musicDir string) ([]string, error) {
	rows, err := s.Local.Query(
		`SELECT Artists FROM files WHERE Path GLOB ? GROUP BY Artists;`, musicDir+"*")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var a string
		if err := rows.Scan(&a); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *Store) ArtistSongs(musicDir string, names []string) ([]Song, error) {
	q := `SELECT ` + songCols + ` FROM files WHERE Path GLOB ?`
	args := []any{musicDir + "*"}
	for _, n := range names {
		q += ` AND Artists LIKE ?`
		args = append(args, "%"+n+"%")
	}
	q += ` GROUP BY Title, Artists, Album ORDER BY Year DESC;`
	songs, err := s.querySongs(s.Local, q, args...)
	if err != nil {
		return nil, err
	}
	out := []Song{}
	for _, m := range songs {
		for _, have := range strings.Split(m.Artists, ",") {
			for _, want := range names {
				if strings.TrimSpace(have) == want {
					if err := s.Aux(&m); err != nil {
						return nil, err
					}
					out = append(out, m)
					goto next
				}
			}
		}
	next:
	}
	return out, nil
}

func (s *Store) Albums(musicDir string, limit, offset int) ([]Album, error) {
	rows, err := s.Local.Query(
		`SELECT Path, Album, AlbumArtist, Year, COUNT(DISTINCT Title) AS Songs
		FROM files WHERE Path GLOB ? GROUP BY Album, Year ORDER BY Songs DESC LIMIT ? OFFSET ?;`,
		musicDir+"*", limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Album{}
	for rows.Next() {
		var a Album
		if err := rows.Scan(&a.Path, &a.Album, &a.AlbumArtist, &a.Year, &a.Songs); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *Store) AlbumSongs(musicDir, album string) ([]Song, error) {
	songs, err := s.querySongs(s.Local,
		`SELECT `+songCols+` FROM files WHERE Path GLOB ? AND Album=? GROUP BY Title, Artists ORDER BY Track ASC;`,
		musicDir+"*", album)
	if err != nil {
		return nil, err
	}
	return s.withAux(songs)
}

func (s *Store) Artwork(path string) ([]byte, error) {
	var art []byte
	err := s.Local.QueryRow(`SELECT Artwork FROM files WHERE Path=?;`, path).Scan(&art)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return art, err
}

func (s *Store) FileMeta(path string) (title, artists, albumArtist, album string, length int, ok bool, err error) {
	err = s.Local.QueryRow(
		`SELECT Title, Artists, AlbumArtist, Album, COALESCE(Length,0) FROM files WHERE Path=?;`,
		path).Scan(&title, &artists, &albumArtist, &album, &length)
	if err == sql.ErrNoRows {
		return "", "", "", "", 0, false, nil
	}
	if err != nil {
		return "", "", "", "", 0, false, err
	}
	return title, artists, albumArtist, album, length, true, nil
}

func (s *Store) Props(path string) (lyrics, genre, comment string, size int64, ok bool, err error) {
	var l, g, c sql.NullString
	err = s.Local.QueryRow(
		`SELECT Lyrics, Genre, Comment, Size FROM files WHERE Path=?;`,
		path).Scan(&l, &g, &c, &size)
	if err == sql.ErrNoRows {
		return "", "", "", 0, false, nil
	}
	if err != nil {
		return "", "", "", 0, false, err
	}
	return l.String, g.String, c.String, size, true, nil
}

func (s *Store) History(limit, offset int) ([]History, error) {
	rows, err := s.Remote.Query(
		`SELECT datetime(Time, 'localtime'), Title, Artists, Album, Genre, Year, Track, Length
		FROM history ORDER BY Time DESC LIMIT ? OFFSET ?;`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []History{}
	for rows.Next() {
		var h History
		if err := rows.Scan(&h.Time, &h.Title, &h.Artists, &h.Album,
			&h.Genre, &h.Year, &h.Track, &h.Length); err != nil {
			return nil, err
		}
		if err := s.FillMeta(&h.Song); err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	return out, rows.Err()
}

func (s *Store) HistoryAdd(m Song) error {
	_, err := s.Remote.Exec(
		`INSERT INTO history (Title, Artists, Album, Genre, Year, Track, Length) VALUES (?,?,?,?,?,?,?);`,
		m.Title, m.Artists, m.Album, m.Genre, m.Year, m.Track, m.Length)
	return err
}

func (s *Store) Favourites() ([]Song, error) {
	rows, err := s.Remote.Query(
		`SELECT Title, Artists, Album, Genre, Year, Track, Length FROM favourites;`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Song{}
	for rows.Next() {
		var m Song
		if err := rows.Scan(&m.Title, &m.Artists, &m.Album,
			&m.Genre, &m.Year, &m.Track, &m.Length); err != nil {
			return nil, err
		}
		if err := s.Aux(&m); err != nil {
			return nil, err
		}
		if err := s.FillMeta(&m); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Store) FavouriteAdd(m Song) error {
	_, err := s.Remote.Exec(
		`INSERT INTO favourites (Title, Artists, Album, Genre, Year, Track, Length) VALUES (?,?,?,?,?,?,?);`,
		m.Title, m.Artists, m.Album, m.Genre, m.Year, m.Track, m.Length)
	return err
}

func (s *Store) FavouriteDel(m Song) error {
	_, err := s.Remote.Exec(
		`DELETE FROM favourites WHERE Title=? AND Artists=? AND Album=?;`,
		m.Title, m.Artists, m.Album)
	return err
}

func (s *Store) Playlists() ([]Playlist, error) {
	rows, err := s.Remote.Query(`SELECT Id, Name, Description, Type, Query FROM playlists;`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Playlist{}
	for rows.Next() {
		var p Playlist
		if err := rows.Scan(&p.Id, &p.Name, &p.Description, &p.Type, &p.Query); err != nil {
			return nil, err
		}
		if err := s.Remote.QueryRow(
			`SELECT COUNT(*) FROM playlists_songs WHERE PlaylistId=?;`, p.Id).Scan(&p.Count); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) PlaylistCreate(p *Playlist) error {
	if p.Type != "LIST" && p.Type != "QUERY" {
		return errors.New("invalid playlist type " + p.Type)
	}
	res, err := s.Remote.Exec(
		`INSERT INTO playlists (Name, Description, Type, Query) VALUES (?,?,?,?);`,
		p.Name, p.Description, p.Type, p.Query)
	if err != nil {
		return err
	}
	p.Id, err = res.LastInsertId()
	return err
}

func (s *Store) PlaylistUpdate(p *Playlist) error {
	_, err := s.Remote.Exec(
		`UPDATE playlists SET Name=?, Description=? WHERE Id=?;`,
		p.Name, p.Description, p.Id)
	return err
}

func (s *Store) PlaylistDelete(id int64) (songsDeleted int64, err error) {
	var typ string
	err = s.Remote.QueryRow(`SELECT Type FROM playlists WHERE Id=?;`, id).Scan(&typ)
	if err == sql.ErrNoRows {
		return 0, sql.ErrNoRows
	}
	if err != nil {
		return 0, err
	}
	if _, err = s.Remote.Exec(`DELETE FROM playlists WHERE Id=?;`, id); err != nil {
		return 0, err
	}
	if typ == "LIST" {
		res, err := s.Remote.Exec(`DELETE FROM playlists_songs WHERE PlaylistId=?;`, id)
		if err != nil {
			return 0, err
		}
		songsDeleted, _ = res.RowsAffected()
	}
	return songsDeleted, nil
}

func (s *Store) PlaylistSongs(id int64) ([]Song, error) {
	var typ, query string
	err := s.Remote.QueryRow(`SELECT Type, Query FROM playlists WHERE Id=?;`, id).Scan(&typ, &query)
	if err == sql.ErrNoRows {
		return nil, sql.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	if typ == "LIST" {
		rows, err := s.Remote.Query(
			`SELECT Title, Artists, Album, Genre, Year, Track, Length FROM playlists_songs WHERE PlaylistId=?;`, id)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		out := []Song{}
		for rows.Next() {
			var m Song
			if err := rows.Scan(&m.Title, &m.Artists, &m.Album,
				&m.Genre, &m.Year, &m.Track, &m.Length); err != nil {
				return nil, err
			}
			if err := s.Aux(&m); err != nil {
				return nil, err
			}
			if err := s.FillMeta(&m); err != nil {
				return nil, err
			}
			out = append(out, m)
		}
		return out, rows.Err()
	}
	for _, col := range []string{"Title", "Artists", "Album", "Year"} {
		if !strings.Contains(query, col) {
			return nil, errors.New("Invalid query: missing - " + col)
		}
	}
	rows, err := s.Remote.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cols, err := rows.Columns()
	if err != nil {
		return nil, err
	}
	idx := map[string]int{}
	for i, c := range cols {
		idx[c] = i
	}
	for _, col := range []string{"Title", "Artists", "Album", "Year"} {
		if _, ok := idx[col]; !ok {
			return nil, errors.New("Invalid query: missing - " + col)
		}
	}
	vals := make([]any, len(cols))
	ptrs := make([]any, len(cols))
	for i := range vals {
		ptrs[i] = &vals[i]
	}
	out := []Song{}
	for rows.Next() {
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		m := Song{Title: asString(vals[idx["Title"]]), Artists: asString(vals[idx["Artists"]]),
			Album: asString(vals[idx["Album"]]), Year: asString(vals[idx["Year"]])}
		if err := s.FillMeta(&m); err != nil {
			return nil, err
		}
		if err := s.Aux(&m); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Store) PlaylistAddSong(id int64, m Song) error {
	var exists int
	if err := s.Remote.QueryRow(`SELECT COUNT(*) FROM playlists WHERE Id=?;`, id).Scan(&exists); err != nil {
		return err
	}
	if exists == 0 {
		return sql.ErrNoRows
	}
	_, err := s.Remote.Exec(
		`INSERT INTO playlists_songs (PlaylistId, Title, Artists, Album, Genre, Year, Track, Length)
		VALUES (?,?,?,?,?,?,?,?);`,
		id, m.Title, m.Artists, m.Album, m.Genre, m.Year, m.Track, m.Length)
	return err
}

func (s *Store) PlaylistDelSong(id int64, m Song) error {
	var exists int
	if err := s.Remote.QueryRow(`SELECT COUNT(*) FROM playlists WHERE Id=?;`, id).Scan(&exists); err != nil {
		return err
	}
	if exists == 0 {
		return sql.ErrNoRows
	}
	_, err := s.Remote.Exec(
		`DELETE FROM playlists_songs WHERE Title=? AND Artists=? AND Album=? AND PlaylistId=?;`,
		m.Title, m.Artists, m.Album, id)
	return err
}

func (s *Store) InsertFile(m Song) error {
	_, err := s.Local.Exec(
		`INSERT INTO files (Path, Size, Title, Artists, Album, AlbumArtist, Comment, Genre,
		Year, Track, Length, Bitrate, Samplerate, Channels, Artwork, Lyrics)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`,
		m.Path, m.Size, m.Title, m.Artists, m.Album, m.AlbumArtist, m.Comment,
		m.Genre, m.Year, m.Track, m.Length, m.Bitrate, m.Samplerate, m.Channels,
		m.Artwork, m.Lyrics)
	return err
}

func (s *Store) DeleteFile(path string) error {
	_, err := s.Local.Exec(`DELETE FROM files WHERE Path=?;`, path)
	return err
}

func (s *Store) FilePaths(musicDir string) (map[string]bool, error) {
	rows, err := s.Local.Query(`SELECT Path FROM files;`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]bool{}
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, err
		}
		if strings.HasPrefix(p, musicDir) {
			out[p] = true
		}
	}
	return out, rows.Err()
}

type LastScan struct {
	InDisk       int
	InDb         int
	MissingFiles int
	NewFiles     int
	Err          string
}

func (s *Store) InsertLastScan(musicDir string, l LastScan) error {
	_, err := s.Local.Exec(
		`INSERT OR REPLACE INTO last_scan (Time, Path, InDisk, InDb, MissingFiles, NewFiles, Err)
		VALUES (datetime('now'),?,?,?,?,?,?);`,
		musicDir, l.InDisk, l.InDb, l.MissingFiles, l.NewFiles, l.Err)
	return err
}

func (s *Store) LyricsGet(title, artists, album string) (Lyrics, bool, error) {
	var l Lyrics
	l.Title, l.Artists, l.Album = title, artists, album
	var lyrics, synced sql.NullString
	err := s.Lrc.QueryRow(
		`SELECT Lyrics, SyncedLyrics, Instrumental FROM lyrics WHERE Title=? AND Artists=? AND Album=?;`,
		title, artists, album).Scan(&lyrics, &synced, &l.Instrumental)
	if err == sql.ErrNoRows {
		return l, false, nil
	}
	if err != nil {
		return l, false, err
	}
	l.Lyrics, l.SyncedLyrics = lyrics.String, synced.String
	return l, true, nil
}

func (s *Store) LyricsPut(l Lyrics) error {
	_, err := s.Lrc.Exec(
		`INSERT OR REPLACE INTO lyrics (Title, Artists, Album, Lyrics, SyncedLyrics, Instrumental)
		VALUES (?,?,?,?,?,?);`,
		l.Title, l.Artists, l.Album, l.Lyrics, l.SyncedLyrics, l.Instrumental)
	return err
}
