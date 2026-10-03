package main

import (
	"testing"
	"time"

	"github.com/raffleberry/tags/tag"
)

type fakeFile struct {
	tags     tag.Tag
	audio    tag.Audio
	pictures []tag.Picture
}

func (f fakeFile) Format() tag.Format      { return tag.MP3 }
func (f fakeFile) Tags() tag.Tag           { return f.tags }
func (f fakeFile) Audio() tag.Audio        { return f.audio }
func (f fakeFile) Pictures() []tag.Picture { return f.pictures }

func TestSongFromFile(t *testing.T) {
	f := fakeFile{
		tags: tag.Tag{
			"title":       {"Song Title"},
			"artist":      {"Artist A", "Artist B"},
			"albumartist": {"Album Artist"},
			"album":       {"Album"},
			"genre":       {"Rock", "Pop"},
			"date":        {"2024-05-01"},
			"track":       {"3"},
			"lyrics":      {"la la"},
			"comment":     {"a comment"},
		},
		audio: tag.Audio{
			Duration:   200 * time.Second,
			Bitrate:    320000,
			SampleRate: 44100,
			Channels:   2,
		},
		pictures: []tag.Picture{{MIME: "image/jpeg", Data: []byte{1, 2, 3}}},
	}
	s := songFromFile(f, "/music/song.mp3", 1024)
	if s.Title != "Song Title" {
		t.Errorf("Title = %q", s.Title)
	}
	if s.Artists != "Artist A, Artist B" {
		t.Errorf("Artists = %q", s.Artists)
	}
	if s.Genre != "Rock, Pop" {
		t.Errorf("Genre = %q", s.Genre)
	}
	if s.Year != "2024" {
		t.Errorf("Year = %q", s.Year)
	}
	if s.Track != 3 {
		t.Errorf("Track = %d", s.Track)
	}
	if s.Length != 200 || s.Bitrate != 320 || s.Samplerate != 44100 || s.Channels != 2 {
		t.Errorf("audio = %+v", s)
	}
	if len(s.Artwork) != 3 {
		t.Errorf("Artwork = %v", s.Artwork)
	}
	if s.Lyrics != "la la" || s.Comment != "a comment" {
		t.Errorf("lyrics/comment = %q %q", s.Lyrics, s.Comment)
	}
	if s.Path != "/music/song.mp3" || s.Size != 1024 {
		t.Errorf("path/size = %q %d", s.Path, s.Size)
	}
}

func TestSongFromFileYearFallback(t *testing.T) {
	f := fakeFile{tags: tag.Tag{"year": {"1999"}}}
	if s := songFromFile(f, "x", 0); s.Year != "1999" {
		t.Errorf("Year = %q", s.Year)
	}
	f = fakeFile{tags: tag.Tag{"track": {"nonsense"}}}
	if s := songFromFile(f, "x", 0); s.Track != 0 {
		t.Errorf("Track = %d", s.Track)
	}
	f = fakeFile{tags: tag.Tag{"artist": {"A/B"}}}
	if s := songFromFile(f, "x", 0); s.Artists != "A, B" {
		t.Errorf("Artists = %q", s.Artists)
	}
}

func TestReadSongRejectsNonAudio(t *testing.T) {
	f, err := ReadSong("go.mod")
	if err == nil {
		_ = f
		t.Fatal("expected error for non-audio file")
	}
}
