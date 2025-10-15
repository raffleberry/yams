from contextlib import asynccontextmanager
from importlib import resources

import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse

from yams import api, app, log, scan, ui


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    scan.scan()
    yield
    # shutdown


fapi = FastAPI(lifespan=lifespan)

fapi.include_router(api.router, prefix="/api")


@fapi.get("/{path:path}")
async def frontend_handler(path: str):
    root = resources.files(ui)
    fp = root / path
    if not fp.is_file() or fp.is_dir():
        fp = root / "index.html"
    with resources.as_file(fp) as file:
        return FileResponse(file)


def main():
    print(f"Yams - http://{app.config.Ip}:{app.config.Port}/")
    log.info(f"Using config: {app.config}")

    uvicorn.run(
        fapi,
        host=app.config.Ip,
        port=app.config.Port,
        log_level=app.config.LogLevel,
    )


if __name__ == "__main__":
    main()
