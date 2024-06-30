package media

import (
	"log"
	"os"
	"path/filepath"
	"sync"

	"github.com/raffleberry/tags"
	"github.com/raffleberry/yams/utils"
)

// doesn't support symlinks
func ScanLocalSongs(path string) []LocalTrack {
	var songs []LocalTrack

	log.Printf("Scanning for songs on : %s\n", path)

	var wg sync.WaitGroup

	err := filepath.Walk(path,
		func(path string, f os.FileInfo, err error) error {
			if err != nil {
				log.Println("ERROR: ", path, err)
				return nil
			}
			if !f.IsDir() {
				wg.Add(1)
				go func() {
					defer wg.Done()

					info, err := tags.Read(path)
					if err != nil {
						log.Println("ERROR: ", path, err)
						return
					}
					defer info.Close()

					songs = append(songs, LocalTrack{
						Path:    path,
						Name:    info.Tag.Title,
						Artists: utils.SplitStrip(info.Tag.Artist, ","),
						Album:   info.Tag.Album,
						Length:  info.Audio.Length,
					})
					log.Printf("SCANNED: %s ::: %s - %s", f.Name(), info.Tag.Artist, info.Tag.Title)
				}()

			}
			return nil
		})

	if err != nil {
		log.Println("ERROR: ", path, err)
	}
	wg.Wait()

	log.Printf("Updating Database with `%d` songs\n", len(songs))

	return songs
}
