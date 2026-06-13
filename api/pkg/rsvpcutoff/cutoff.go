package rsvpcutoff

import "time"

var singapore = mustLoadLocation("Asia/Singapore")

// Cutoff is midnight on 11 September 2026 in Asia/Singapore. RSVP is not accepted at or after this instant.
var Cutoff = time.Date(2026, time.September, 11, 0, 0, 0, 0, singapore)

// Closed reports whether RSVP submissions are no longer accepted at now.
func Closed(now time.Time) bool {
	return !now.Before(Cutoff)
}

func mustLoadLocation(name string) *time.Location {
	loc, err := time.LoadLocation(name)
	if err != nil {
		panic("rsvpcutoff: load location " + name + ": " + err.Error())
	}
	return loc
}
