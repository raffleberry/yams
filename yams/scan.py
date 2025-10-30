import datetime
from pathlib import Path
from typing import Dict

from yams import app, db, meta
from yams.app import log

IS_SCANNING = False


def is_media(file_name: str) -> bool:
    file_name = file_name.lower()
    exts = ["mp4", "mkv", "mp3", "m4a", "flac"]
    for ext in exts:
        if file_name.endswith(ext):
            return True
    return False


def is_scanned(path: str) -> bool:
    rows = []
    with db.L() as conn:
        cur = conn.cursor()
        cur.execute("SELECT Path FROM scanned;")
        rows = cur.fetchall()
    for row in rows:
        if str(row[0]).startswith(path):
            return True
    return False


def add_db(new_files: list):
    failed = []
    with db.L() as conn:
        cur = conn.cursor()
        for path in new_files:
            try:
                m: meta.Music = meta.get(path)
                cur.execute(
                    """
                    INSERT INTO files (
                        Path, Size, Title, Artists,
                        Album, AlbumArtist, Comment, Genre,
                        Year, Track, Length, Bitrate,
                        Samplerate, Channels, Artwork, Lyrics
                    ) VALUES (
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?);
                    """,
                    (
                        m.Path,
                        m.Size,
                        m.Title,
                        m.Artists,
                        m.Album,
                        m.AlbumArtist,
                        m.Comment,
                        m.Genre,
                        m.Year,
                        m.Track,
                        m.Length,
                        m.Bitrate,
                        m.Samplerate,
                        m.Channels,
                        m.Artwork,
                        m.Lyrics,
                    ),
                )
            except Exception as e:
                log.error(e, f"Failed to get meta for:{path} to db")
                failed.append(path)
            conn.commit()

        log.info(
            f"Added {len(new_files) - len(failed)} new files. Failed: {len(failed)}"
        )


def clean_db(not_in_dir: list):
    with db.L() as conn:
        cur = conn.cursor()
        for path in not_in_dir:
            cur.execute("DELETE FROM files WHERE Path = ?", (path,))
            conn.commit()
        log.info(f"Cleaned {len(not_in_dir)} files from db")


def insert_last_scan(last_scan) -> Dict:
    with db.L() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT OR REPLACE INTO last_scan(Time, Path, InDisk, InDb, MissingFiles, NewFiles, Err) VALUES (?,?,?,?,?,?,?);",
            (
                datetime.datetime.now(),
                app.config.MusicDir,
                last_scan["in_disk"],
                last_scan["in_db"],
                last_scan["missing_files"],
                last_scan["new_files"],
                last_scan["err"],
            ),
        )
        conn.commit()
    return last_scan


def scan_db() -> set:
    with db.L() as conn:
        cur = conn.cursor()
        cur.execute("SELECT Path FROM files;")
        rows = cur.fetchall()
        return set(
            row[0] for row in rows if str(row[0]).startswith(app.config.MusicDir)
        )


def scan_disk():
    files = set()
    log.info(f"Scanning: {Path(app.config.MusicDir)}")
    for file in Path(app.config.MusicDir).rglob("*"):
        if file.is_file() and is_media(file.name):
            files.add(str(file))
    return files


# TODO Make Threadsafe
def scan():
    last_scan = {
        "in_disk": 0,
        "in_db": 0,
        "missing_files": 0,
        "new_files": 0,
        "err": "",
    }

    global IS_SCANNING
    IS_SCANNING = True
    log.info("Started scanning")
    try:
        db = scan_db()
        disk = scan_disk()
        not_in_disk = []
        not_in_db = []

        for file in db:
            if file not in disk:
                not_in_disk.append(file)

        for file in disk:
            if file not in db:
                not_in_db.append(file)

        last_scan["in_disk"] = len(disk)
        last_scan["in_db"] = len(db)
        last_scan["missing_files"] = len(not_in_disk)
        last_scan["new_files"] = len(not_in_db)

        log.info(f"Found {len(not_in_db)} new files")

        add_db(not_in_db)
        clean_db(not_in_disk)

        log.info("Done scanning")
    except Exception as e:
        log.error(e, exc_info=True)
        last_scan["err"] = str(e)
    finally:
        IS_SCANNING = False
        insert_last_scan(last_scan)
