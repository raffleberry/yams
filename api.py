from fastapi import APIRouter, Response
from fastapi.responses import FileResponse
import db
import yams
import models
import logging
from pathlib import Path

log = logging.getLogger(__name__)

router = APIRouter()


@router.get("/all")
async def all():
    limit = 10
    files = []
    with db.L() as conn:
        cur = conn.cursor()
        cur.execute(f"""
        SELECT
			Path, Title, Size,
			Artists, Album, Genre,
			Year, Track, Length,
			Bitrate, Samplerate, Channels
		FROM
			files
		WHERE
			Path
		GLOB '{yams.config.MusicDir}*' GROUP BY Title, Artists, Album ORDER BY RANDOM() LIMIT {limit};
        """)
        rows = cur.fetchall()
        for row in rows:
            m = models.Music(
                Path=row[0],
                Title=row[1],
                Size=row[2],
                Artists=row[3],
                Album=row[4],
                Genre=row[5],
                Year=row[6],
                Track=row[7],
                Length=row[8],
                Bitrate=row[9],
                Samplerate=row[10],
                Channels=row[11],
            )
            m.addAux()
            files.append(m)
    return {"Data": files, "Next": -1}


@router.get("/artwork")
async def artwork(path=None):
    if path is not None:
        with db.L() as conn:
            cur = conn.cursor()
            cur.execute("Select Artwork from files where Path=?;", (path,))
            row = cur.fetchone()
            if row:
                return Response(content=row[0])


@router.get("/files")
async def files(path=None):
    if path is not None and Path(path).is_file():
        return FileResponse(path)


@router.get("/search")
async def search(query="", offset: int = 0):
    limit = 10
    q = f"""SELECT
        Path, Title, Size,
        Artists, Album, Genre,
        Year, Track, Length,
        Bitrate, Samplerate, Channels
    FROM
        files
    WHERE
        Path GLOB '{yams.config.MusicDir}*'
    AND
        (
            Artists LIKE '%{query}%'
            OR Album LIKE '%{query}%'
            OR Title LIKE '%{query}%'
            OR Year LIKE '%{query}%'
        )
	GROUP BY Title, Artists, Album
    LIMIT ? OFFSET ?;"""
    files = []
    with db.L() as conn:
        cur = conn.cursor()
        cur.execute(q, (limit, offset))
        rows = cur.fetchall()
        for row in rows:
            m = models.Music(
                Path=row[0],
                Title=row[1],
                Size=row[2],
                Artists=row[3],
                Album=row[4],
                Genre=row[5],
                Year=row[6],
                Track=row[7],
                Length=row[8],
                Bitrate=row[9],
                Samplerate=row[10],
                Channels=row[11],
            )
            m.addAux()
            files.append(m)
        return {
            "Data": files,
            "Next": -1 if len(files) < limit else offset + limit,
        }


@router.get("/history")
async def history_get(offset: int = 0):
    limit = 10
    q = """
        SELECT
			Time, Title, 
			Artists, Album, Genre,
			Year, Track, Length
		FROM
			history
		ORDER BY
			Time DESC LIMIT ? OFFSET ?;
    """
    files = []
    with db.R() as conn:
        cur = conn.cursor()
        cur.execute(q, (limit, offset))
        rows = cur.fetchall()
        for row in rows:
            h = models.History(
                Time=row[0],
                Title=row[1],
                Artists=row[2],
                Album=row[3],
                Genre=row[4],
                Year=row[5],
                Track=row[6],
                Length=row[7],
            )
            h.updateMeta()
            files.append(h)
        return {
            "Data": files,
            "Next": -1 if len(files) < limit else offset + limit,
        }


@router.post("/history")
async def history_add(h: models.History):
    with db.R() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO history (
		Title, Artists, Album,
        Genre, Year, Track, Length)
        VALUES
		(?,?,?,
        ?,?,?,?);
        """,
            (
                h.Title,
                h.Artists,
                h.Album,
                h.Genre,
                h.Year,
                h.Track,
                h.Length,
            ),
        )
        conn.commit()
    return {
        "Message": "Playback history updated",
        "Title": h.Title,
        "Artists": h.Artists,
    }


@router.get("/artists")
async def artists_all():
    with db.L() as conn:
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT Artists FROM files
            WHERE Path GLOB '{yams.config.MusicDir}*' group by Artists;
        """,
        )
        files = []
        rows = cur.fetchall()
        for row in rows:
            files.append(models.Music(Artists=row[0]))

        return {
            "Data": files,
        }


