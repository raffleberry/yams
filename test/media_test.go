package test

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/raffleberry/yams/media"
)

func TestSpotifyStruct(t *testing.T) {
	t.Run("spotify_track", func(t *testing.T) {
		d, err := os.ReadFile("./spotify_song.json")
		if err != nil {
			t.Fatal(err)
		}

		var st media.SpotifyTrack
		err = json.Unmarshal(d, &st)
		if err != nil {
			t.Fatal(err)
		}

		assert(t, len(st.Id) > 0)
		assert(t, len(st.Name) > 0)
		assert(t, len(st.Artists) == 2)

		for _, a := range st.Artists {
			assert(t, len(a.Id) > 0)
			assert(t, len(a.Name) > 0)
		}

		assert(t, st.DurationMs != 0)
	})

	t.Run("spotify_playlist", func(t *testing.T) {
		d, err := os.ReadFile("./spotify_playlist.json")
		if err != nil {
			t.Fatal(err)
		}

		var sp media.SpotifyPlaylist

		err = json.Unmarshal(d, &sp)
		if err != nil {
			t.Fatal(err)
		}

		assert(t, sp.Name != "")
		assert(t, sp.Owner != media.SpotifyUser{})
		assert(t, sp.Tracks.Total > 0)
		assert(t, len(sp.Tracks.Items) > 0)

		for _, tr := range sp.Tracks.Items {
			assert(t, !tr.AddedAt.IsZero())
			assert(t, len(tr.Track.Artists) > 0)
			assert(t, tr.Track.Id != "")
			assert(t, tr.Track.Name != "")
			assert(t, tr.Track.Album.Id != "")
			assert(t, tr.Track.DurationMs != 0)
		}
	})
}
