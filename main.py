import yams
import scan
import db
import api
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse
import logging

logging.basicConfig(
    format="%(asctime)s,%(msecs)03d %(filename)s:%(lineno)-4s %(levelname)-8s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    level=logging.INFO,
)

app = FastAPI()

app.include_router(api.router, prefix="/api")


@app.get("/{path:path}")
async def frontend_handler(path: str):
    fp = Path("ui") / path
    if not fp.exists() or not fp.is_file():
        fp = Path("ui") / "index.html"
    return FileResponse(fp)


def init():
    yams.init()
    db.init_tables()
    scan.scan()


init()


def main():
    print("Hello from yams!")
    print("Hint: `uv run fastapi dev`")


if __name__ == "__main__":
    main()