@router.get("/artists/{artists}")
async def artists_get(artists: str):
    q = f"""SELECT
		Path, Title, Size,
		Artists, Album, Genre,
		Year, Track, Length,
		Bitrate, Samplerate, Channels
	FROM files WHERE Path GLOB '{yams.config.MusicDir}*'
    """
    args = ()
    for artist in artists.split(","):
        args += (f"%{artist.strip()}%",)
        q += " AND Artists LIKE ? "
    q += " GROUP BY Title, Artists, Album ORDER BY YEAR DESC; "

    files = []
    with db.L() as conn:
        cur = conn.cursor()
        cur.execute(q, args)
        rows = cur.fetchall()
        for row in rows:
            m = models.Music(
                Path=row[0],
                Title=row[1],
                Size=row[2],
                Artists=row[3],
                Album=row[4],
                Genre=row[5],
                Year=row[6],
                Track=row[7],
                Length=row[8],
                Bitrate=row[9],
                Samplerate=row[10],
                Channels=row[11],
            )
            m.addAux()
            files.append(m)

        return {
            "Data": files,
        }


@router.get("/albums")
async def albums_all():
    q = f"""
    SELECT Album, MIN(Artists) as Artists, Year
    FROM files
    WHERE Path GLOB '{yams.config.MusicDir}*' group by Album, Year;
    """

    files = []

    with db.L() as conn:
        cur = conn.cursor()
        cur.execute(q)
        rows = cur.fetchall()
        for row in rows:
            m = models.Music(
                Album=row[0],
                Artists=row[1],
                Year=row[2],
            )
            files.append(m)
    return {
        "Data": files,
    }


@router.get("/albums/{album}")
async def albums_get(album: str):
    q = f"""
    SELECT
        Path, Title, Size,
        Artists, Album, Genre,
        Year, Track, Length,
        Bitrate, Samplerate, Channels
    FROM files WHERE Path GLOB '{yams.config.MusicDir}*'
    AND Album = ? GROUP BY Title, Artists ORDER BY Track ASC;
    """

    files = []

    with db.L() as conn:
        cur = conn.cursor()
        print(q, album)
        cur.execute(q, (album,))
        rows = cur.fetchall()
        for row in rows:
            m = models.Music(
                Path=row[0],
                Title=row[1],
                Size=row[2],
                Artists=row[3],
                Album=row[4],
                Genre=row[5],
                Year=row[6],
                Track=row[7],
                Length=row[8],
                Bitrate=row[9],
                Samplerate=row[10],
                Channels=row[11],
            )
            m.addAux()
            files.append(m)

    return {
        "Data": files,
    }


@router.get("/playlists")
async def playlists_all():
    playlists = [
        models.Playlist(
            Id=-1,
            Name="Favourites",
            Count=getPlaylistCount(-1),
        )
    ]

    with db.R() as conn:
        cur = conn.cursor()
        cur.execute("SELECT Id, Name, Description, Type, Query FROM playlists;")
        rows = cur.fetchall()
        for row in rows:
            p = models.Playlist(
                Id=row[0],
                Name=row[1],
                Description=row[2],
                Type=row[3],
                Query=row[4],
                Count=getPlaylistCount(row[0]),
            )
            playlists.append(p)
    return {
        "Data": playlists,
    }


@router.get("/playlists/favourites")
async def playlists_getfav(offset: int = 0):
    print("Hello")
    limit = 10
    files = []
    with db.R() as conn:
        cur = conn.cursor()
        cur.execute(
            """SELECT
                Title, Artists, Album,
                Genre, Year, Track, Length
            FROM
                favourites;""",
        )
        rows = cur.fetchall()
        for row in rows:
            m = models.Music(
                Title=row[0],
                Artists=row[1],
                Album=row[2],
                Genre=row[3],
                Year=row[4],
                Track=row[5],
                Length=row[6],
            )
            m.addAux()
            m.updateMeta()
            files.append(m)

    return {
        "Data": files,
        "Next": -1 if len(files) < limit else offset + limit,
    }


