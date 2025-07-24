from fastapi import APIRouter, Response
import db
import yams
import models
import logging
from pathlib import Path

log = logging.getLogger(__name__)

router = APIRouter()


# api.HandleFunc("GET /all", h(all))
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
            log.info(f"{type(row[5])}, {row[5]}")
            files.append(
                models.Music(
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
            )
    return {"Data": files, "Next": -1}


@router.get("/artwork")
async def artwork(path=None):
    log.info(str(Path(path)))
    if path is not None:
        with db.L() as conn:
            cur = conn.cursor()
            cur.execute("Select Artwork from files where Path=?;", (path,))
            row = cur.fetchone()
            if row:
                return Response(content=row[0])


# api.HandleFunc("GET /artwork", h(artwork))

# api.HandleFunc("GET /props", h(props))
# api.HandleFunc("GET /files", h(files))
# api.HandleFunc("GET /search", h(search))

# api.HandleFunc("GET /history", h(getHistory))
# api.HandleFunc("POST /history", h(addToHistory))

# api.HandleFunc("GET /artists", h(allArtists))
# api.HandleFunc("GET /artists/{artists}", h(getArtist))

# api.HandleFunc("GET /albums", h(allAlbums))
# api.HandleFunc("GET /albums/{album}", h(getAlbum))

# api.HandleFunc("GET /playlists", h(allPlaylists))
# api.HandleFunc("GET /playlists/{id}", h(getPlayist))
# api.HandleFunc("POST /playlists/{id}", h(addToPlayist))
# api.HandleFunc("DELETE /playlists/{id}", h(deleteFromPlaylist))

# api.HandleFunc("GET /triggerScan", h(triggerScan))
# api.HandleFunc("GET /isScanning", h(func(c *server.Context) error {
#     return c.JSON(http.StatusOK, isScanning)
# }))
