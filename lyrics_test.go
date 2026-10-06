package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

type stubLyrics struct {
	lyrics, synced string
	instrumental   bool
	err            error
	calls          int
}

func (s *stubLyrics) Fetch(title, albumArtist string, length int) (string, string, bool, error) {
	s.calls++
	return s.lyrics, s.synced, s.instrumental, s.err
}

func TestSongLyricsCacheThenFetch(t *testing.T) {
	s := testStore(t)
	if err := s.InsertFile(Song{Path: "/m/s.mp3", Title: "T", Artists: "A", AlbumArtist: "AA", Album: "B", Length: 200}); err != nil {
		t.Fatal(err)
	}
	fetch := &stubLyrics{lyrics: "la", synced: "syn", instrumental: true}

	l, err := s.SongLyrics(fetch, "/m/s.mp3")
	if err != nil || l.Lyrics != "la" || l.Instrumental != 1 || fetch.calls != 1 {
		t.Fatalf("lyrics = %+v calls=%d err=%v", l, fetch.calls, err)
	}
	l, err = s.SongLyrics(fetch, "/m/s.mp3")
	if err != nil || l.SyncedLyrics != "syn" || fetch.calls != 1 {
		t.Fatalf("cached = %+v calls=%d err=%v", l, fetch.calls, err)
	}
}

func TestLrclibNullLyrics(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("track_name") != "T" {
			t.Errorf("track_name = %q", r.URL.Query().Get("track_name"))
		}
		w.Write([]byte(`{"plainLyrics":null,"syncedLyrics":"[00:01] hi","instrumental":false}`))
	}))
	defer srv.Close()
	lr := Lrclib{BaseURL: srv.URL, Client: srv.Client()}
	l, synced, instr, err := lr.Fetch("T", "AA", 200)
	if err != nil || l != "" || synced != "[00:01] hi" || instr {
		t.Fatalf("fetch = %q %q %v %v", l, synced, instr, err)
	}
}

func TestLrclibError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()
	lr := Lrclib{BaseURL: srv.URL, Client: srv.Client()}
	if _, _, _, err := lr.Fetch("T", "A", 1); err == nil {
		t.Fatal("expected error")
	}
}
