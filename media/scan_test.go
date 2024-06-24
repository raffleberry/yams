package media_test

import (
	"testing"

	"github.com/raffleberry/taglib"
	"github.com/raffleberry/yams/media"
)

func TestScanSongs(t *testing.T) {
	errs := media.ScanSongs("/home/user/Music/yearwise-playlist/2023")
	for _, err := range errs {
		if err != taglib.ErrInvalid {
			t.Fatal(err)
		}
	}
}
