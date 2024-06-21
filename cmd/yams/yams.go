package main

import (
	"log"

	"github.com/raffleberry/yams/utils"
	"github.com/raffleberry/yams/web"
)

func main() {
	log.SetFlags(log.Lshortfile | log.LstdFlags)
	log.Println("Hello World")
	log.Println(utils.AppDir)
	web.Start(8000)
}
