package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const pageLimit = 10

type Server struct {
	Store   *Store
	Scanner *Scanner
	Lyrics  LyricsFetcher
	Prefix  string

	musicDir func() string
}

func NewServer(store *Store, scanner *Scanner, lyrics LyricsFetcher, prefix string, musicDir func() string) *Server {
	return &Server{Store: store, Scanner: scanner, Lyrics: lyrics, Prefix: prefix, musicDir: musicDir}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/all", s.all)
	mux.HandleFunc("GET /api/artwork", s.artwork)
	mux.HandleFunc("GET /api/files", s.files)
	mux.HandleFunc("GET /api/search", s.search)
	mux.HandleFunc("GET /api/history", s.historyGet)
	mux.HandleFunc("POST /api/history", s.historyAdd)
	mux.HandleFunc("GET /api/artists", s.artistsAll)
	mux.HandleFunc("GET /api/artists/{artists}", s.artistsGet)
	mux.HandleFunc("GET /api/albums", s.albumsAll)
	mux.HandleFunc("GET /api/albums/{album}", s.albumsGet)
	mux.HandleFunc("GET /api/folders", s.folders)
	mux.HandleFunc("GET /api/years", s.yearsAll)
	mux.HandleFunc("GET /api/years/{year}", s.yearSongs)
	mux.HandleFunc("GET /api/playlists", s.playlistsAll)
	mux.HandleFunc("POST /api/playlists", s.playlistsNew)
	mux.HandleFunc("PUT /api/playlists", s.playlistsEdit)
	mux.HandleFunc("DELETE /api/playlists", s.playlistsDel)
	mux.HandleFunc("GET /api/playlists/{id}", s.playlistGet)
	mux.HandleFunc("POST /api/playlists/{id}", s.playlistAddTo)
	mux.HandleFunc("DELETE /api/playlists/{id}", s.playlistDelFrom)
	mux.HandleFunc("GET /api/favourites", s.favouritesGet)
	mux.HandleFunc("POST /api/favourites", s.favouritesAdd)
	mux.HandleFunc("DELETE /api/favourites", s.favouritesDel)
	mux.HandleFunc("GET /api/props", s.props)
	mux.HandleFunc("GET /api/lyrics", s.lyrics)
	mux.HandleFunc("GET /api/triggerScan", s.triggerScan)
	mux.HandleFunc("GET /api/isScanning", s.isScanning)

	static, err := newStaticHandler(s.Prefix)
	if err != nil {
		log.Printf("yams: embedded ui unavailable: %v", err)
		mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
			writeErr(w, http.StatusInternalServerError, "UI assets missing from binary")
		})
		return withRecovery(mux)
	}
	mux.Handle("GET /", static)
	return withRecovery(mux)
}

func withRecovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("yams: panic: %v", rec)
				writeErr(w, http.StatusInternalServerError, "Internal Server Error")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func decodeBody[T any](r *http.Request) (T, error) {
	var v T
	err := json.NewDecoder(r.Body).Decode(&v)
	return v, err
}

func offsetParam(r *http.Request) int {
	n, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if n < 0 {
		return 0
	}
	return n
}

func nextOffset(n int, offset int) int {
	if n < pageLimit {
		return -1
	}
	return offset + pageLimit
}

func (s *Server) all(w http.ResponseWriter, r *http.Request) {
	songs, err := s.Store.RandomSongs(s.musicDir(), pageLimit)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, Page{Data: songs, Next: -1})
}

func (s *Server) artwork(w http.ResponseWriter, r *http.Request) {
	art, err := s.Store.Artwork(r.URL.Query().Get("path"))
	if err != nil || len(art) == 0 {
		if err != nil {
			log.Printf("yams: artwork: %v", err)
		}
		w.WriteHeader(http.StatusNotFound)
		return
	}
	// Artwork is stored raw in the DB; sniff the type so browsers render it.
	w.Header().Set("Content-Type", http.DetectContentType(art))
	w.Header().Set("Cache-Control", mediaCacheControl)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeContent(w, r, "artwork", time.Time{}, bytes.NewReader(art))
}

