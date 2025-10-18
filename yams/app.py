import importlib.metadata
import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path

from yams import log

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


@dataclass
class Config:
    MusicDir: str = f"{Path.home() / 'Music'}"
    Ip: str = "127.0.0.1"
    Port: int = 5550
    LogLevel: str = "error"

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

        c = cls(**data)
        c.save()
        return c

    def save(self):
        with open(CONFIG_FILE, "w") as f:
            json.dump(asdict(self), f, indent=4)


config = Config.load()
