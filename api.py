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


# api.HandleFunc("GET /playlists", h(allPlaylists))
# api.HandleFunc("GET /playlists/{id}", h(getPlayist))
# api.HandleFunc("POST /playlists/{id}", h(addToPlayist))
# api.HandleFunc("DELETE /playlists/{id}", h(deleteFromPlaylist))

# api.HandleFunc("GET /triggerScan", h(triggerScan))
# api.HandleFunc("GET /isScanning", h(func(c *server.Context) error {
#     return c.JSON(http.StatusOK, isScanning)
# }))

# api.HandleFunc("GET /props", h(props))
