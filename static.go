package main

import (
	"bytes"
	"embed"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"
	"time"
)

// uiFS holds the Vite build output (ui/dist) plus the static icons.
//
//go:embed all:ui/dist
var uiFS embed.FS

const (
	// The SPA shell must be revalidated so a new deploy is picked up at once.
	indexCacheControl = "no-cache, must-revalidate"
	// Vite fingerprints asset filenames, so they are safe to pin.
	assetCacheControl = "public, max-age=31536000, immutable"
	// Audio and artwork are content-stable for a given path, so cache them
	// for a day. This is what makes slow-network playback start instantly on
	// repeat listens instead of re-downloading.
	mediaCacheControl = "public, max-age=86400"
)

// buildTime is the zero time on purpose: assets are fingerprinted, so caching
// is driven by Cache-Control rather than Last-Modified revalidation.
var buildTime = time.Time{}

type staticHandler struct {
	fsys   fs.FS
	prefix string
}

func newStaticHandler(prefix string) (staticHandler, error) {
	sub, err := fs.Sub(uiFS, "ui/dist")
	if err != nil {
		return staticHandler{}, err
	}
	return staticHandler{fsys: sub, prefix: prefix}, nil
}

// ServeHTTP implements http.Handler.
func (s staticHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.serve(w, r)
}

// serve handles every non-API request. Known files are served with their
// cache policy; anything else falls back to index.html so client-side routes
// survive a hard refresh.
func (s staticHandler) serve(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
	if name == "" || name == "." {
		s.serveIndex(w, r)
		return
	}

	data, err := fs.ReadFile(s.fsys, name)
	if err != nil || !fs.ValidPath(name) {
		s.serveIndex(w, r)
		return
	}
	if info, err := fs.Stat(s.fsys, name); err == nil && info.IsDir() {
		s.serveIndex(w, r)
		return
	}

	w.Header().Set("Cache-Control", assetCacheControl)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeContent(w, r, name, buildTime, bytes.NewReader(data))
}

func (s staticHandler) serveIndex(w http.ResponseWriter, r *http.Request) {
	data, err := fs.ReadFile(s.fsys, "index.html")
	if err != nil {
		http.Error(w, "ui: index.html missing from binary", http.StatusInternalServerError)
		return
	}
	body := data
	// Rewrite <base href> so relative asset URLs resolve under the prefix.
	if s.prefix != "" {
		body = bytes.ReplaceAll(
			body,
			[]byte(`<base href="/"`),
			[]byte(`<base href="`+s.prefix+`/"`),
		)
	}
	w.Header().Set("Cache-Control", indexCacheControl)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeContent(w, r, "index.html", buildTime, bytes.NewReader(body))
}

// init registers content types for Vite's output. Go's built-in table covers
// most of these, but a minimal system mime.types can leave .woff2 unset,
// which breaks font loading.
func init() {
	for ext, typ := range map[string]string{
		".js":          "text/javascript; charset=utf-8",
		".mjs":         "text/javascript; charset=utf-8",
		".css":         "text/css; charset=utf-8",
		".html":        "text/html; charset=utf-8",
		".json":        "application/json",
		".svg":         "image/svg+xml",
		".webmanifest": "application/manifest+json",
	} {
		_ = mime.AddExtensionType(ext, typ)
	}
}
