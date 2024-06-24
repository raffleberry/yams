package store

import (
	"database/sql"
	"log"
	"os"

	"github.com/go-sql-driver/mysql"
	"github.com/raffleberry/yams/utils"
)

type database interface {
	Init() error
	Conn() *sql.DB
	GetMusicSources() ([]string, error)
}

var Db database

func init() {

	driver := os.Getenv("DRIVER")
	log.Printf("Using Driver - %s\n", driver)

	switch driver {
	case "mysql", "": // default
		cfg := mysql.Config{
			User:   os.Getenv("MYSQL_USER"),
			Passwd: os.Getenv("MYSQL_PASS"),
			Addr:   os.Getenv("MYSQL_ADDR"),
			DBName: os.Getenv("MYSQL_DB"),
			Net:    "tcp",
		}
		Db = &mySql{cfg: cfg}
	}

	err := Db.Init()

	utils.Panic(err)
}
