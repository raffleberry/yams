package db

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
	"github.com/raffleberry/yams/app"
)

var L, R *sql.DB
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
