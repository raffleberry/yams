from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse

import api
import scan
import yams


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
    print(f"Starting Yams on : http://{yams.config.Ip}:{yams.config.Port}/")
    uvicorn.run(
        app,
        host=yams.config.Ip,
        port=yams.config.Port,
        log_level=yams.config.LogLevel,
    )


if __name__ == "__main__":
    main()
