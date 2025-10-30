import sqlite3

from yams import app


def L():
    return sqlite3.connect(app.DB_LOCAL)


def R():
    return sqlite3.connect(app.DB_REMOTE)


def Lrc():
    return sqlite3.connect(app.DB_LRC)


def init_tables():
    local_tables = [
        """
CREATE TABLE IF NOT EXISTS files (
    Path TEXT PRIMARY KEY,
    Size INTEGER,
    Title TEXT,
    Artists TEXT,
    Album TEXT,
    AlbumArtist TEXT,
    Comment TEXT,
    Genre TEXT,
    Year TEXT,
    Track INTEGER,
    Length INTEGER,
    Bitrate INTEGER,
    Samplerate INTEGER,
    Channels INTEGER,
    Artwork BLOB,
    Lyrics TEXT
);
""",
        """
CREATE TABLE IF NOT EXISTS scanned (
    Path TEXT PRIMARY KEY
);
""",
        """
CREATE TABLE IF NOT EXISTS last_scan (
    Time DATETIME,
    Path TEXT PRIMARY KEY,
    InDisk INTEGER,
    InDb INTEGER,
    MissingFiles INTEGER,
    NewFiles INTEGER,
    Err TEXT
);
""",
    ]
    with L() as conn:
        cur = conn.cursor()
        for table in local_tables:
            cur.execute(table)
        conn.commit()

    remote_tables = [
        """
CREATE TABLE IF NOT EXISTS history (
    Time DATETIME DEFAULT CURRENT_TIMESTAMP,
    Path TEXT,
    Size INTEGER,
    Title TEXT,
    Artists TEXT,
    Album TEXT,
    Genre TEXT,
    Year TEXT,
    Track INTEGER,
    Length INTEGER
);
""",
        """
CREATE TABLE IF NOT EXISTS playlists (
    Id INTEGER PRIMARY KEY,
    Name TEXT,
    Description TEXT,
    Type CHECK(Type IN ('LIST', 'QUERY')),
    Query TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
""",
        """
CREATE TABLE IF NOT EXISTS playlists_songs (
    PlaylistId INTEGER,
    Path TEXT,
    Size INTEGER,
    Title TEXT,
    Artists TEXT,
    Album TEXT,
    Genre TEXT,
    Year TEXT,
    Track INTEGER,
    Length INTEGER
);
""",
        """
CREATE TABLE IF NOT EXISTS favourites (
    Path TEXT,
    Size INTEGER,
    Title TEXT,
    Artists TEXT,
    Album TEXT,
    Genre TEXT,
    Year TEXT,
    Track INTEGER,
    Length INTEGER
);
""",
    ]
    with R() as conn:
        cur = conn.cursor()
        for table in remote_tables:
            cur.execute(table)
        conn.commit()

    lyrics_tables = [
        """
        CREATE TABLE IF NOT EXISTS lyrics (
            Title TEXT,
            Artists TEXT,
            Album TEXT,
            Lyrics TEXT,
            SyncedLyrics TEXT,
            Instrumental INTEGER,
            PRIMARY KEY (Title, Artists, Album)
        );
        """,
    ]
    with Lrc() as conn:
        cur = conn.cursor()
        for table in lyrics_tables:
            cur.execute(table)
        conn.commit()


init_tables()
