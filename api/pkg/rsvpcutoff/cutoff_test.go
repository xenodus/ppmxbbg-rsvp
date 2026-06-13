package rsvpcutoff

import (
	"testing"
	"time"
)

func TestClosed(t *testing.T) {
	tests := []struct {
		name string
		now  time.Time
		want bool
	}{
		{
			name: "before cutoff",
			now:  time.Date(2026, time.September, 10, 23, 59, 59, 0, singapore),
			want: false,
		},
		{
			name: "at cutoff",
			now:  Cutoff,
			want: true,
		},
		{
			name: "after cutoff",
			now:  time.Date(2026, time.September, 11, 12, 0, 0, 0, singapore),
			want: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := Closed(tc.now); got != tc.want {
				t.Fatalf("Closed(%v) = %v, want %v", tc.now, got, tc.want)
			}
		})
	}
}
