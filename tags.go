package main

import (
	"os"
	"strconv"
	"strings"

	"github.com/raffleberry/tags"
	"github.com/raffleberry/tags/tag"
)

func ReadSong(path string) (Song, error) {
	f, err := tags.Open(path)
	if err != nil {
		return Song{}, err
	}
	var size int64
	if st, err := os.Stat(path); err == nil {
		size = st.Size()
	}
	return songFromFile(f, path, size), nil
}

func songFromFile(f tags.File, path string, size int64) Song {
	t := f.Tags()
	a := f.Audio()
	s := Song{
		Path:        path,
		Size:        size,
		Title:       t.Value(tag.Title),
		Artists:     strings.ReplaceAll(strings.Join(t.Values(tag.Artist), ", "), "/", ", "),
		AlbumArtist: t.Value(tag.AlbumArtist),
		Album:       t.Value(tag.Album),
		Genre:       strings.Join(t.Values(tag.Genre), ", "),
		Year:        yearOf(t),
		Track:       trackOf(t),
		Length:      int(a.Duration.Seconds()),
		Bitrate:     a.Bitrate / 1000,
		Samplerate:  a.SampleRate,
		Channels:    a.Channels,
		Lyrics:      t.Value(tag.Lyrics),
		Comment:     t.Value(tag.Comment),
	}
	if pics := f.Pictures(); len(pics) > 0 {
		s.Artwork = pics[0].Data
	}
	return s
}

func yearOf(t tag.Tag) string {
	y := t.Value(tag.Date)
	if y == "" {
		y = t.Value(tag.Year)
	}
	if len(y) > 4 {
		y = y[:4]
	}
	return y
}

func trackOf(t tag.Tag) int {
	v := t.Value(tag.Track)
	if i, err := strconv.Atoi(strings.TrimSpace(v)); err == nil {
		return i
	}
	return 0
}
