from pydantic import BaseModel
from typing import Optional


class Config(BaseModel):
    MusicDir: str
    Ip: str
    Port: int


class Music(BaseModel):
    Path: str
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
    IsFavourite: Optional[bool] = False
    PlayCount: Optional[int] = 0

    # on demand
    Artwork: Optional[bytes] = None
    Props: Optional[str] = None
