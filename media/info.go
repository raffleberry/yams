package media

import (
	"time"

	"github.com/raffleberry/taglib"
)

type Info struct {
	Title   string
	Artist  string
	Track   int
	Album   string
	Length  time.Duration
	Year    int
	Genre   string
	Comment string
	Bitrate int
}

func GetInfo(filePath string) (Info, error) {
	var info Info
	t, err := taglib.Read(filePath)

	if err != nil {
		return info, err
	}
	defer t.Close()

	info.Title = t.Title()
	info.Artist = t.Artist()
	info.Track = t.Track()
	info.Album = t.Album()
	info.Length = t.Length()
	info.Year = t.Year()
	info.Genre = t.Genre()
	info.Comment = t.Comment()
	info.Bitrate = t.Bitrate()

	return info, nil
}
