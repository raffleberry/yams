package web

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/raffleberry/yams/utils"
)

// port = 0, for a random port
//
// mux can be nil
//
// returns [<-ready], [<-done], [*http.Server]
func new(port int, mux http.Handler) (<-chan bool, <-chan bool, *http.Server) {

	ready := make(chan bool, 1)
	done := make(chan bool, 1)

	server := http.Server{
		Handler: mux,
	}

	go func() {
		defer close(ready)
		defer close(done)

		listener, err := net.Listen("tcp4", fmt.Sprintf("%s:%d", "0.0.0.0", port))
		utils.Panic(err)

		server.Addr = listener.Addr().String()

		ready <- true

		err = server.Serve(listener)

		if err != nil && err != http.ErrServerClosed {
			log.Println(err.Error())
		}
	}()

	return ready, done, &server
}

func Start(port int) {

	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Hello World")
	})

	sigint := make(chan os.Signal, 1)
	signal.Notify(sigint, os.Interrupt)

	ready, done, s := new(port, mux)
	<-ready

	log.Println("Server listening on - ")
	for _, ip := range getIps() {
		log.Printf("http://%v:%v\n", ip, port)
	}
	<-sigint

	ctx, cancel := context.WithDeadline(context.TODO(), time.Now().Add(time.Second*3))
	defer cancel()

	s.Shutdown(ctx)

	log.Println("Shutting down..")

	select {
	case <-done:
		log.Println("bye 👋")
	case <-ctx.Done():
		log.Println("shutdown request timedout..⏲️")
		log.Println("ok..🫣🤫")
	}

}
