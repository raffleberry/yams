package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestConfigUsesLegacyDir(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if got := configDir(); got != filepath.Join(home, ".yams") {
		t.Fatalf("configDir = %q", got)
	}
}

func TestLoadConfigRoundTrip(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if err := os.MkdirAll(filepath.Join(home, ".yams"), 0o755); err != nil {
		t.Fatal(err)
	}
	custom := `{"MusicDir": "/tmp/music", "Ip": "0.0.0.0", "Port": 5551}`
	if err := os.WriteFile(filepath.Join(home, ".yams", "config.json"), []byte(custom), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg := loadConfig()
	if cfg.Port != 5551 || cfg.Ip != "0.0.0.0" || cfg.MusicDir != "/tmp/music" {
		t.Fatalf("config = %+v", cfg)
	}
}

func TestNormalizePrefix(t *testing.T) {
	for in, want := range map[string]string{
		"":       "",
		"/":      "",
		"yams":   "/yams",
		"/yams":  "/yams",
		"/yams/": "/yams",
	} {
		if got := normalizePrefix(in); got != want {
			t.Errorf("normalizePrefix(%q) = %q, want %q", in, got, want)
		}
	}
}
