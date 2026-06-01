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
	ID                 int64   `json:"id"`
	Name               string  `json:"name"`
	IsAttending        *bool   `json:"is_attending,omitempty"`
	DietaryRestriction *string `json:"dietary_restriction,omitempty"`
	LastUpdated        *string `json:"last_updated,omitempty"`
}

type Invite struct {
	ID                  string  `json:"id"`
	RequireParking      *bool   `json:"require_parking,omitempty"`
	AttendSolemnisation *bool   `json:"attend_solemnisation,omitempty"`
	LastUpdated         *string `json:"last_updated,omitempty"`
	Guests              []Guest `json:"guests"`
}

type InviteUpdate struct {
	ID                  string `json:"id"`
	RequireParking      *bool  `json:"require_parking"`
	AttendSolemnisation *bool  `json:"attend_solemnisation"`
}

type GuestUpdate struct {
	ID                 int64   `json:"id"`
	IsAttending        *bool   `json:"is_attending"`
	DietaryRestriction *string `json:"dietary_restriction"`
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

var (
	ErrInviteNotFound = errors.New("invite not found")
	ErrGuestNotFound  = errors.New("guest not found")
)

func GetInvite(ctx context.Context, id string) (*Invite, error) {
	conn, err := DB()
	if err != nil {
		return nil, err
	}

	var invite Invite
	var requireParking sql.NullBool
	var attendSolemnisation sql.NullBool
	var lastUpdated sql.NullTime

	err = conn.QueryRowContext(ctx, `
		SELECT id, require_parking, attend_solemnisation, last_updated
		FROM invites
		WHERE id = ?
	`, id).Scan(&invite.ID, &requireParking, &attendSolemnisation, &lastUpdated)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrInviteNotFound
	}
	if err != nil {
		return nil, err
	}

	if requireParking.Valid {
		v := requireParking.Bool
		invite.RequireParking = &v
	}
	if attendSolemnisation.Valid {
		v := attendSolemnisation.Bool
		invite.AttendSolemnisation = &v
	}
	if lastUpdated.Valid {
		v := lastUpdated.Time.Format("2006-01-02 15:04:05")
		invite.LastUpdated = &v
	}

	rows, err := conn.QueryContext(ctx, `
		SELECT id, name, dietary_restriction, is_attending, last_updated
		FROM guests
		WHERE invite_id = ?
		ORDER BY id
	`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	guests := []Guest{}
	for rows.Next() {
		var guest Guest
		var dietaryRestriction sql.NullString
		var isAttending sql.NullBool
		var guestUpdated sql.NullTime

		if err := rows.Scan(
			&guest.ID,
			&guest.Name,
			&dietaryRestriction,
			&isAttending,
			&guestUpdated,
		); err != nil {
			return nil, err
		}

		if dietaryRestriction.Valid {
			v := dietaryRestriction.String
			guest.DietaryRestriction = &v
		}
		if isAttending.Valid {
			v := isAttending.Bool
			guest.IsAttending = &v
		}
		if guestUpdated.Valid {
			v := guestUpdated.Time.Format("2006-01-02 15:04:05")
			guest.LastUpdated = &v
		}

		guests = append(guests, guest)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	invite.Guests = guests
	return &invite, nil
}

func SaveInvite(ctx context.Context, update InviteUpdate) error {
	conn, err := DB()
	if err != nil {
		return err
	}

	if update.RequireParking == nil || update.AttendSolemnisation == nil {
		return errors.New("require_parking and attend_solemnisation are required")
	}

	result, err := conn.ExecContext(ctx, `
		UPDATE invites
		SET require_parking = ?, attend_solemnisation = ?
		WHERE id = ?
	`, *update.RequireParking, *update.AttendSolemnisation, update.ID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrInviteNotFound
	}

	return nil
}

func SaveGuest(ctx context.Context, update GuestUpdate) error {
	conn, err := DB()
	if err != nil {
		return err
	}

	if update.IsAttending == nil {
		return errors.New("is_attending is required")
	}

	dietaryRestriction := ""
	if update.DietaryRestriction != nil {
		dietaryRestriction = *update.DietaryRestriction
	}

	result, err := conn.ExecContext(ctx, `
		UPDATE guests
		SET is_attending = ?, dietary_restriction = ?
		WHERE id = ?
	`, *update.IsAttending, dietaryRestriction, update.ID)
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

func DeclineAllGuests(ctx context.Context, inviteID string) error {
	conn, err := DB()
	if err != nil {
		return err
	}

	var exists int
	err = conn.QueryRowContext(ctx, `SELECT 1 FROM invites WHERE id = ?`, inviteID).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrInviteNotFound
	}
	if err != nil {
		return err
	}

	_, err = conn.ExecContext(ctx, `
		UPDATE guests
		SET is_attending = 0, dietary_restriction = ''
		WHERE invite_id = ?
	`, inviteID)
	if err != nil {
		return err
	}

	_, err = conn.ExecContext(ctx, `
		UPDATE invites
		SET require_parking = COALESCE(require_parking, 0),
		    attend_solemnisation = COALESCE(attend_solemnisation, 0)
		WHERE id = ?
	`, inviteID)
	return err
}
