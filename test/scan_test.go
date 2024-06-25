package test

import (
	"testing"

	"github.com/raffleberry/yams/media"
)

func TestScanSongs(t *testing.T) {
	media.ScanSongs("/home/user/Music/yearwise-playlist/2023")
	t.Log("You tell me, does it pass?\n")
}
