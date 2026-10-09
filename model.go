package main

type Song struct {
	Path        string `json:"Path"`
	Title       string `json:"Title"`
	Size        int64  `json:"Size"`
	Artists     string `json:"Artists"`
	AlbumArtist string `json:"AlbumArtist"`
	Album       string `json:"Album"`
	Genre       string `json:"Genre"`
	Year        string `json:"Year"`
	Track       int    `json:"Track"`
	Length      int    `json:"Length"`
	Bitrate     int    `json:"Bitrate"`
	Samplerate  int    `json:"Samplerate"`
	Channels    int    `json:"Channels"`
	Lyrics      string `json:"Lyrics"`
	Comment     string `json:"Comment"`

	IsFavourite bool `json:"IsFavourite"`
	PlayCount   int  `json:"PlayCount"`

	Artwork []byte `json:"-"`
}

type History struct {
	Song
	Time string `json:"Time"`
}

type Playlist struct {
	Name        string `json:"Name"`
	Type        string `json:"Type"`
	Id          int64  `json:"Id"`
	Description string `json:"Description"`
	Query       string `json:"Query"`
	Count       int64  `json:"Count"`
}

type Lyrics struct {
	Title        string `json:"Title"`
	Artists      string `json:"Artists"`
	Album        string `json:"Album"`
	Lyrics       string `json:"Lyrics"`
	SyncedLyrics string `json:"SyncedLyrics"`
	Instrumental int    `json:"Instrumental"`
}

type Album struct {
	Path        string `json:"Path"`
	Album       string `json:"Album"`
	AlbumArtist string `json:"AlbumArtist"`
	Year        string `json:"Year"`
	Songs       int    `json:"Songs"`
}

// Folder is one entry in the folder browser.
type Folder struct {
	Path   string `json:"Path"`
	Name   string `json:"Name"`
	Parent string `json:"Parent"`
	Songs  int    `json:"Songs"`
}

type Page struct {
	Data any `json:"Data"`
	Next int `json:"Next"`
}
