package app

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
)

var (
	ConfigDir   string
	ConfigFile  string
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

	ConfigFile = filepath.Join(ConfigDir, "config.json")

	LocalDbPath = filepath.Join(ConfigDir, "yams.sqlite")

	RootDir = filepath.Join(h, "Music")

	err = os.MkdirAll(ConfigDir, 0755)
	if err != nil {
		return err
	}

	_, err = os.Stat(ConfigFile)
	if err != nil {
		log.Println("ConfigFile not found, generating a sample on: ", ConfigFile)

		var c Config
		cByte, err := json.MarshalIndent(c, "", "    ")
		if err != nil {
			return err
		}
		return os.WriteFile(ConfigFile, cByte, 0644)
	}

	return nil
}

func init() {
	err := setup()
	if err != nil {
		log.Fatal(err)
	}
}
