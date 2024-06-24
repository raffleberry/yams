package media

import (
	"log"
	"os/exec"
	"runtime"
)

var MediaInfoBin string

func init() {
	mediaInfoBin := "mediainfo"
	if runtime.GOOS == "windows" {
		mediaInfoBin += ".exe"
	}

	mediaInfoPath, err := exec.LookPath(mediaInfoBin)
	if err != nil {
		log.Println("Mediainfo not found on path")
	}
	// utils.Panic(err)

	MediaInfoBin = mediaInfoPath
}
