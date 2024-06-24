package media

import (
	"log"
	"os"
	"path/filepath"
)

// doesn't support symlinks
func ScanSongs(path string) []error {
	var errs []error
	err := filepath.Walk(path,
		func(path string, info os.FileInfo, err error) error {
			if err != nil {
				errs = append(errs, err)
				return nil
			}
			if !info.IsDir() {
				info, err := GetInfo(path)
				if err != nil {
					errs = append(errs, err)
					return nil
				}

				log.Println(info)

				if err != nil {
					errs = append(errs, err)
					return nil
				}
			}
			return nil
		})
	if err != nil {
		errs = append(errs, err)
	}
	return errs
}
