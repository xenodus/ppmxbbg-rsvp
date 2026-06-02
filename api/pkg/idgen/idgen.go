package idgen

import (
	"strconv"
	"sync"
	"time"
)

var (
	mu     sync.Mutex
	lastMs int64
	seq    uint32
)

func NewInviteID() string {
	mu.Lock()
	defer mu.Unlock()

	ms := time.Now().UnixMilli()
	if ms == lastMs {
		seq++
	} else {
		seq = 0
		lastMs = ms
	}
	id := (uint64(ms) << 22) | (uint64(seq) & 0x3fffff)
	return strconv.FormatUint(id, 10)
}
