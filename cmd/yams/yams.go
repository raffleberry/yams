package main

import (
	"log"

	"github.com/raffleberry/yams/store"
	"github.com/raffleberry/yams/web"
)

func main() {
	log.SetFlags(log.Lshortfile | log.LstdFlags)
	log.Println("Hello World")
	store.Db.Init()
	web.Start(8000)
}