// files streams audio. http.ServeFile honours Range requests, which is what
// lets the browser start playback and seek before the whole file arrives.
func (s *Server) files(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		writeErr(w, http.StatusBadRequest, "missing path")
		return
	}
	root, err := filepath.Abs(s.musicDir())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	abs, err := filepath.Abs(path)
	if err != nil || !strings.HasPrefix(abs, root) {
		// Never serve anything outside the configured music directory.
		writeErr(w, http.StatusForbidden, "path outside music directory")
		return
	}
	st, err := os.Stat(abs)
	if err != nil || st.IsDir() {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	w.Header().Set("Cache-Control", mediaCacheControl)
	w.Header().Set("Accept-Ranges", "bytes")
	http.ServeFile(w, r, abs)
}

func (s *Server) search(w http.ResponseWriter, r *http.Request) {
	offset := offsetParam(r)
	songs, err := s.Store.SearchSongs(s.musicDir(), r.URL.Query().Get("query"), pageLimit, offset)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, Page{Data: songs, Next: nextOffset(len(songs), offset)})
}

func (s *Server) historyGet(w http.ResponseWriter, r *http.Request) {
	offset := offsetParam(r)
	h, err := s.Store.History(pageLimit, offset)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, Page{Data: h, Next: nextOffset(len(h), offset)})
}

func (s *Server) historyAdd(w http.ResponseWriter, r *http.Request) {
	m, err := decodeBody[Song](r)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	if err := s.Store.HistoryAdd(m); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"Message": "Playback history updated", "Title": m.Title, "Artists": m.Artists})
}

func (s *Server) artistsAll(w http.ResponseWriter, r *http.Request) {
	names, err := s.Store.Artists(s.musicDir())
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	out := make([]Song, 0, len(names))
	for _, n := range names {
		out = append(out, Song{Artists: n})
	}
	writeJSON(w, 200, map[string]any{"Data": out})
}

func (s *Server) artistsGet(w http.ResponseWriter, r *http.Request) {
	var names []string
	for _, n := range strings.Split(r.PathValue("artists"), ",") {
		if n = strings.TrimSpace(n); n != "" {
			names = append(names, n)
		}
	}
	songs, err := s.Store.ArtistSongs(s.musicDir(), names)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{"Data": songs})
}

func (s *Server) albumsAll(w http.ResponseWriter, r *http.Request) {
	offset := offsetParam(r)
	albums, err := s.Store.Albums(s.musicDir(), pageLimit, offset)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, Page{Data: albums, Next: nextOffset(len(albums), offset)})
}

func (s *Server) albumsGet(w http.ResponseWriter, r *http.Request) {
	songs, err := s.Store.AlbumSongs(s.musicDir(), r.PathValue("album"))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{"Data": songs})
}

func (s *Server) playlistsAll(w http.ResponseWriter, r *http.Request) {
	lists, err := s.Store.Playlists()
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{"Data": lists})
}

func (s *Server) playlistsNew(w http.ResponseWriter, r *http.Request) {
	p, err := decodeBody[Playlist](r)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	if err := s.Store.PlaylistCreate(&p); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, p)
}

func (s *Server) playlistsEdit(w http.ResponseWriter, r *http.Request) {
	p, err := decodeBody[Playlist](r)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	if err := s.Store.PlaylistUpdate(&p); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, p)
}

func (s *Server) playlistsDel(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.URL.Query().Get("id"), 10, 64)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	n, err := s.Store.PlaylistDelete(id)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, map[string]string{"Message": "Playlist not found"})
		return
	}
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{"Message": "Playlist deleted", "Count": n})
}

func playlistID(r *http.Request) (int64, error) {
	return strconv.ParseInt(r.PathValue("id"), 10, 64)
}

func (s *Server) playlistGet(w http.ResponseWriter, r *http.Request) {
	offset := offsetParam(r)
	id, err := playlistID(r)
	if err != nil {
		writeErr(w, 400, "Invalid playlist id")
		return
	}
	songs, err := s.Store.PlaylistSongs(id)
	if err == sql.ErrNoRows {
		writeErr(w, 404, "Playlist not found")
		return
	}
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, Page{Data: songs, Next: nextOffset(len(songs), offset)})
}

