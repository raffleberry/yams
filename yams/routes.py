import sqlite3
from dataclasses import asdict
from pathlib import Path

from aiohttp import web

from yams import app, db, models, scan

routes = web.RouteTableDef()

log = app.getLogger("api")

api = web.Application(logger=log, debug=app.DEV)


@web.middleware
async def error_middleware(request, handler):
    try:
        response = await handler(request)
        return response
    except web.HTTPException as e:
        return web.json_response({"error": e.reason}, status=e.status)

    except Exception as e:
        app.log
        return web.json_response(
            {"error": "Internal Server Error", "details": str(e)}, status=500
        )


@routes.get("/all")
async def all(req: web.Request):
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
		GLOB '{app.config.MusicDir}*' GROUP BY Title, Artists, Album ORDER BY RANDOM() LIMIT {limit};
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
            files.append(m.json_dict())
    return web.json_response({"Data": files, "Next": -1})


@routes.get("/artwork")
async def artwork(req: web.Request):
    path = req.query.get("path")
    if path is not None:
        with db.L() as conn:
            cur = conn.cursor()
            cur.execute("Select Artwork from files where Path=?;", (path,))
            row = cur.fetchone()
            if row:
                return web.Response(body=row[0])

    return web.Response(status=404)


@routes.get("/files")
async def files(req: web.Request):
    path = req.query.get("path")
    if path is not None and Path(path).is_file():
        return web.FileResponse(path)
    return web.Response(status=404)


@routes.get("/search")
async def search(req: web.Request):
    query = req.query.get("query")
    offsetStr = req.query.get("offset")
    offset = 0 if offsetStr is None else int(offsetStr)
    limit = 10
    query = f"%{query}%"
    q = f"""SELECT
        Path, Title, Size,
        Artists, Album, Genre,
        Year, Track, Length,
        Bitrate, Samplerate, Channels
    FROM
        files
    WHERE
        Path GLOB '{app.config.MusicDir}*'
    AND
        (
            Artists LIKE ?
            OR Album LIKE ?
            OR Title LIKE ?
            OR Year LIKE ?
        )
	GROUP BY Title, Artists, Album
    LIMIT ? OFFSET ?;"""
    files = []
    with db.L() as conn:
        cur = conn.cursor()
        cur.execute(q, (query, query, query, query, limit, offset))
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
            files.append(m.json_dict())
        return web.json_response(
            {
                "Data": files,
                "Next": -1 if len(files) < limit else offset + limit,
            }
        )


@routes.get("/history")
async def history_get(req: web.Request):
    offsetStr = req.query.get("offset")
    offset = 0 if offsetStr is None else int(offsetStr)
    limit = 10
    q = """
        SELECT
			datetime(Time, 'localtime'), Title,
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
            files.append(h.json_dict())
        return web.json_response(
            {
                "Data": files,
                "Next": -1 if len(files) < limit else offset + limit,
            }
        )


@routes.post("/history")
async def history_add(req: web.Request):
    jsonBody = await req.json()
    h: models.History = models.History(**jsonBody)
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
    return web.json_response(
        {
            "Message": "Playback history updated",
            "Title": h.Title,
            "Artists": h.Artists,
        }
    )


@routes.get("/artists")
async def artists_all(req: web.Request):
    with db.L() as conn:
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT Artists FROM files
            WHERE Path GLOB '{app.config.MusicDir}*' group by Artists;
        """,
        )
        files = []
        rows = cur.fetchall()
        for row in rows:
            files.append(models.Music(Artists=row[0]).json_dict())

        return web.json_response(
            {
                "Data": files,
            }
        )


@routes.get("/artists/{artists}")
async def artists_get(req: web.Request):
    artists = req.match_info["artists"]
    q = f"""SELECT
		Path, Title, Size,
		Artists, Album, Genre,
		Year, Track, Length,
		Bitrate, Samplerate, Channels
	FROM files WHERE Path GLOB '{app.config.MusicDir}*'
    """
    arts = []
    args = ()
    for a in artists.split(","):
        arts.append(a.strip())
        args += (f"%{a.strip()}%",)
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
            valid = False
            for a in m.Artists.split(","):
                if a.strip() in arts:
                    valid = True
                    break
            if not valid:
                continue

            m.addAux()
            files.append(m.json_dict())

        return web.json_response({"Data": files})


@routes.get("/albums")
async def albums_all(req: web.Request):
    limit = 10
    offsetStr = req.query.get("offset")
    offset = 0 if offsetStr is None else int(offsetStr)
    q = f"""
    SELECT Path, Album, AlbumArtist, Year, COUNT(DISTINCT Title) as Songs
    FROM files
    WHERE Path GLOB '{app.config.MusicDir}*'
    GROUP BY Album, Year ORDER BY Songs DESC LIMIT {limit} OFFSET ?;
    """

    files = []

    with db.L() as conn:
        cur = conn.cursor()
        cur.execute(q, (offset,))
        rows = cur.fetchall()
        for row in rows:
            m = {
                "Path": row[0],
                "Album": row[1],
                "AlbumArtist": row[2],
                "Year": row[3],
                "Songs": row[4],
            }
            files.append(m)
    return web.json_response(
        {
            "Data": files,
            "Next": -1 if len(files) < limit else offset + limit,
        }
    )


