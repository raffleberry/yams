package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestScannerAddsAndCleans(t *testing.T) {
	music := t.TempDir()
	a := filepath.Join(music, "a.mp3")
	b := filepath.Join(music, "sub", "b.flac")
	if err := os.MkdirAll(filepath.Join(music, "sub"), 0o755); err != nil {
		t.Fatal(err)
	}
	for _, p := range []string{a, b} {
		if err := os.WriteFile(p, []byte("x"), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	s := testStore(t)
	sc := &Scanner{Store: s, MusicDir: music, Read: func(path string) (Song, error) {
		return Song{Path: path, Title: filepath.Base(path), Artists: "A", Album: "B"}, nil
	}}

	got := sc.Scan()
	if got.InDisk != 2 || got.NewFiles != 2 {
		t.Fatalf("scan = %+v", got)
	}
	songs, err := s.RandomSongs(music, 10)
	if err != nil || len(songs) != 2 {
		t.Fatalf("songs = %d, %v", len(songs), err)
	}

	if err := os.Remove(a); err != nil {
		t.Fatal(err)
	}
	got = sc.Scan()
	if got.MissingFiles != 1 {
		t.Fatalf("rescan = %+v", got)
	}
	songs, err = s.RandomSongs(music, 10)
	if err != nil || len(songs) != 1 {
		t.Fatalf("songs after clean = %d, %v", len(songs), err)
	}
}

func TestScannerSkipsUnreadable(t *testing.T) {
	music := t.TempDir()
	if err := os.WriteFile(filepath.Join(music, "bad.mp3"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(music, "note.txt"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	s := testStore(t)
	sc := &Scanner{Store: s, MusicDir: music, Read: func(path string) (Song, error) {
		return Song{}, os.ErrNotExist
	}}
	got := sc.Scan()
	if got.NewFiles != 1 || got.Err != "" {
		t.Fatalf("scan = %+v", got)
	}
	songs, err := s.RandomSongs(music, 10)
	if err != nil || len(songs) != 0 {
		t.Fatalf("songs = %d, %v", len(songs), err)
	}
}

func TestScannerMissingDir(t *testing.T) {
	s := testStore(t)
	sc := &Scanner{Store: s, MusicDir: filepath.Join(t.TempDir(), "nope"), Read: defaultRead}
	if got := sc.Scan(); got.Err == "" {
		t.Fatalf("expected error, got %+v", got)
	}
}
