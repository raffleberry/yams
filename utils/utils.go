package utils

import (
	"log"
	"os"
	"path/filepath"
)

var AppDir string

var DEV bool

func init() {
	DEV = len(os.Getenv("DEV")) > 0
	var err error
	AppDir, err = os.Executable()
	Panic(err)

	AppDir = filepath.Dir(AppDir)
	if DEV {
		log.Println("***RUNNING AS DEV***")
		AppDir, err = os.Getwd()
		Panic(err)
	}
}

func Panic(err error) {
	if err != nil {
		panic(err)
	}
}
