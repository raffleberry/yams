package main

import (
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
)

type Scanner struct {
	Store    *Store
	MusicDir string
	Read     func(path string) (Song, error)

	scanning atomic.Bool
}

func (sc *Scanner) Scanning() bool {
	return sc.scanning.Load()
}

func (sc *Scanner) Start() bool {
	if !sc.scanning.CompareAndSwap(false, true) {
		return false
	}
	go func() {
		defer sc.scanning.Store(false)
		sc.Scan()
	}()
	return true
}

func (sc *Scanner) Scan() LastScan {
	out := LastScan{}
	defer func() {
		if err := sc.Store.InsertLastScan(sc.MusicDir, out); err != nil {
			log.Printf("yams: last_scan: %v", err)
		}
	}()
	inDb, err := sc.Store.FilePaths(sc.MusicDir)
	if err != nil {
		out.Err = err.Error()
		return out
	}
	inDisk, err := scanDisk(sc.MusicDir)
	if err != nil {
		out.Err = err.Error()
		return out
	}
	out.InDisk, out.InDb = len(inDisk), len(inDb)
	var missing, fresh []string
	for p := range inDb {
		if !inDisk[p] {
			missing = append(missing, p)
		}
	}
	for p := range inDisk {
		if !inDb[p] {
			fresh = append(fresh, p)
		}
	}
	out.MissingFiles, out.NewFiles = len(missing), len(fresh)
	log.Printf("yams: scan found %d new files", len(fresh))
	failed := 0
	for _, p := range fresh {
		m, err := sc.Read(p)
		if err != nil {
			log.Printf("yams: scan %s: %v", p, err)
			failed++
			continue
		}
		if err := sc.Store.InsertFile(m); err != nil {
			log.Printf("yams: scan %s: %v", p, err)
			failed++
		}
	}
	for _, p := range missing {
		if err := sc.Store.DeleteFile(p); err != nil {
			log.Printf("yams: scan %s: %v", p, err)
		}
	}
	log.Printf("yams: scan added %d files, cleaned %d", len(fresh)-failed, len(missing))
	return out
}

func walk(dir string, out map[string]bool) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}

	for _, d := range entries {
		p := filepath.Join(dir, d.Name())

		if d.IsDir() {
			// Recurse into the subdirectory
			if err := walk(p, out); err != nil {
				return err
			}
			continue
		}

		if isMedia(d.Name()) {
			out[p] = true
		}
	}
	return nil
}

func scanDisk(dir string) (map[string]bool, error) {
	out := map[string]bool{}
	err := walk(dir, out)
	return out, err
}

func isMedia(name string) bool {
	name = strings.ToLower(name)
	for _, ext := range []string{".mp3", ".m4a", ".flac"} {
		if strings.HasSuffix(name, ext) {
			return true
		}
	}
	return false
}

func defaultRead(path string) (Song, error) {
	if _, err := os.Stat(path); err != nil {
		return Song{}, err
	}
	return ReadSong(path)
}
