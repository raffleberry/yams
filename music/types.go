package music

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

type Music struct {
	// default
	Path       string
	Title      string
	Size       int
	Artists    string
	Album      string
	Genre      string
	Year       string
	Track      int
	Length     int
	Bitrate    int
	Samplerate int
	Channels   int

	// on demand
	Artwork []byte `json:"-"`
	Props   string
}

type History struct {
	Time time.Time
	Music
}

type File struct {
	Path    string
	Size    int
	IsDir   bool
	IsMedia bool
}

type LastScan struct {
	InDisk       int
	InDb         int
	MissingFiles int
	NewFiles     int
}

type Context struct {
	W http.ResponseWriter
	R *http.Request
}

// echo cope
func (c *Context) JSON(status int, data interface{}) error {
	c.W.Header().Set("Content-Type", "application/json")
	c.W.WriteHeader(status)
	return json.NewEncoder(c.W).Encode(data)
}

func (c *Context) File(filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		log.Printf("Error File Not Found: %v\n", err)
		return c.Error(http.StatusNotFound, "File not found")
	}
	defer file.Close()

	c.W.Header().Set("Content-Disposition", "attachment; filename="+file.Name())
	c.W.Header().Set("Content-Type", "application/octet-stream")
	http.ServeFile(c.W, c.R, filePath)
	return nil
}
func (c *Context) Error(status int, message string) error {
	http.Error(c.W, message, status)
	return nil
}

func WithCtx(handler func(*Context) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := &Context{W: w, R: r}
		if err := handler(ctx); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}
}
