package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const version = "0.3.0"

type Config struct {
	Dir      string `json:"-"`
	File     string `json:"-"`
	MusicDir string `json:"MusicDir"`
	Ip       string `json:"Ip"`
	Port     int    `json:"Port"`
}

func defaultConfig() Config {
	home, _ := os.UserHomeDir()
	return Config{
		MusicDir: filepath.Join(home, "Music"),
		Ip:       "127.0.0.1",
		Port:     5550,
	}
}

func loadConfig() Config {
	cfg := defaultConfig()

	d, err := os.UserConfigDir()
	if err != nil {
		panic(err)
	}

	cfg.Dir = filepath.Join(d, "yams")
	if err := os.MkdirAll(cfg.Dir, 0o755); err != nil {
		panic(err)
	}
	cfg.File = filepath.Join(cfg.Dir, "config.json")

	data, err := os.ReadFile(cfg.File)
	if err != nil {
		log.Printf("yams: no config file (%v), using defaults", err)
	} else if err := json.Unmarshal(data, &cfg); err != nil {
		log.Printf("yams: bad config file, using defaults: %v", err)
	}
	out, err := json.MarshalIndent(cfg, "", "    ")
	if err != nil {
		panic(err)
	}
	err = os.WriteFile(cfg.File, out, 0o644)
	if err != nil {
		panic(err)
	}
	return cfg
}

func normalizePrefix(raw string) string {
	p := strings.TrimSpace(raw)
	if p == "" {
		return ""
	}
	if !strings.HasPrefix(p, "/") {
		p = "/" + p
	}
	return strings.TrimRight(p, "/")
}

func main() {
	prefixFlag := flag.String("prefix", "", "serve behind a sub-path, e.g. -prefix=/yams (nginx location /yams/)")
	flag.Parse()
	prefix := normalizePrefix(*prefixFlag)

	cfg := loadConfig()
	store, err := OpenStore(cfg.Dir)
	if err != nil {
		log.Fatalf("yams: open store: %v", err)
	}
	defer store.Close()

	scanner := &Scanner{Store: store, MusicDir: cfg.MusicDir, Read: defaultRead}
	scanner.Start()

	srv := NewServer(store, scanner, Lrclib{
		BaseURL: "https://lrclib.net/api",
		Client:  &http.Client{Timeout: 15 * time.Second},
	}, prefix, func() string { return cfg.MusicDir })

	handler := http.StripPrefix(prefix, srv.Handler())

	addr := cfg.Ip + ":" + strconv.Itoa(cfg.Port)
	log.Printf("yams %s config=%+v prefix=%q", version, cfg, prefix)
	log.Printf("Yams - http://%s%s/", addr, prefix)
	log.Fatal(http.ListenAndServe(addr, handler))
}
