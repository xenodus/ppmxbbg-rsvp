package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

type AdminInvite struct {
	Invite
	IsSent *bool `json:"is_sent,omitempty"`
}

type CreateInviteInput struct {
	Guests []string
	IsSent *bool
}

type AdminInvitePatch struct {
	ID     string `json:"id"`
	IsSent *bool  `json:"is_sent"`
}

type AdminGuestPatch struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

func ListInvites(ctx context.Context) ([]AdminInvite, error) {
	conn, err := DB()
	if err != nil {
		return nil, err
	}

	rows, err := conn.QueryContext(ctx, `
		SELECT i.id, i.is_sent, i.require_parking, i.last_updated,
		       g.id, g.name, g.dietary_restriction, g.is_attending, g.attend_solemnisation, g.last_updated
		FROM invites i
		LEFT JOIN guests g ON g.invite_id = i.id
		ORDER BY i.id ASC, g.id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byID := map[string]*AdminInvite{}
	order := []string{}

	for rows.Next() {
		var inviteID string
		var isSent, requireParking sql.NullBool
		var inviteUpdated sql.NullTime
		var guestID sql.NullInt64
		var guestName sql.NullString
		var dietaryRestriction sql.NullString
		var isAttending sql.NullBool
		var attendSolemnisation sql.NullBool
		var guestUpdated sql.NullTime

		if err := rows.Scan(
			&inviteID, &isSent, &requireParking, &inviteUpdated,
			&guestID, &guestName, &dietaryRestriction, &isAttending, &attendSolemnisation, &guestUpdated,
		); err != nil {
			return nil, err
		}

		inv, ok := byID[inviteID]
		if !ok {
			inv = &AdminInvite{Invite: Invite{ID: inviteID, Guests: []Guest{}}}
			if isSent.Valid {
				v := isSent.Bool
				inv.IsSent = &v
			}
			if requireParking.Valid {
				v := requireParking.Bool
				inv.RequireParking = &v
			}
			if inviteUpdated.Valid {
				v := inviteUpdated.Time.Format("2006-01-02 15:04:05")
				inv.LastUpdated = &v
			}
			byID[inviteID] = inv
			order = append(order, inviteID)
		}

		if guestID.Valid {
			guest := Guest{ID: guestID.Int64, Name: guestName.String}
			if dietaryRestriction.Valid {
				v := dietaryRestriction.String
				guest.DietaryRestriction = &v
			}
			if isAttending.Valid {
				v := isAttending.Bool
				guest.IsAttending = &v
			}
			if attendSolemnisation.Valid {
				v := attendSolemnisation.Bool
				guest.AttendSolemnisation = &v
			}
			if guestUpdated.Valid {
				v := guestUpdated.Time.Format("2006-01-02 15:04:05")
				guest.LastUpdated = &v
			}
			inv.Guests = append(inv.Guests, guest)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	out := make([]AdminInvite, 0, len(order))
	for _, id := range order {
		out = append(out, *byID[id])
	}
	return out, nil
}

func CreateInvite(ctx context.Context, id string, input CreateInviteInput) (*AdminInvite, error) {
	names := normalizeGuestNames(input.Guests)
	if len(names) == 0 {
		return nil, errors.New("at least one guest name is required")
	}

	conn, err := DB()
	if err != nil {
		return nil, err
	}

	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var isSent any
	if input.IsSent != nil {
		isSent = *input.IsSent
	}

	if _, err := tx.ExecContext(ctx, `INSERT INTO invites (id, is_sent) VALUES (?, ?)`, id, isSent); err != nil {
		return nil, fmt.Errorf("insert invite: %w", err)
	}
	for _, name := range names {
		if _, err := tx.ExecContext(ctx, `INSERT INTO guests (invite_id, name) VALUES (?, ?)`, id, name); err != nil {
			return nil, fmt.Errorf("insert guest: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	invite, err := GetInvite(ctx, id)
	if err != nil {
		return nil, err
	}
	return EnrichAdminInvite(ctx, invite)
}

func UpdateInviteAdmin(ctx context.Context, patch AdminInvitePatch) error {
	if patch.IsSent == nil {
		return errors.New("is_sent is required")
	}
	conn, err := DB()
	if err != nil {
		return err
	}
	result, err := conn.ExecContext(ctx, `UPDATE invites SET is_sent = ? WHERE id = ?`, *patch.IsSent, patch.ID)
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

func DeleteInvite(ctx context.Context, id string) error {
	conn, err := DB()
	if err != nil {
		return err
	}
	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `DELETE FROM guests WHERE invite_id = ?`, id); err != nil {
		return err
	}
	result, err := tx.ExecContext(ctx, `DELETE FROM invites WHERE id = ?`, id)
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
	return tx.Commit()
}

func EnrichAdminInvite(ctx context.Context, invite *Invite) (*AdminInvite, error) {
	conn, err := DB()
	if err != nil {
		return nil, err
	}
	var isSent sql.NullBool
	err = conn.QueryRowContext(ctx, `SELECT is_sent FROM invites WHERE id = ?`, invite.ID).Scan(&isSent)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrInviteNotFound
	}
	if err != nil {
		return nil, err
	}
	out := &AdminInvite{Invite: *invite}
	if isSent.Valid {
		v := isSent.Bool
		out.IsSent = &v
	}
	return out, nil
}

func UpdateGuestName(ctx context.Context, patch AdminGuestPatch) (*Guest, error) {
	name := strings.TrimSpace(patch.Name)
	if patch.ID <= 0 {
		return nil, errors.New("id is required")
	}
	if name == "" {
		return nil, errors.New("name is required")
	}

	conn, err := DB()
	if err != nil {
		return nil, err
	}

	result, err := conn.ExecContext(ctx, `UPDATE guests SET name = ? WHERE id = ?`, name, patch.ID)
	if err != nil {
		return nil, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rows == 0 {
		return nil, ErrGuestNotFound
	}

	var guest Guest
	var dietaryRestriction sql.NullString
	var isAttending sql.NullBool
	var attendSolemnisation sql.NullBool
	var guestUpdated sql.NullTime
	err = conn.QueryRowContext(ctx, `
		SELECT id, name, dietary_restriction, is_attending, attend_solemnisation, last_updated
		FROM guests
		WHERE id = ?
	`, patch.ID).Scan(
		&guest.ID,
		&guest.Name,
		&dietaryRestriction,
		&isAttending,
		&attendSolemnisation,
		&guestUpdated,
	)
	if err != nil {
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
	if attendSolemnisation.Valid {
		v := attendSolemnisation.Bool
		guest.AttendSolemnisation = &v
	}
	if guestUpdated.Valid {
		v := guestUpdated.Time.Format("2006-01-02 15:04:05")
		guest.LastUpdated = &v
	}
	return &guest, nil
}

func normalizeGuestNames(names []string) []string {
	out := make([]string, 0, len(names))
	for _, n := range names {
		if n = strings.TrimSpace(n); n != "" {
			out = append(out, n)
		}
	}
	return out
}
