package media

import (
	"encoding/json"
	"fmt"
	"log"
	"os/exec"
	"runtime"
	"strconv"

	"github.com/raffleberry/yams/utils"
)

var (
	ErrNotMedia = fmt.Errorf("not a media file")
)

var MediaInfoBin string

func init() {
	mediaInfoBin := "mediainfo"
	if runtime.GOOS == "windows" {
		mediaInfoBin += ".exe"
	}

	mediaInfoPath, err := exec.LookPath(mediaInfoBin)
	utils.Panic(err)

	MediaInfoBin = mediaInfoPath
}

func hasAudio(m MediaInfo) bool {
	for _, t := range m.Media.Track {
		if t.Type == "General" {
			n, err := strconv.Atoi(t.AudioCount)
			if err == nil && n > 0 {
				return true
			}
		}
	}

	return false
}

func GetMediaInfo(filePath string) (MediaInfo, error) {
	var info MediaInfo
	args := []string{"--Output=JSON", filePath}
	cmd := exec.Command(MediaInfoBin, args...)
	stdout, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("ERR - Failed to get mediainfo on - %v - error - %v - STDOUT:\n%s\n", filePath, err, stdout)
		return info, err
	}
	err = json.Unmarshal(stdout, &info)

	if err != nil {
		return info, err
	}

	if !hasAudio(info) {
		return info, ErrNotMedia
	}

	return info, err

}
