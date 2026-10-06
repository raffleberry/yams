package main

import (
	"database/sql"
	"testing"
)

func testStore(t *testing.T) *Store {
	t.Helper()
	s, err := OpenStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(s.Close)
	return s
}

func seedSongs(t *testing.T, s *Store) {
	t.Helper()
	for _, m := range []Song{
		{Path: "/music/a.mp3", Size: 100, Title: "Alpha", Artists: "Alice", AlbumArtist: "Alice", Album: "First", Genre: "Rock", Year: "2020", Track: 1, Length: 180, Bitrate: 320, Samplerate: 44100, Channels: 2},
		{Path: "/music/b.flac", Size: 200, Title: "Beta", Artists: "Bob, Alice", AlbumArtist: "Bob", Album: "Second", Genre: "Pop", Year: "2021", Track: 2, Length: 200, Bitrate: 1411, Samplerate: 48000, Channels: 2, Artwork: []byte{9}},
	} {
		if err := s.InsertFile(m); err != nil {
			t.Fatal(err)
		}
	}
}

func TestStoreSongs(t *testing.T) {
	s := testStore(t)
	seedSongs(t, s)

	songs, err := s.RandomSongs("/music", 10)
	if err != nil || len(songs) != 2 {
		t.Fatalf("random = %v, %v", len(songs), err)
	}

	songs, err = s.SearchSongs("/music", "alp", 10, 0)
	if err != nil || len(songs) != 1 || songs[0].Title != "Alpha" {
		t.Fatalf("search = %+v, %v", songs, err)
	}
	songs, err = s.SearchSongs("/music", "zzz", 10, 0)
	if err != nil || len(songs) != 0 {
		t.Fatalf("search empty = %+v, %v", songs, err)
	}

	artists, err := s.Artists("/music")
	if err != nil || len(artists) != 2 {
		t.Fatalf("artists = %v, %v", artists, err)
	}

	got, err := s.ArtistSongs("/music", []string{"Bob"})
	if err != nil || len(got) != 1 || got[0].Title != "Beta" {
		t.Fatalf("artist songs = %+v, %v", got, err)
	}

	albums, err := s.Albums("/music", 10, 0)
	if err != nil || len(albums) != 2 {
		t.Fatalf("albums = %+v, %v", albums, err)
	}
	got, err = s.AlbumSongs("/music", "First")
	if err != nil || len(got) != 1 || got[0].Title != "Alpha" {
		t.Fatalf("album songs = %+v, %v", got, err)
	}

	art, err := s.Artwork("/music/b.flac")
	if err != nil || len(art) != 1 {
		t.Fatalf("artwork = %v, %v", art, err)
	}
	if art, err := s.Artwork("/music/nope.mp3"); err != nil || art != nil {
		t.Fatalf("artwork missing = %v, %v", art, err)
	}
}

func TestStoreHistoryAndFavourites(t *testing.T) {
	s := testStore(t)
	seedSongs(t, s)

	m := Song{Title: "Alpha", Artists: "Alice", Album: "First", Genre: "Rock", Year: "2020", Track: 1, Length: 180}
	if err := s.HistoryAdd(m); err != nil {
		t.Fatal(err)
	}
	h, err := s.History(10, 0)
	if err != nil || len(h) != 1 {
		t.Fatalf("history = %+v, %v", h, err)
	}
	if h[0].Path != "/music/a.mp3" || h[0].Time == "" {
		t.Fatalf("history enriched = %+v", h[0])
	}

	if err := s.FavouriteAdd(m); err != nil {
		t.Fatal(err)
	}
	favs, err := s.Favourites()
	if err != nil || len(favs) != 1 || !favs[0].IsFavourite || favs[0].Path != "/music/a.mp3" {
		t.Fatalf("favourites = %+v, %v", favs, err)
	}
	if favs[0].PlayCount != 1 {
		t.Fatalf("playcount = %d", favs[0].PlayCount)
	}
	if err := s.FavouriteDel(m); err != nil {
		t.Fatal(err)
	}
	if favs, _ := s.Favourites(); len(favs) != 0 {
		t.Fatalf("favourites after del = %+v", favs)
	}
}

func TestStorePlaylists(t *testing.T) {
	s := testStore(t)
	seedSongs(t, s)

	p := Playlist{Name: "mix", Description: "d", Type: "LIST"}
	if err := s.PlaylistCreate(&p); err != nil || p.Id == 0 {
		t.Fatalf("create = %+v, %v", p, err)
	}
	bad := Playlist{Name: "x", Type: "NOPE"}
	if err := s.PlaylistCreate(&bad); err == nil {
		t.Fatal("expected invalid type error")
	}

	m := Song{Title: "Alpha", Artists: "Alice", Album: "First"}
	if err := s.PlaylistAddSong(p.Id, m); err != nil {
		t.Fatal(err)
	}
	if err := s.PlaylistAddSong(9999, m); err != sql.ErrNoRows {
		t.Fatalf("add to missing = %v", err)
	}
	songs, err := s.PlaylistSongs(p.Id)
	if err != nil || len(songs) != 1 || songs[0].Path != "/music/a.mp3" {
		t.Fatalf("playlist songs = %+v, %v", songs, err)
	}
	if _, err := s.PlaylistSongs(9999); err != sql.ErrNoRows {
		t.Fatalf("missing playlist = %v", err)
	}

	lists, err := s.Playlists()
	if err != nil || len(lists) != 1 || lists[0].Count != 1 {
		t.Fatalf("playlists = %+v, %v", lists, err)
	}
	p.Name = "renamed"
	if err := s.PlaylistUpdate(&p); err != nil {
		t.Fatal(err)
	}

	if err := s.PlaylistDelSong(p.Id, m); err != nil {
		t.Fatal(err)
	}
	if songs, _ := s.PlaylistSongs(p.Id); len(songs) != 0 {
		t.Fatalf("after del = %+v", songs)
	}

	n, err := s.PlaylistDelete(p.Id)
	if err != nil || n != 0 {
		t.Fatalf("delete = %d, %v", n, err)
	}
	if _, err := s.PlaylistDelete(p.Id); err != sql.ErrNoRows {
		t.Fatalf("double delete = %v", err)
	}
}

func TestStoreLyricsCache(t *testing.T) {
	s := testStore(t)
	l := Lyrics{Title: "T", Artists: "A", Album: "B", Lyrics: "la", SyncedLyrics: "synced", Instrumental: 1}
	if _, ok, _ := s.LyricsGet("T", "A", "B"); ok {
		t.Fatal("expected cache miss")
	}
	if err := s.LyricsPut(l); err != nil {
		t.Fatal(err)
	}
	got, ok, err := s.LyricsGet("T", "A", "B")
	if err != nil || !ok || got.Lyrics != "la" || got.Instrumental != 1 {
		t.Fatalf("lyrics = %+v %v %v", got, ok, err)
	}
}
