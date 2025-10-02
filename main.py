import logging
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse

import api
import scan
import yams

logging.basicConfig(
    format="%(asctime)s,%(msecs)03d %(filename)s:%(lineno)-4s %(levelname)-8s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    level=logging.INFO,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    scan.scan()
    yield
    # shutdown


app = FastAPI(lifespan=lifespan)

app.include_router(api.router, prefix="/api")


@app.get("/{path:path}")
async def frontend_handler(path: str):
    fp = yams.APP_DIR / "ui" / path
    if not fp.exists() or not fp.is_file():
        fp = yams.APP_DIR / "ui" / "index.html"
    return FileResponse(fp)


def main():
    uvicorn.run(app, host=yams.config.Ip, port=yams.config.Port)


if __name__ == "__main__":
    main()