@router.post("/playlists/favourites")
async def playlists_addfav(m: models.Music):
    with db.R() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO favourites (
		Title, Artists, Album, Genre,
		Year, Track, Length) VALUES
		(?,?,?,?,
		?,?,?);""",
            (
                m.Title,
                m.Artists,
                m.Album,
                m.Genre,
                m.Year,
                m.Track,
                m.Length,
            ),
        )
        conn.commit()
    return {
        "Message": "Added to favourites",
        "Title": m.Title,
        "Artists": m.Artists,
    }


@router.delete("/playlists/favourites")
async def playlists_delfav(m: models.Music):
    with db.R() as conn:
        cur = conn.cursor()
        cur.execute(
            """DELETE FROM favourites
		WHERE
		Title=? and Artists=? and Album=?""",
            (
                m.Title,
                m.Artists,
                m.Album,
            ),
        )
        conn.commit()
    return {
        "Message": "Removed from favourites",
        "Title": m.Title,
        "Artists": m.Artists,
    }


@router.get("/playlists/{id}")
async def playlists_get(id: int, offset: int = 0):
    limit = 10
    files = []
    with db.R() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT Id, Type, Query FROM playlists WHERE Id=?;",
            (id,),
        )
        row = cur.fetchone()
        if row is None:
            raise Exception("Playlist not found")
        p = models.Playlist(
            Id=row[0],
            Type=row[3],
            Query=row[4],
        )

        if p.Type == models.PlaylistType.LIST:
            cur.execute(
                """SELECT
                    Title, Artists, Album,
                    Genre, Year, Track, Length
                FROM
                    playlists_songs
                WHERE
                    PlaylistId = ?;""",
                (id,),
            )
            rows = cur.fetchall()
            for row in rows:
                m = models.Music(
                    Title=row[0],
                    Artists=row[1],
                    Album=row[2],
                    Genre=row[3],
                    Year=row[4],
                    Track=row[5],
                    Length=row[6],
                )
                m.addAux()
                m.updateMeta()
                files.append(m)

    return {
        "Data": files,
        "Next": -1 if len(files) < limit else offset + limit,
    }


@router.post("/playlists/{id}")
async def playlists_add(id: int, m: models.Music):
    with db.R() as conn:
        cur = conn.cursor()
        cur.execute("SELECT Id FROM playlists WHERE Id = ?;", (id,))
        row = cur.fetchone()
        if row is None:
            raise Exception("Playlist not found")
        cur.execute(
            """INSERT INTO playlists_songs (
		PlaylistId, Title,
		Artists, Album, Genre,
		Year, Track, Length) VALUES
		(?, ?,
		?,?,?,
		?,?,?);""",
            (
                id,
                m.Title,
                m.Artists,
                m.Album,
                m.Genre,
                m.Year,
                m.Track,
                m.Length,
            ),
        )
        conn.commit()

    return {
        "Message": "Added to playlist",
        "Title": m.Title,
        "Artists": m.Artists,
    }


@router.delete("/playlists/{id}")
async def playlists_del(id: int, m: models.Music):
    with db.R() as conn:
        cur = conn.cursor()
        cur.execute("SELECT Id FROM playlists WHERE Id = ?;", (id,))
        row = cur.fetchone()
        if row is None:
            raise Exception("Playlist not found")
        cur.execute(
            """DELETE FROM playlists_songs
		WHERE
		Title=? and Artists=? and Album=?
        and PlaylistId=?""",
            (
                m.Title,
                m.Artists,
                m.Album,
                id,
            ),
        )
        conn.commit()

    return {
        "Message": "Removed from playlist",
        "Title": m.Title,
        "Artists": m.Artists,
    }


def getPlaylistCount(id):
    with db.R() as conn:
        cur = conn.cursor()
        if id != -1:
            cur.execute(
                "SELECT COUNT(*) FROM playlists_songs where PlaylistId=?;", (id,)
            )
        else:
            cur.execute("SELECT COUNT(*) FROM favourites;")
        row = cur.fetchone()
        return row[0]


# api.HandleFunc("GET /triggerScan", h(triggerScan))
# api.HandleFunc("GET /isScanning", h(func(c *server.Context) error {
#     return c.JSON(http.StatusOK, isScanning)
# }))

# api.HandleFunc("GET /props", h(props))
