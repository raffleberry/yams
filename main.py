import yams
import db
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse

yams.init()

app = FastAPI()


@app.get("/{path:path}")
async def frontend_handler(path: str):
    fp = Path("ui") / path
    if not fp.exists() or not fp.is_file():
        fp = Path("ui") / "index.html"
    return FileResponse(fp)


def main():
    print("Hello from yams!")


if __name__ == "__main__":
    main()
