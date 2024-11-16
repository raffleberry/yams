package music

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"path/filepath"
	"strings"
	"time"

	"github.com/raffleberry/tags"
	"github.com/raffleberry/yams/app"
	"github.com/raffleberry/yams/db"
)

var isScanning = false

// TODO: add tbl for fts5
var dbTables = []string{
	`CREATE TABLE IF NOT EXISTS files (
		Path TEXT PRIMARY KEY,
		Size INTEGER,
		Title TEXT,
		Artists TEXT,
		Album TEXT,
		Comment TEXT,
		Genre TEXT,
		Year TEXT,
		Track INTEGER,
		Length INTEGER,
		Bitrate INTEGER,
		Samplerate INTEGER,
		Channels INTEGER,
		Artwork BLOB,
		Props TEXT
	);`,
	`CREATE TABLE IF NOT EXISTS scanned (
		Path TEXT PRIMARY KEY
	);`,
	`CREATE TABLE IF NOT EXISTS last_scan (
		Time DATETIME,
		Path TEXT PRIMARY KEY,
		InDisk INTEGER,
		InDb INTEGER,
		MissingFiles INTEGER,
		NewFiles INTEGER,
		Err TEXT
	);`,
	`CREATE TABLE IF NOT EXISTS history (
		Time DATETIME DEFAULT CURRENT_TIMESTAMP,
		Path TEXT,
		Size INTEGER,
		Title TEXT,
		Artists TEXT,
		Album TEXT,
		Genre TEXT,
		Year TEXT,
		Track INTEGER,
		Length INTEGER
	);`,
}

func scanned() bool {
	var scannedPaths []string
	q := `SELECT Path FROM scanned;`
	rows, err := db.L.Query(q)

	if err != nil {
		log.Printf("Err: failed to query `scanned` table %v\n", err)
		return false
	}
	defer rows.Close()
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			log.Printf("failed to get row: %v\n", err)
			continue
		}
		scannedPaths = append(scannedPaths, p)
	}
	if err := rows.Err(); err != nil {
		log.Printf("Err: failed to query `scanned` table %v\n", err)
		return false
	}
	for _, p := range scannedPaths {
		if strings.HasPrefix(app.RootDir, p) {
			log.Printf("Already scanned : `%s`\n", p)
			return true
		}
	}
	return false
}

func insertFileInfo(file File) error {
	meta, err := tags.Read(file.Path)
	if err != nil {
		return err
	}
	defer meta.Close()

	pic, err := meta.GetPicture()
	if err != nil && err != tags.ErrNoPictureFound {
		log.Printf("Err while getting picture: %v\n", err)
	}

	props := ""
	propsByte, err := json.Marshal(meta.Props)
	if err == nil {
		props = string(propsByte)
	}

	log.Println("inserting into db", file.Path)

	_, err = db.L.Exec(
		`INSERT OR REPLACE INTO
		files (Path, Title, Size, Artists,
				Album, Genre, Year, Track,
				Length, Bitrate, Samplerate, Channels,
				Artwork, Props)
		VALUES (?,?,?,?,
				?,?,?,?,
				?,?,?,?,
				?,?)`,
		file.Path, meta.Tag.Title, file.Size, meta.Tag.Artist,
		meta.Tag.Album, meta.Tag.Genre, meta.Tag.Year, meta.Tag.Track,
		meta.Audio.Length, meta.Audio.Bitrate, meta.Audio.Samplerate, meta.Audio.Channels,
		pic, props)
	return err
}

// files previously present in disk, but not anymore
func cleanDb(notInDir []string) []error {
	errs := []error{}
	for _, p := range notInDir {
		if strings.HasPrefix(p, app.RootDir) {
			_, err := db.L.Exec("DELETE FROM files WHERE Path = ?", p)
			if err != nil {
				errs = append(errs, err)
			}
		}
	}
	return errs
}

func insertLastScan(ls *LastScan, e error) {
	errStr := ""
	if e != nil {
		errStr = e.Error()
	}
	_, err := db.L.Exec("INSERT OR REPLACE INTO last_scan(Time, Path, InDisk, InDb, MissingFiles, NewFiles, Err) VALUES (?,?,?,?,?,?,?)", time.Now(), app.RootDir, ls.InDisk, ls.InDb, ls.MissingFiles, ls.NewFiles, errStr)
	if err != nil {
		log.Println(ls)
		log.Printf("failed to insert row into `last_scan`: %v\n", err)
	}
}

func scan() {
	log.Println("Started scanning")
	lastScan := &LastScan{}
	actuallyScan(lastScan)
	log.Println("Done scanning")
	d, _ := json.Marshal(lastScan)
	log.Println(string(d))
}

func actuallyScan(lastScan *LastScan) {
	isScanning = true
	var err error
	defer func() {
		isScanning = false
		insertLastScan(lastScan, err)
	}()
	inDb, err := scanDb()
	panicIfErr(err)
	lastScan.InDb = len(inDb)

	inDir, errs := scanDir()
	for _, e := range errs {
		log.Printf("Error while scanning Dir: %v\n", e)
	}

	lastScan.InDisk = len(inDir)

	notInDir := []string{}
	for k, _ := range inDb {
		if _, exists := inDir[k]; !exists {
			notInDir = append(notInDir, k)
		}
	}
	errs = cleanDb(notInDir)

	lastScan.MissingFiles = len(notInDir)

	newFileCnt := 0
	for k, v := range inDir {
		if _, exists := inDb[k]; !exists {
			newFileCnt += 1
			err := insertFileInfo(v)
			if err != nil {
				log.Printf("error while inserting fileinfo on db: %v\n", err)
			}
		}
	}

	lastScan.NewFiles = newFileCnt

	_, err = db.L.Exec("INSERT OR REPLACE INTO scanned(Path) VALUES (?)", app.RootDir)
	if err != nil {
		log.Println("failed to insert rootDir(path) into `scanned` table")
	}

	for _, e := range errs {
		log.Printf("Error while removing deleted files from db: %v\n", e)
	}
}

func scanDb() (map[string]bool, error) {
	files := make(map[string]bool)
	rows, err := db.L.Query("SELECT Path FROM files")
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve paths from database: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var path string
		if err := rows.Scan(&path); err != nil {
			return nil, fmt.Errorf("failed to scan path: %w", err)
		}
		files[path] = true
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return files, nil
}

func scanDir() (map[string]File, []error) {
	files := make(map[string]File)
	errs := []error{}
	filepath.WalkDir(app.RootDir, func(path string, entry fs.DirEntry, err error) error {
		if err == nil {
			if !entry.IsDir() && isMedia(entry.Name()) {
				stat, err := entry.Info()
				size := -1
				if err == nil {
					size = int(stat.Size())
				} else {
					log.Printf("Err: while getting file size %v\n", err)
				}
				fileInfo := File{
					Path:  path,
					IsDir: false,
					Size:  size,
				}
				files[path] = fileInfo
			}
		} else {
			errs = append(errs, err)
		}
		return nil
	})
	return files, errs
}

func panicIfErr(err error) {
	if err != nil {
		panic(err)
	}
}
