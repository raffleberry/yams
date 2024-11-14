package server

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"time"
)

const StopTimeout = 5 * time.Second

type Server struct {
	server http.Server

	ready chan bool
	done  chan bool

	ip   string
	port int
	mux  http.Handler
}

func New(ip string, port int, mux http.Handler) *Server {
	s := &Server{
		ip:   ip,
		port: port,
		mux:  mux,
	}

	s.ready = make(chan bool, 1)
	s.done = make(chan bool, 1)
	s.server = http.Server{Handler: mux}

	return s
}

func (s *Server) Start() error {
	listener, err := net.Listen("tcp4", fmt.Sprintf("%s:%d", s.ip, s.port))
	if err != nil {
		return err
	}

	go func() {
		defer close(s.ready)
		defer close(s.done)

		s.ready <- true

		err = s.server.Serve(listener)

		if err != nil && err != http.ErrServerClosed {
			log.Println("Error starting server: ", err.Error())
		}
	}()

	<-s.ready

	return nil
}

func (s *Server) StopWithCtx(ctx context.Context) error {

	s.server.Shutdown(ctx)

	select {
	case <-s.done:
		return nil
	case <-ctx.Done():
		return fmt.Errorf("timeout")
	}

}

func (s *Server) Addr() string {
	return fmt.Sprintf("http://%s:%d/", s.ip, s.port)
}

func (s *Server) Stop() error {
	ctx, cancel := context.WithDeadline(context.TODO(), time.Now().Add(StopTimeout))
	defer cancel()

	s.server.Shutdown(ctx)

	select {
	case <-s.done:
		return nil
	case <-ctx.Done():
		return fmt.Errorf("timeout")
	}

}
