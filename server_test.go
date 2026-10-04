package main

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func testServer(t *testing.T, prefix string) (*Server, *stubLyrics) {
	t.Helper()
	s := testStore(t)
	seedSongs(t, s)
	fetch := &stubLyrics{lyrics: "la", synced: "[00:01] la"}
	sc := &Scanner{Store: s, MusicDir: "/music"}
	srv := NewServer(s, sc, fetch, prefix, func() string { return "/music" })
	return srv, fetch
}

func get(t *testing.T, srv *Server, target string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest("GET", target, nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	return rec
}

func call(t *testing.T, srv *Server, method, target, body string) *httptest.ResponseRecorder {
	t.Helper()
	var r *strings.Reader
	if body == "" {
		r = strings.NewReader("")
	} else {
		r = strings.NewReader(body)
	}
	req := httptest.NewRequest(method, target, r)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	return rec
}

func pageData(t *testing.T, rec *httptest.ResponseRecorder) []any {
	t.Helper()

	if rec.Code != 200 {
		t.Fatalf("status = %d body = %s", rec.Code, rec.Body.String())
	}
	var v struct {
		Data []any `json:"Data"`
		Next int   `json:"Next"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &v); err != nil {

		t.Fatal(err)
	}

	return v.Data
}

func TestAPILibrary(t *testing.T) {
	srv, _ := testServer(t, "")

	if got := pageData(t, get(t, srv, "/api/all")); len(got) != 2 {
		t.Fatalf("all = %d", len(got))
	}
	if got := pageData(t, get(t, srv, "/api/search?query=alp&offset=0")); len(got) != 1 {
		t.Fatalf("search = %d", len(got))
	}
	if got := pageData(t, get(t, srv, "/api/search?query=zzz&offset=0")); len(got) != 0 {
		t.Fatalf("search empty = %d", len(got))
	}

	rec := get(t, srv, "/api/artists")
	var artists struct {
		Data []map[string]any `json:"Data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &artists); err != nil || len(artists.Data) != 2 {
		t.Fatalf("artists = %s %v", rec.Body.String(), err)
	}
	if got := pageData(t, get(t, srv, "/api/artists/Bob")); len(got) != 1 {
		t.Fatalf("artist songs = %d", len(got))
	}

	rec = get(t, srv, "/api/albums?offset=0")
	var albums struct {
		Data []Album `json:"Data"`
		Next int     `json:"Next"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &albums); err != nil || len(albums.Data) != 2 {
		t.Fatalf("albums = %s %v", rec.Body.String(), err)
	}
	if got := pageData(t, get(t, srv, "/api/albums/First")); len(got) != 1 {
		t.Fatalf("album songs = %d", len(got))
	}

	rec = get(t, srv, "/api/artwork?path=/music/b.flac")
	if rec.Code != 200 || rec.Body.Len() != 1 {
		t.Fatalf("artwork = %d %d", rec.Code, rec.Body.Len())
	}
	if rec := get(t, srv, "/api/artwork?path=/music/nope.mp3"); rec.Code != 404 {
		t.Fatalf("artwork missing = %d", rec.Code)
	}

	rec = get(t, srv, "/api/props?path=/music/a.mp3")
	var props map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &props); err != nil || props["Genre"] != "Rock" {
		t.Fatalf("props = %s %v", rec.Body.String(), err)
	}
}

func TestAPIHistoryAndFavourites(t *testing.T) {
	srv, _ := testServer(t, "")
	track := `{"Title":"Alpha","Artists":"Alice","Album":"First","Genre":"Rock","Year":"2020","Track":1,"Length":180}`

	if rec := call(t, srv, "POST", "/api/history", track); rec.Code != 200 {
		t.Fatalf("history add = %d %s", rec.Code, rec.Body.String())
	}

	if got := pageData(t, get(t, srv, "/api/history?offset=0")); len(got) != 1 {
		t.Fatalf("history = %d", len(got))
	}

	if rec := call(t, srv, "POST", "/api/favourites", track); rec.Code != 200 {
		t.Fatalf("fav add = %d", rec.Code)
	}
	got := pageData(t, get(t, srv, "/api/favourites"))

	if len(got) != 1 || got[0].(map[string]any)["IsFavourite"] != true {
		t.Fatalf("favourites = %v", got)
	}

	if rec := call(t, srv, "DELETE", "/api/favourites", track); rec.Code != 200 {
		t.Fatalf("fav del = %d", rec.Code)
	}
	if got := pageData(t, get(t, srv, "/api/favourites")); len(got) != 0 {
		t.Fatalf("favourites after del = %d", len(got))
	}
}

func TestAPIPlaylists(t *testing.T) {
	srv, _ := testServer(t, "")
	track := `{"Title":"Alpha","Artists":"Alice","Album":"First"}`

	rec := call(t, srv, "POST", "/api/playlists", `{"Name":"mix","Description":"d","Type":"LIST","Query":""}`)
	var p Playlist
	if err := json.Unmarshal(rec.Body.Bytes(), &p); err != nil || rec.Code != 200 || p.Id == 0 {
		t.Fatalf("create = %d %s %v", rec.Code, rec.Body.String(), err)
	}
	id := "/api/playlists/" + itoa64(p.Id)

	if rec := call(t, srv, "POST", id, track); rec.Code != 200 {
		t.Fatalf("add to = %d %s", rec.Code, rec.Body.String())
	}
	if got := pageData(t, get(t, srv, id)); len(got) != 1 {
		t.Fatalf("playlist songs = %d", len(got))
	}
	if rec := call(t, srv, "DELETE", id, track); rec.Code != 200 {
		t.Fatalf("del from = %d", rec.Code)
	}
	if got := pageData(t, get(t, srv, id)); len(got) != 0 {
		t.Fatalf("after del = %d", len(got))
	}
	if rec := get(t, srv, "/api/playlists/9999"); rec.Code != 404 {
		t.Fatalf("missing playlist = %d", rec.Code)
	}
	if rec := call(t, srv, "DELETE", "/api/playlists?id="+itoa64(p.Id), ""); rec.Code != 200 {
		t.Fatalf("delete = %d %s", rec.Code, rec.Body.String())
	}
}

func itoa64(n int64) string {
	if n == 0 {
		return "0"
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}

func TestAPIFilesAndLyrics(t *testing.T) {
	srv, fetch := testServer(t, "")
	f, err := os.CreateTemp("", "*.mp3")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(f.Name())
	f.WriteString("fake audio")
	f.Close()

	if rec := get(t, srv, "/api/files?path="+f.Name()); rec.Code != 200 {
		t.Fatalf("files = %d", rec.Code)
	}
	if rec := get(t, srv, "/api/files?path=/nope.mp3"); rec.Code != 404 {
		t.Fatalf("files missing = %d", rec.Code)
	}

	rec := get(t, srv, "/api/lyrics?path=/music/a.mp3")
	var l Lyrics
	if err := json.Unmarshal(rec.Body.Bytes(), &l); err != nil || rec.Code != 200 || l.Lyrics != "la" {
		t.Fatalf("lyrics = %d %s %v", rec.Code, rec.Body.String(), err)
	}
	if fetch.calls != 1 {
		t.Fatalf("fetch calls = %d", fetch.calls)
	}
	rec = get(t, srv, "/api/lyrics?path=/music/a.mp3")
	if fetch.calls != 1 || rec.Code != 200 {
		t.Fatalf("cached lyrics calls = %d status = %d", fetch.calls, rec.Code)
	}
	if rec := get(t, srv, "/api/lyrics?path=/music/nope.mp3"); rec.Code != 404 {
		t.Fatalf("lyrics missing = %d", rec.Code)
	}
}

func TestAPIScan(t *testing.T) {
	srv, _ := testServer(t, "")
	rec := get(t, srv, "/api/isScanning")
	if strings.TrimSpace(rec.Body.String()) != "false" {
		t.Fatalf("isScanning = %s", rec.Body.String())
	}
	rec = get(t, srv, "/api/triggerScan")
	if rec.Code != 202 {
		t.Fatalf("trigger = %d %s", rec.Code, rec.Body.String())
	}
}

func TestFrontend(t *testing.T) {
	srv, _ := testServer(t, "")
	rec := get(t, srv, "/")
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "<title>Music</title>") {
		t.Fatalf("index = %d %.100s", rec.Code, rec.Body.String())
	}
	rec = get(t, srv, "/some/route/that/is/spa")
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "<title>Music</title>") {
		t.Fatalf("spa fallback = %d", rec.Code)
	}
	rec = get(t, srv, "/index.css")
	if rec.Code != 200 {
		t.Fatalf("css = %d", rec.Code)
	}
}

func TestFrontendPrefix(t *testing.T) {
	srv, _ := testServer(t, "/yams")
	rec := get(t, srv, "/app/base.js")
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `export const base = "/yams"`) {
		t.Fatalf("base.js = %d %.120s", rec.Code, rec.Body.String())
	}
	rec = get(t, srv, "/")
	if !strings.Contains(rec.Body.String(), `href="/yams/`) {
		t.Fatalf("index prefix rewrite missing: %.200s", rec.Body.String())
	}
}
