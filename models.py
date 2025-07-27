from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import db
import logging

log = logging.getLogger(__name__)


class Config(BaseModel):
    MusicDir: str
    Ip: str
    Port: int


class Music(BaseModel):
    Path: str = ""
    Title: str = ""
    Size: int = 0
    Artists: str = ""
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
    Artwork: bytes = None
    Props: str = None


class History(Music):
    Time: datetime = None

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
