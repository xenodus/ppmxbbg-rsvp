package store

import (
	"context"
	"database/sql"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestResolveGuestForNameUpdateByGuestID(t *testing.T) {
	mockDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	t.Cleanup(func() { _ = mockDB.Close() })

	inviteID := "1749123456789012345"
	guestID := int64(3)

	mock.ExpectQuery("SELECT invite_id FROM guests WHERE id = ?").
		WithArgs(guestID).
		WillReturnRows(sqlmock.NewRows([]string{"invite_id"}).AddRow(inviteID))

	gotGuestID, gotInviteID, err := resolveGuestForNameUpdate(context.Background(), mockDB, AdminGuestPatch{
		ID:       guestID,
		InviteID: inviteID,
		Name:     "Jane",
	})
	if err != nil {
		t.Fatalf("resolveGuestForNameUpdate: %v", err)
	}
	if gotGuestID != guestID || gotInviteID != inviteID {
		t.Fatalf("got guestID=%d inviteID=%q, want guestID=%d inviteID=%q", gotGuestID, gotInviteID, guestID, inviteID)
	}
}

func TestResolveGuestForNameUpdateFallbackByInviteAndPreviousName(t *testing.T) {
	mockDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	t.Cleanup(func() { _ = mockDB.Close() })

	inviteID := "1749123456789012345"
	guestID := int64(3)
	staleGuestID := int64(1749123456789012200)

	mock.ExpectQuery("SELECT invite_id FROM guests WHERE id = ?").
		WithArgs(staleGuestID).
		WillReturnError(sql.ErrNoRows)

	mock.ExpectQuery("SELECT id FROM guests WHERE invite_id = \\? AND name = \\?").
		WithArgs(inviteID, "John").
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(guestID))

	gotGuestID, gotInviteID, err := resolveGuestForNameUpdate(context.Background(), mockDB, AdminGuestPatch{
		ID:           staleGuestID,
		InviteID:     inviteID,
		PreviousName: "John",
		Name:         "Jane",
	})
	if err != nil {
		t.Fatalf("resolveGuestForNameUpdate: %v", err)
	}
	if gotGuestID != guestID || gotInviteID != inviteID {
		t.Fatalf("got guestID=%d inviteID=%q, want guestID=%d inviteID=%q", gotGuestID, gotInviteID, guestID, inviteID)
	}
}

func TestResolveGuestForNameUpdateRejectsMismatchedInvite(t *testing.T) {
	mockDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	t.Cleanup(func() { _ = mockDB.Close() })

	mock.ExpectQuery("SELECT invite_id FROM guests WHERE id = ?").
		WithArgs(int64(3)).
		WillReturnRows(sqlmock.NewRows([]string{"invite_id"}).AddRow("1749123456789012345"))

	_, _, err = resolveGuestForNameUpdate(context.Background(), mockDB, AdminGuestPatch{
		ID:       3,
		InviteID: "999",
		Name:     "Jane",
	})
	if err != ErrGuestNotFound {
		t.Fatalf("expected ErrGuestNotFound, got %v", err)
	}
}

func TestUpdateGuestNameSuccess(t *testing.T) {
	mockDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	t.Cleanup(func() { _ = mockDB.Close() })

	inviteID := "1749123456789012345"
	guestID := int64(3)

	mock.ExpectQuery("SELECT invite_id FROM guests WHERE id = ?").
		WithArgs(guestID).
		WillReturnRows(sqlmock.NewRows([]string{"invite_id"}).AddRow(inviteID))

	mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM guests").
		WithArgs(inviteID).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	mock.ExpectExec("UPDATE guests SET name = \\? WHERE id = \\?").
		WithArgs("Jane Smith", guestID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	mock.ExpectQuery("SELECT id, name, dietary_restriction").
		WithArgs(guestID).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "name", "dietary_restriction", "is_attending", "attend_solemnisation", "last_updated",
		}).AddRow(guestID, "Jane Smith", nil, nil, nil, nil))

	guest, err := updateGuestName(context.Background(), mockDB, AdminGuestPatch{
		ID:       guestID,
		InviteID: inviteID,
		Name:     "Jane Smith",
	})
	if err != nil {
		t.Fatalf("updateGuestName: %v", err)
	}
	if guest.ID != guestID || guest.Name != "Jane Smith" {
		t.Fatalf("unexpected guest: %+v", guest)
	}
}
