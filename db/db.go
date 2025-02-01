package db

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
	"github.com/raffleberry/yams/app"
)

// Data thats not so important
var L *sql.DB

// Super Important data, your history, playlists, etc
var R *sql.DB
var err error

func init() {
	L, err = sql.Open("sqlite3", app.LocalDbPath)
	if err != nil {
		log.Fatal(err)
	}

	err = initRemote()
	if err != nil {
		log.Fatal(err)
	}

}
