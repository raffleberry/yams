package test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/raffleberry/yams/media"
)

func TestGetMediaInfo(t *testing.T) {
	srcDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}

	info, err := media.GetMediaInfo(filepath.Join(srcDir, "sample.m4a"))
	if err != nil {
		t.Fatal(err)
	}

	if info.Media.Ref == "" ||
		len(info.Media.Track) < 1 ||
		info.Media.Track[0].Type != "General" ||
		info.Media.Track[0].Title != "Talk Slow" {

		t.Fatal(info)

	}
}
