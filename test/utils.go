package test

import (
	"runtime"
	"testing"
)

func assertEqual(t *testing.T, expect any, got any) {
	if expect != got {
		t.Fatalf("expect {%v} , got {%v}", expect, got)
	}
}

func assert(t *testing.T, x bool) {
	if !x {
		_, file, line, _ := runtime.Caller(1)
		t.Errorf("ASSERT FAILED: %v:%v", file, line)
	}
}
