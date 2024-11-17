package music

import (
	"time"
)

type Music struct {
	// default
	Path       string
	Title      string
	Size       int
	Artists    string
	Album      string
	Genre      string
	Year       string
	Track      int
	Length     int
	Bitrate    int
	Samplerate int
	Channels   int

	// on demand
	Artwork []byte `json:"-"`
	Props   string
}

type History struct {
	Time time.Time
	Music
}

type File struct {
	Path    string
	Size    int
	IsDir   bool
	IsMedia bool
}

type LastScan struct {
	InDisk       int
	InDb         int
	MissingFiles int
	NewFiles     int
}
