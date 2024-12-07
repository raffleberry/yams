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
	MusicDir string
	Ip       string
	Port     int
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

	err = os.MkdirAll(ConfigDir, 0755)
	if err != nil {
		return err
	}

	_, err = os.Stat(ConfigFile)
	if err != nil {
		var emptyConfig Config
		err = writeConfig(emptyConfig)
		if err != nil {
			return err
		}
	} else {
		C, err = readConfig()
		if err != nil {
			return err
		}
		err = writeConfig(C) // update with new fields(if any)
		if err != nil {
			return err
		}
	}

	RootDir = filepath.Join(h, "Music")

	if C.MusicDir != "" {
		RootDir = C.MusicDir
	}

	if _, err = os.Stat(RootDir); err != nil {
		panic(err)
	}

	return nil
}

func readConfig() (Config, error) {
	var c Config
	cByte, err := os.ReadFile(ConfigFile)
	if err != nil {
		return c, err
	}

	err = json.Unmarshal(cByte, &c)
	if err != nil {
		return c, err
	}

	return c, nil
}

func writeConfig(c Config) error {
	cByte, err := json.MarshalIndent(c, "", "    ")
	if err != nil {
		return err
	}
	return os.WriteFile(ConfigFile, cByte, 0644)
}

func init() {
	err := setup()
	if err != nil {
		log.Fatal(err)
	}
}
