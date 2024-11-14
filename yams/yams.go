package yams

import (
	"net/http"

	"github.com/gorilla/mux"
)

func App() http.Handler {
	m := mux.NewRouter()
	m.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("yams"))
	})
	return m
}