@routes.get("/albums/{album}")
async def albums_get(req: web.Request):
    album = req.match_info["album"]
    q = f"""
    SELECT
        Path, Title, Size,
        Artists, Album, Genre,
        Year, Track, Length,
        Bitrate, Samplerate, Channels
    FROM files WHERE Path GLOB '{app.config.MusicDir}*'
    AND Album = ? GROUP BY Title, Artists ORDER BY Track ASC;
    """

    files = []

    with db.L() as conn:
        cur = conn.cursor()
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
            files.append(m.json_dict())

    return web.json_response({"Data": files})


@routes.post("/playlists")
async def playlists_new(req: web.Request):
    jsonBody = await req.json()
    p = models.Playlist.from_dict(jsonBody)
    with db.R() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO
        playlists
            (Name, Description, Type, Query)
        VALUES
            (?,?,?,?);
        """,
            (p.Name, p.Description, p.Type.value, p.Query),
        )
        p.Id = cur.lastrowid if cur.lastrowid is not None else -1
        conn.commit()
    return web.json_response(p.json_dict())


@routes.put("/playlists")
async def playlists_edit(req: web.Request):
    json_dict = await req.json()
    p = models.Playlist.from_dict(json_dict)
    with db.R() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE
        playlists
            SET Name = ?, Description = ?
        WHERE Id = ?
        """,
            (p.Name, p.Description, p.Id),
        )
        p.Id = cur.lastrowid if cur.lastrowid is not None else -1
        conn.commit()
    return web.json_response(p.json_dict())


@routes.delete("/playlists")
async def playlists_del(req: web.Request):
    idStr = req.query.get("id")

    if idStr is None:
        return web.Response(status=400)

    id = int(idStr)

    del_count = 0
    with db.R() as conn:
        cur = conn.cursor()

        cur.execute("SELECT Type FROM playlists WHERE Id = ?;", (id,))
        row = cur.fetchone()
        if row is None:
            return web.json_response({"Message": "Playlist not found"}, status=404)

        t = models.PlaylistType(row[0])

        cur.execute("DELETE FROM playlists WHERE Id = ?;", (id,))

        if t == models.PlaylistType.LIST:
            res = cur.execute(
                "DELETE FROM playlists_songs WHERE PlaylistId = ?;", (id,)
            )
            del_count = res.rowcount
        conn.commit()

    return web.json_response({"Message": "Playlist deleted", "Count": del_count})


@routes.get("/playlists")
async def playlists_all(req: web.Request):
    playlists = []

    with db.R() as conn:
        cur = conn.cursor()
        cur.execute("SELECT Id, Name, Description, Type, Query FROM playlists;")
        rows = cur.fetchall()
        for row in rows:
            p = models.Playlist(
                Id=row[0],
                Name=row[1],
                Description=row[2],
                Type=models.PlaylistType(row[3]),
                Query=row[4],
                Count=getPlaylistCount(row[0]),
            )
            playlists.append(p.json_dict())

    return web.json_response({"Data": playlists})


@routes.get("/favourites")
async def favourites_get(req: web.Request):
    offsetStr = req.query.get("offset")
    offset = 0 if offsetStr is None else int(offsetStr)

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
            files.append(m.json_dict())

    return web.json_response(
        {
            "Data": files,
            "Next": -1 if len(files) < limit else offset + limit,
        }
    )


@routes.post("/favourites")
async def favourites_add(req: web.Request):
    jsonBody = await req.json()
    m = models.Music(**jsonBody)

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

    return web.json_response(
        {
            "Message": "Added to favourites",
            "Title": m.Title,
            "Artists": m.Artists,
        }
    )


@routes.delete("/favourites")
async def favourites_del(req: web.Request):
    jsonBody = await req.json()
    m = models.Music(**jsonBody)
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
    return web.json_response(
        {
            "Message": "Removed from favourites",
            "Title": m.Title,
            "Artists": m.Artists,
        }
    )


