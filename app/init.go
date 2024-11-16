package app

import (
	"log"
	"os"
	"path/filepath"
)

var (
	ConfigDir   string
	LocalDbPath string
	C           Config
	RootDir     string
)

type Config struct {
	RemoteDb struct {
		CaCert     string
		ClientCert string
		ClientKey  string
		Addr       string
		Name       string
		User       string
		Pass       string
	}
}

func setup() error {
	h, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	ConfigDir = filepath.Join(h, ".yams")

	LocalDbPath = filepath.Join(ConfigDir, "yams.sqlite")

	RootDir = filepath.Join(h, "Music")

	err = os.MkdirAll(ConfigDir, 0755)
	if err != nil {
		return err
	}
	return nil
}

func init() {
	err := setup()
	if err != nil {
		log.Fatal(err)
	}
}
