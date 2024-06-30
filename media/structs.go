package media

import "time"

type Track interface {
	Name() string
	Artists() string
	Album() string
	Length() int

	// Song `p` is same as `q`
	IsSame(q Track) bool
}

type LocalTrack struct {
	Path    string
	Name    string
	Artists []string
	Album   string
	Length  int
}

type SpotifyUser struct {
	Id   string `json:"id"`
	Name string `json:"display_name"`
}

type SpotifyTrack struct {
	Id         string          `json:"id"`
	Name       string          `json:"name"`
	DurationMs int             `json:"duration_ms"`
	Artists    []SpotifyArtist `json:"artists"`
	Album      SpotifyAlbum    `json:"album"`

	TrackNo int `json:"track_number"`
}

type SpotifyAlbum struct {
	Id          string          `json:"id"`
	Name        string          `json:"name"`
	Type        string          `json:"album_type"` // "single" or "album"
	ReleaseDate string          `json:"release_date"`
	Artists     []SpotifyArtist `json:"artists"`
	TotalTracks int             `json:"total_tracks"`
}

type SpotifyArtist struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

type SpotifyPlaylist struct {
	Name   string      `json:"name"`
	Owner  SpotifyUser `json:"owner"`
	Tracks struct {
		Items []struct {
			AddedAt time.Time    `json:"added_at"`
			Track   SpotifyTrack `json:"track"`
		} `json:"items"`

		// example "api.spotify.com/v1/me/shows?offset=1&limit=1" ( null if none)
		Next  string
		Total int
	} `json:"tracks"`
}
