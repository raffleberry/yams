package media

import (
	"log"
	"os"
	"path/filepath"
)

// doesn't support symlinks
func ScanSongs(path string) {
	var infos []MediaInfo

	log.Printf("Scanning for songs on : %s\n", path)

	err := filepath.Walk(path,
		func(path string, info os.FileInfo, err error) error {
			if err != nil {
				log.Println("ERROR: ", path, err)
				return nil
			}
			if !info.IsDir() {
				info, err := GetMediaInfo(path)
				if err != nil {
					log.Println("ERROR: ", path, err)
					return nil
				}

				log.Println("SCANNED: ", info.Media.Ref)
				infos = append(infos, info)
			}
			return nil
		})

	if err != nil {
		log.Println("ERROR: ", path, err)
	}

	log.Printf("Updating Database with `%d` songs\n", len(infos))

}
