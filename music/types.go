package music

import (
	"log"
	"time"

	"github.com/raffleberry/yams/db"
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

	// auxilary
	IsFavourite bool

	// on demand
	Artwork []byte `json:"-"`
	Props   string
}

func (m *Music) addAux() {
	var count int
	row := db.R.QueryRow("SELECT COUNT(*) FROM favourites WHERE Title=? AND Artists=? AND Album=?;", m.Title, m.Artists, m.Album)
	err := row.Scan(&count)
	if err != nil {
		logCaller()
		log.Println("ERR : failed to add auxilary fields", err)
	}
	m.IsFavourite = count > 0
}

func (m *Music) addMeta() {
	row := db.L.QueryRow(`SELECT 
			Path, Title, Size,
			Artists, Album, Genre,
			Year, Track, Length,
			Bitrate, Samplerate, Channels
		FROM files
		WHERE
			Title=? and Artists=? and Album=? limit 1;`,
		m.Title, m.Artists, m.Album,
	)

	err := row.Scan(
		&m.Path, &m.Title, &m.Size,
		&m.Artists, &m.Album, &m.Genre,
		&m.Year, &m.Track, &m.Length,
		&m.Bitrate, &m.Samplerate, &m.Channels,
	)
	if err != nil {
		logCaller()
		log.Println("ERR: ", err)
	}
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

type Playlist struct {
	Id          int
	Name        string
	Description string
	Type        string
	Query       string
	Count       int
}

type Album struct {
}

type Artist struct {
}
