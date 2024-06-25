package media

type MediaInfo struct {
	Media struct {
		Ref   string `json:"@ref"`
		Track []struct {
			Type                 string `json:"@type"`
			FileExtension        string
			FileSize             string
			Duration             string
			OverallBitRate       string
			Title                string
			Album                string
			Album_Performer      string
			Track_Position       string
			Track_Position_Total string
			Performer            string
			Genre                string
			Recorded_Date        string
			Label                string `json:"Copyright"`
			Cover                string
			Lyrics               string
			Rating               string
			AudioCount           string
		} `json:"track"`
	}
}
