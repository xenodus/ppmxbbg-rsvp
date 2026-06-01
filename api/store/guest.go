package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var (
	dbOnce sync.Once
	db     *sql.DB
	dbErr  error
)

type Guest struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	IsAttending *bool   `json:"is_attending,omitempty"`
	Comment     *string `json:"comment,omitempty"`
	LastUpdated *string `json:"last_updated,omitempty"`
}

func DB() (*sql.DB, error) {
	dbOnce.Do(func() {
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
			os.Getenv("DB_USER"),
			os.Getenv("DB_PASSWORD"),
			os.Getenv("DB_HOST"),
			envOrDefault("DB_PORT", "3306"),
			os.Getenv("DB_NAME"),
		)

		db, dbErr = sql.Open("mysql", dsn)
		if dbErr != nil {
			return
		}

		db.SetMaxOpenConns(2)
		db.SetMaxIdleConns(1)
		db.SetConnMaxLifetime(5 * time.Minute)

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		dbErr = db.PingContext(ctx)
	})

	return db, dbErr
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

var ErrGuestNotFound = errors.New("guest not found")

func GetGuest(ctx context.Context, id string) (*Guest, error) {
	conn, err := DB()
	if err != nil {
		return nil, err
	}

	var guest Guest
	var isAttending sql.NullBool
	var comment sql.NullString
	var lastUpdated sql.NullTime

	err = conn.QueryRowContext(ctx, `
		SELECT id, name, is_attending, comment, last_updated
		FROM guests
		WHERE id = ?
	`, id).Scan(&guest.ID, &guest.Name, &isAttending, &comment, &lastUpdated)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrGuestNotFound
	}
	if err != nil {
		return nil, err
	}

	if isAttending.Valid {
		v := isAttending.Bool
		guest.IsAttending = &v
	}
	if comment.Valid {
		v := comment.String
		guest.Comment = &v
	}
	if lastUpdated.Valid {
		v := lastUpdated.Time.Format("2006-01-02")
		guest.LastUpdated = &v
	}

	return &guest, nil
}

func SaveGuest(ctx context.Context, guest Guest) error {
	conn, err := DB()
	if err != nil {
		return err
	}

	if guest.IsAttending == nil {
		return errors.New("is_attending is required")
	}

	var comment any
	if guest.Comment != nil {
		comment = *guest.Comment
	}

	result, err := conn.ExecContext(ctx, `
		UPDATE guests
		SET name = ?, is_attending = ?, comment = ?, last_updated = CURDATE()
		WHERE id = ?
	`, guest.Name, *guest.IsAttending, comment, guest.ID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrGuestNotFound
	}

	return nil
}
