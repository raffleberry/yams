import importlib.metadata
import json
import logging
import os
from dataclasses import asdict, dataclass, fields
from pathlib import Path

import aiohttp

# use app.<name> to access config
CONFIG_DIR = Path.home() / ".yams"
CONFIG_FILE = CONFIG_DIR / "config.json"
DB_LOCAL = CONFIG_DIR / "yams.sqlite"
DB_REMOTE = CONFIG_DIR / "yams_remote.sqlite"
DB_LRC = CONFIG_DIR / "yams_lrc.sqlite"
ROOT_DIR = Path.cwd()
DEV = bool(os.getenv("DEV", False))
VERSION = "DEV" if DEV else importlib.metadata.version("yams")
CONFIG_DIR.mkdir(parents=True, exist_ok=True)
FASTAPI_LOG_LEVEL = logging.INFO


def _setupLogger(name, log_file=None, level=logging.ERROR):
    if DEV:
        level = logging.DEBUG

    logger = logging.getLogger(name)
    logger.setLevel(level)

    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger


log = _setupLogger("yams")


@dataclass
class Config:
    MusicDir: str = f"{Path.home() / 'Music'}"
    Ip: str = "127.0.0.1"
    Port: int = 5550

    @classmethod
    def load(cls):
        data = {}
        try:
            with open(CONFIG_FILE, "r") as f:
                data = json.load(f)
        except Exception as e:
            log.warning(
                f"Unable to load Config File error:{e}",
            )
            log.warning("Using default values")
        expectedFields = {f.name for f in fields(cls)}
        cleanedData = {k: v for k, v in data.items() if k in expectedFields}
        c = cls(**cleanedData)
        c.save()
        return c

    def save(self):
        with open(CONFIG_FILE, "w") as f:
            json.dump(asdict(self), f, indent=4)


config = Config.load()

_ahttp = None


async def ahttp():
    global _ahttp
    if _ahttp is None:
        _ahttp = aiohttp.ClientSession()
    return _ahttp
