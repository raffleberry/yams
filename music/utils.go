package music

import (
	"strings"
)

func isMedia(fname string) bool {
	fname = strings.ToLower(fname)
	exts := []string{"mp4", "mkv", "mp3", "m4a", "flac"}
	for _, ext := range exts {
		yes := strings.HasSuffix(fname, ext)
		if yes {
			return true
		}
	}
	return false
}

func isMusic(fname string) bool {
	fname = strings.ToLower(fname)
	exts := []string{"mp3", "m4a", "flac"}
	for _, ext := range exts {
		yes := strings.HasSuffix(fname, ext)
		if yes {
			return true
		}
	}
	return false
}
