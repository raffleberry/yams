from pathlib import Path

import mutagen

from models import Music


def get(path: str) -> Music:
    m = mutagen.File(path)  # pyright: ignore[reportPrivateImportUsage]
    if m is None:
        raise Exception(f"Failed to get meta for {path}")
    d = Music(Path=path, Size=Path(path).stat().st_size)

    d.Length = int(m.info.length)
    d.Bitrate = int(m.info.bitrate // 1000)
    d.Samplerate = int(m.info.sample_rate)
    d.Channels = int(m.info.channels)

    if path.lower().endswith(".mp3"):
        d.Title = str(m.get("TIT2", ""))
        d.Artists = str(m.get("TPE1", ""))
        d.Album = str(m.get("TALB", ""))
        d.Genre = str(m.get("TCON", ""))
        drc = str(m.get("TDRC", ""))
        d.Year = drc[:4]
        trck = str(m.get("TRCK", ""))
        try:
            d.Track = int(trck.split("/")[0])
        except Exception as _:
            d.Track = 1

        lyrics = m.tags.getall("USLT")
        if len(lyrics) > 0:
            d.Lyrics = lyrics[0].text

        cover_image = m.tags.getall("APIC")
        if len(cover_image) > 0:
            d.Artwork = cover_image[0].data

        comment = m.tags.getall("COMM")
        if len(comment) > 0:
            d.Comment = comment[0][0]

    elif path.lower().endswith(".m4a"):
        title = m.get("©nam")
        if title is not None and len(title) > 0:
            d.Title = title[0]

        artists = m.get("©ART")
        if artists is not None and len(artists) > 0:
            d.Artists = ", ".join(artists)

        album = m.get("©alb")
        if album is not None and len(album) > 0:
            d.Album = album[0]

        genre = m.get("©gen")
        if genre is not None and len(genre) > 0:
            d.Genre = genre[0]

        year = m.get("©day")
        if year is not None and len(year) > 0:
            d.Year = year[0][:4]

        track = m.get("trkn")
        if track is not None and len(track) > 0:
            d.Track = track[0][0]

        comment = m.get("©cmt")
        if comment is not None and len(comment) > 0:
            d.Comment = comment[0]

        cover_image = m.get("covr")
        if cover_image is not None and len(cover_image) > 0:
            d.Artwork = bytearray(cover_image[0])

        lyrics = m.get("©lyr")
        if lyrics is not None and len(lyrics) > 0:
            d.Lyrics = lyrics[0]

    elif path.lower().endswith(".flac"):
        title = m.get("title")
        if title is not None and len(title) > 0:
            d.Title = title[0]

        artists = m.get("artist")
        if artists is not None and len(artists) > 0:
            d.Artists = artists[0]

        album = m.get("album")
        if album is not None and len(album) > 0:
            d.Album = album[0]

        genre = m.get("genre")
        if genre is not None and len(genre) > 0:
            d.Genre = genre[0]

        year = m.get("date")
        if year is not None and len(year) > 0:
            d.Year = year[0][:4]

        track = m.get("tracknumber")
        if track is not None and len(track) > 0:
            try:
                d.Track = int(track[0][0])
            except Exception as _:
                d.Track = 1

        comment = m.get("comment")
        if comment is not None and len(comment) > 0:
            d.Comment = comment[0]

        cover_image = m.pictures
        if len(cover_image) > 0:
            d.Artwork = cover_image[0].data

        lyrics = m.get("lyrics")
        if lyrics is not None and len(lyrics) > 0:
            d.Lyrics = lyrics[0]

    else:
        raise Exception(f"unknown file type {path}")

    # sanitize artists
    arts = str(d.Artists).replace("/", ", ")
    d.Artists = arts

    return d