func (s *Server) playlistAddTo(w http.ResponseWriter, r *http.Request) {
	id, err := playlistID(r)
	if err != nil {
		writeErr(w, 400, "Invalid playlist id")
		return
	}
	m, err := decodeBody[Song](r)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	if err := s.Store.PlaylistAddSong(id, m); err == sql.ErrNoRows {
		writeErr(w, 404, "Playlist not found")
		return
	} else if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"Message": "Added to playlist", "Title": m.Title, "Artists": m.Artists})
}

func (s *Server) playlistDelFrom(w http.ResponseWriter, r *http.Request) {
	id, err := playlistID(r)
	if err != nil {
		writeErr(w, 400, "Invalid playlist id")
		return
	}
	m, err := decodeBody[Song](r)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	if err := s.Store.PlaylistDelSong(id, m); err == sql.ErrNoRows {
		writeErr(w, 404, "Playlist not found")
		return
	} else if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"Message": "Removed from playlist", "Title": m.Title, "Artists": m.Artists})
}

func (s *Server) favouritesGet(w http.ResponseWriter, r *http.Request) {
	offset := offsetParam(r)
	songs, err := s.Store.Favourites()
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, Page{Data: songs, Next: nextOffset(len(songs), offset)})
}

func (s *Server) favouritesAdd(w http.ResponseWriter, r *http.Request) {
	m, err := decodeBody[Song](r)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	if err := s.Store.FavouriteAdd(m); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"Message": "Added to favourites", "Title": m.Title, "Artists": m.Artists})
}

func (s *Server) favouritesDel(w http.ResponseWriter, r *http.Request) {
	m, err := decodeBody[Song](r)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	if err := s.Store.FavouriteDel(m); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"Message": "Removed from favourites", "Title": m.Title, "Artists": m.Artists})
}

func (s *Server) props(w http.ResponseWriter, r *http.Request) {
	lyrics, genre, comment, size, ok, err := s.Store.Props(r.URL.Query().Get("path"))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	res := map[string]string{}
	if ok {
		res["Lyrics"] = lyrics
		res["Genre"] = genre
		res["Comment"] = comment
		res["Size"] = strconv.FormatFloat(float64(size)/1024/1024, 'f', 2, 64) + " MB"
	}
	writeJSON(w, 200, res)
}

func (s *Server) lyrics(w http.ResponseWriter, r *http.Request) {
	l, err := s.Store.SongLyrics(s.Lyrics, r.URL.Query().Get("path"))
	if err == sql.ErrNoRows {
		writeErr(w, 404, "File not found")
		return
	}
	if err != nil {
		writeErr(w, 503, "Lyrics api error: "+err.Error())
		return
	}
	writeJSON(w, 200, l)
}

func (s *Server) triggerScan(w http.ResponseWriter, r *http.Request) {
	if !s.Scanner.Start() {
		writeJSON(w, 503, map[string]string{"Message": "Already Scanning"})
		return
	}
	writeJSON(w, 202, map[string]string{"Message": "Started scanning"})
}

func (s *Server) isScanning(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, s.Scanner.Scanning())
}

func (s *Server) folders(w http.ResponseWriter, r *http.Request) {
	folders, err := s.Store.Folders(s.musicDir(), r.URL.Query().Get("path"))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{"Data": folders})
}

func (s *Server) yearsAll(w http.ResponseWriter, r *http.Request) {
	years, err := s.Store.Years(s.musicDir())
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	out := make([]string, 0, len(years))
	for _, y := range years {
		out = append(out, y)
	}
	writeJSON(w, 200, map[string]any{"Data": out})
}

func (s *Server) yearSongs(w http.ResponseWriter, r *http.Request) {
	songs, err := s.Store.YearSongs(s.musicDir(), r.PathValue("year"))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{"Data": songs})
}