@routes.get("/playlists/{id}")
async def playlists_get(req: web.Request):
    offsetStr = req.query.get("offset")
    offset = 0 if offsetStr is None else int(offsetStr)

    idStr = req.match_info.get("id")

    if idStr is None:
        return web.HTTPBadRequest(reason="Invalid playlist id")

    id = int(idStr)

    limit = 10
    files = []
    with db.R() as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(
            "SELECT Id, Type, Query FROM playlists WHERE Id=?;",
            (id,),
        )
        row = cur.fetchone()
        if row is None:
            return web.HTTPNotFound(reason="Playlist not found")
        p = models.Playlist(
            Id=row[0],
            Name="",
            Description="",
            Type=models.PlaylistType(row[1]),
            Query=row[2],
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
                files.append(m.json_dict())
        elif p.Type == models.PlaylistType.QUERY:
            colsRequired = ["Title", "Artists", "Album", "Year"]
            for col in colsRequired:
                if col not in p.Query:
                    raise Exception("Invalid query: missing - " + col)
            cur.execute(p.Query)
            rows = cur.fetchall()
            for row in rows:
                m = models.Music(
                    Title=row["Title"],
                    Artists=row["Artists"],
                    Album=row["Album"],
                    Year=row["Year"],
                )

                m.updateMeta()
                m.addAux()
                files.append(m.json_dict())

    return web.json_response(
        {
            "Data": files,
            "Next": -1 if len(files) < limit else offset + limit,
        }
    )


@routes.post("/playlists/{id}")
async def playlists_add_to(req: web.Request):
    idStr = req.match_info.get("id")

    if idStr is None:
        return web.HTTPBadRequest(reason="Invalid playlist id")

    id = int(idStr)

    jsonBody = await req.json()
    m = models.Music(**jsonBody)

    with db.R() as conn:
        cur = conn.cursor()
        cur.execute("SELECT Id FROM playlists WHERE Id = ?;", (id,))
        row = cur.fetchone()
        if row is None:
            return web.HTTPNotFound(reason="Playlist not found")
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

    return web.json_response(
        {
            "Message": "Added to playlist",
            "Title": m.Title,
            "Artists": m.Artists,
        }
    )


@routes.delete("/playlists/{id}")
async def playlists_del_from(req: web.Request):
    idStr = req.match_info.get("id")

    if idStr is None:
        return web.HTTPBadRequest(reason="Invalid playlist id")

    id = int(idStr)

    jsonBody = await req.json()
    m = models.Music(**jsonBody)

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

    return web.json_response(
        {
            "Message": "Removed from playlist",
            "Title": m.Title,
            "Artists": m.Artists,
        }
    )


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


@routes.get("/props")
async def props(req: web.Request):
    path = req.query.get("path")
    with db.L() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT Lyrics, Genre, Comment, Size FROM files WHERE Path=?;", (path,)
        )
        row = cur.fetchone()
        res = {}
        if row:
            res["Lyrics"] = row[0]
            res["Genre"] = row[1]
            res["Comment"] = row[2]
            res["Size"] = f"{row[3] / 1024 / 1024:.2f} MB"

        return web.json_response(res)


@routes.get("/lyrics")
async def lyrics(req: web.Request):
    path = req.query.get("path")
    base_url = "https://lrclib.net/api/get"

    with db.L() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT Title, Artists, AlbumArtist, Album, Length from files where Path=?;",
            (path,),
        )
        row = cur.fetchone()
        if not row:
            return web.HTTPNotFound(reason="File not found")

        m = models.Music(
            Title=row[0],
            Artists=row[1],
            AlbumArtist=row[2],
            Album=row[3],
            Length=row[4],
        )

    with db.Lrc() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT Lyrics, SyncedLyrics, Instrumental FROM lyrics WHERE Title=? AND Artists=? AND Album=?;",
            (m.Title, m.Artists, m.Album),
        )
        res = cur.fetchone()

        if res:
            app.log.debug("Found in LRC_DB")
            return web.json_response(
                models.Lyrics(
                    Title=m.Title,
                    Artists=m.Artists,
                    Album=m.Album,
                    Lyrics=res[0],
                    SyncedLyrics=res[1],
                    Instrumental=res[2],
                ).as_dict()
            )

    query_params = {
        "track_name": m.Title,
        "artist_name": m.AlbumArtist,
        "duration": m.Length,
    }

    session = await app.ahttp()
    async with session.get(url=base_url, params=query_params) as response:
        if response.status != 200:
            return web.HTTPServiceUnavailable(
                reason=f"Lyrics api error: {response.status} - {response.reason}"
            )
        res = await response.json()

        plainLyrics = res["plainLyrics"]
        if not plainLyrics:
            plainLyrics = ""
        syncedLyrics = res["syncedLyrics"]
        if not syncedLyrics:
            syncedLyrics = ""

        lyr = models.Lyrics(
            Title=m.Title,
            Artists=m.Artists,
            Album=m.Album,
            Lyrics=plainLyrics,
            SyncedLyrics=syncedLyrics,
            Instrumental=1 if res["instrumental"] else 0,
        )

    with db.Lrc() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT OR REPLACE INTO lyrics (Title, Artists, Album, Lyrics, SyncedLyrics, Instrumental) VALUES (?, ?, ?, ?, ?, ?);",
            (
                lyr.Title,
                lyr.Artists,
                lyr.Album,
                lyr.Lyrics,
                lyr.SyncedLyrics,
                lyr.Instrumental,
            ),
        )
        conn.commit()

    return web.json_response(lyr.as_dict())


@routes.get("/triggerScan")
async def trigger_scan(req: web.Request):
    if scan.scan_lock.locked():
        return web.json_response({"Message": "Already Scanning"}, status=503)

    scan.start_scanning()

    return web.json_response(
        {
            "Message": "Started scanning",
        },
        status=202,
    )


@routes.get("/isScanning")
async def is_scanning(req: web.Request):
    return web.json_response(scan.scan_lock.locked())


api.add_routes(routes)
api.middlewares.append(error_middleware)
