package music

import (
	"log"
	"runtime"
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
func sanitizeArtists(artists string) string {
	return strings.ReplaceAll(artists, "/", ", ")
}

func logCaller() {
	_, file, no, ok := runtime.Caller(2)
	if ok {
		log.Printf("called from %s#%d\n", file, no)
	}
}
