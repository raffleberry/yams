package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
)

type LyricsFetcher interface {
	Fetch(title, albumArtist string, length int) (lyrics, synced string, instrumental bool, err error)
}

type Lrclib struct {
	BaseURL string
	Client  *http.Client
}

func (l Lrclib) Fetch(title, albumArtist string, length int) (string, string, bool, error) {
	q := url.Values{}
	q.Set("track_name", title)
	q.Set("artist_name", albumArtist)
	q.Set("duration", strconv.Itoa(length))
	res, err := l.Client.Get(l.BaseURL + "/get?" + q.Encode())
	if err != nil {
		return "", "", false, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return "", "", false, fmt.Errorf("lyrics api error: %d", res.StatusCode)
	}
	var body struct {
		Plain        *string `json:"plainLyrics"`
		Synced       *string `json:"syncedLyrics"`
		Instrumental bool    `json:"instrumental"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		return "", "", false, err
	}
	lyrics, synced := "", ""
	if body.Plain != nil {
		lyrics = *body.Plain
	}
	if body.Synced != nil {
		synced = *body.Synced
	}
	return lyrics, synced, body.Instrumental, nil
}

func (s *Store) SongLyrics(fetch LyricsFetcher, path string) (Lyrics, error) {
	title, artists, albumArtist, album, length, ok, err := s.FileMeta(path)
	if err != nil {
		return Lyrics{}, err
	}
	if !ok {
		return Lyrics{}, sql.ErrNoRows
	}
	if l, hit, err := s.LyricsGet(title, artists, album); err != nil || hit {
		return l, err
	}
	lyrics, synced, instrumental, err := fetch.Fetch(title, albumArtist, length)
	if err != nil {
		return Lyrics{}, err
	}
	l := Lyrics{Title: title, Artists: artists, Album: album,
		Lyrics: lyrics, SyncedLyrics: synced}
	if instrumental {
		l.Instrumental = 1
	}
	if err := s.LyricsPut(l); err != nil {
		return Lyrics{}, err
	}
	return l, nil
}
