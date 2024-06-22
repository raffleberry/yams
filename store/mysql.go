package store

import (
	"database/sql"
	"log"

	"github.com/go-sql-driver/mysql"
)

type mySql struct {
	cfg mysql.Config
	c   *sql.DB
	err error
}

func (m *mySql) Init() error {
	m.c, m.err = sql.Open("mysql", m.cfg.FormatDSN())

	if m.err != nil {
		panic(m.err)
	}

	m.err = m.c.Ping()

	if m.err != nil {
		panic(m.err)
	}

	log.Println("Connected to MySql!")
	return m.err
}

func (m *mySql) Conn() *sql.DB {
	return m.c
}
