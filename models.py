from datetime import datetime
from enum import Enum
from pathlib import Path

from pydantic import BaseModel

import db
from logg import log


class Config(BaseModel):
    MusicDir: str = f"{Path.home() / 'Music'}"
    Ip: str = "127.0.0.1"
    Port: int = 5550
    LogLevel: str = "error"


class Music(BaseModel):
    Path: str = ""
    Title: str = ""
    Size: int = 0
    Artists: str = ""
    AlbumArtist: str = ""
    Album: str = ""
    Genre: str = ""
    Year: str = ""
    Track: int = 0
    Length: int = 0
    Bitrate: int = 0
    Samplerate: int = 0
    Channels: int = 0
    Lyrics: str = ""
    Comment: str = ""

    # auxilary
    IsFavourite: bool = False
    PlayCount: int = 0

    # on demand
    Artwork: bytes = b""

    def addAux(self):
        with db.R() as conn:
            cur = conn.cursor()

            cur.execute(
                "SELECT COUNT(*) FROM favourites WHERE Title=? AND Artists=? AND Album=?;",
                (self.Title, self.Artists, self.Album),
            )
            row = cur.fetchone()
            self.IsFavourite = row[0]

            cur.execute(
                "SELECT COUNT(*) FROM history WHERE Title=? AND Artists=? AND Album=?;",
                (self.Title, self.Artists, self.Album),
            )
            row = cur.fetchone()
            self.PlayCount = row[0]

    # required: Title, Artists, Album
    def updateMeta(self):
        try:
            with db.L() as conn:
                cur = conn.cursor()
                q = """SELECT 
                    Path, Title, Size,
                    Artists, Album, Genre,
                    Year, Track, Length,
                    Bitrate, Samplerate, Channels
                FROM files
                WHERE
                    Title=? and Artists=? and Album=? limit 1;
                """
                cur.execute(q, (self.Title, self.Artists, self.Album))
                row = cur.fetchone()
                if row:
                    self.Path = row[0]
                    self.Title = row[1]
                    self.Size = row[2]
                    self.Artists = row[3]
                    self.Album = row[4]
                    self.Genre = row[5]
                    self.Year = row[6]
                    self.Track = row[7]
                    self.Length = row[8]
                    self.Bitrate = row[9]
                    self.Samplerate = row[10]
                    self.Channels = row[11]
        except Exception as e:
            log.error(e, "failed while updating meta")


class History(Music):
    Time: datetime = datetime.now()


PlaylistType = Enum("PlaylistType", [("LIST", "LIST"), ("QUERY", "QUERY")])


class Playlist(BaseModel):
    Id: int = 0
    Name: str
    Description: str = ""
    Type: PlaylistType
    Query: str = ""
    Count: int = 0
