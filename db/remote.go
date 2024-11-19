package db

import (
	"database/sql"
	"path/filepath"

	"github.com/raffleberry/yams/app"
)

func initRemote() error {
	remoteSqlitePath := filepath.Join(app.ConfigDir, "yams_remote.sqlite")
	R, err = sql.Open("sqlite3", remoteSqlitePath)
	return err
}
