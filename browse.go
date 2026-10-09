package main

import (
	"errors"
	"path/filepath"
	"sort"
	"strings"
)

var errOutsideLibrary = errors.New("path outside music directory")

// Folders lists the immediate sub-directories of `dir` (which is relative to
// the music directory; "" means the root), along with how many songs each
// holds directly. This powers the folder browser in the UI.
func (s *Store) Folders(musicDir, dir string) ([]Folder, error) {
	root := filepath.Clean(musicDir)
	target := root
	if dir != "" {
		target = filepath.Join(root, filepath.FromSlash(dir))
	}
	// Guard against traversal outside the music directory.
	if target != root && !strings.HasPrefix(target, root+string(filepath.Separator)) {
		return nil, errOutsideLibrary
	}

	rows, err := s.Local.Query(
		`SELECT Path FROM files WHERE Path GLOB ?;`, target+string(filepath.Separator)+"*")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Count songs per immediate child directory.
	counts := map[string]int{}
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, err
		}
		rel, err := filepath.Rel(target, p)
		if err != nil {
			continue
		}
		parts := strings.Split(filepath.ToSlash(rel), "/")
		if len(parts) < 2 {
			continue // a file sitting directly in `target`, not a subfolder
		}
		counts[parts[0]]++
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	out := make([]Folder, 0, len(counts))
	for name, n := range counts {
		child := name
		if dir != "" {
			child = strings.TrimSuffix(dir, "/") + "/" + name
		}
		parent := filepath.ToSlash(filepath.Dir(filepath.Join(target, name)))
		if parent == "." {
			parent = ""
		}
		out = append(out, Folder{Path: child, Name: name, Parent: parent, Songs: n})
	}
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})
	return out, nil
}

// Years returns every distinct year present in the library, newest first.
func (s *Store) Years(musicDir string) ([]string, error) {
	rows, err := s.Local.Query(
		`SELECT DISTINCT Year FROM files
		WHERE Path GLOB ? AND Year IS NOT NULL AND Year <> ''
		ORDER BY Year DESC;`, musicDir+"*")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var y string
		if err := rows.Scan(&y); err != nil {
			return nil, err
		}
		out = append(out, y)
	}
	return out, rows.Err()
}

// YearSongs returns every track released in the given year.
func (s *Store) YearSongs(musicDir, year string) ([]Song, error) {
	songs, err := s.querySongs(s.Local,
		`SELECT `+songCols+` FROM files
		WHERE Path GLOB ? AND Year=?
		GROUP BY Title, Artists, Album ORDER BY Album, COALESCE(Track,0);`,
		musicDir+"*", year)
	if err != nil {
		return nil, err
	}
	return s.withAux(songs)
}
