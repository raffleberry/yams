import json
from pathlib import Path

from pydantic import BaseModel

from models import Config

# use app.<name> to access config
APP_DIR = Path(__file__).parent
CONFIG_DIR = Path.home() / ".yams"
CONFIG_FILE = CONFIG_DIR / "config.json"
DB_LOCAL = CONFIG_DIR / "yams.sqlite"
DB_REMOTE = CONFIG_DIR / "yams_remote.sqlite"
ROOT_DIR = Path.cwd()

config = Config()


def _write_config(path, data: BaseModel):
    with open(path, "w") as f:
        f.write(data.model_dump_json(indent=4))


def _read_config(path):
    global config
    with open(path, "rb") as f:
        data = json.load(f)
        config = Config(**data)
        _write_config(path, config)


def init():
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    if not CONFIG_FILE.exists():
        _write_config(CONFIG_FILE, config)
    _read_config(CONFIG_FILE)


init()
