package main

import (
	"log"
	"net"
	"os"
	"os/signal"
	"slices"

	"github.com/raffleberry/yams/app"
	"github.com/raffleberry/yams/music"
	"github.com/raffleberry/yams/server"
)

func main() {
	sigint := make(chan os.Signal, 1)
	signal.Notify(sigint, os.Interrupt)

	log.Println("Started YAMS")

	ip := "127.0.0.1"
	port := 5550

	if app.C.Ip != "" {
		ip = app.C.Ip
	}

	if app.C.Port != 0 {
		port = app.C.Port
	}

	app := music.Api()
	s := server.New(ip, port, app)

	err := s.Start()
	if err != nil {
		panic(err)
	}

	if !slices.Contains([]string{"127.0.0.1", "localhost"}, ip) {
		log.Println("Listening on :")
		for _, ip := range getPrivateIps() {
			log.Printf("    http://%s:%d/\n", ip, port)
		}
	} else {
		log.Printf("Listening on: http://%s:%d/\n", ip, port)
	}

	<-sigint
	err = s.Stop()
	if err != nil {
		panic(err)
	}

	log.Println("Bye bye")
}

func getPrivateIps() []string {
	ips := make([]string, 0)
	ifaces, err := net.Interfaces()
	if err != nil {
		panic(err)
	}
	for _, i := range ifaces {
		addrs, err := i.Addrs()
		if err != nil {
			panic(err)
		}
		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip.To4() != nil && (ip.IsPrivate() || ip.IsLoopback()) {
				ips = append(ips, ip.String())
			}
		}
	}
	return ips
}
