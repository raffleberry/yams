import json
import pathlib
from models import Config
from pydantic import BaseModel

config = Config(
    MusicDir="",
    Ip="127.0.0.1",
    Port=5550,
)


# use app.<name> to access config
CONFIG_DIR = pathlib.Path.joinpath(pathlib.Path.home(), ".yams")
CONFIG_FILE = pathlib.Path.joinpath(CONFIG_DIR, "config.json")
DB_LOCAL = pathlib.Path.joinpath(CONFIG_DIR, "yams.sqlite")
DB_REMOTE = pathlib.Path.joinpath(CONFIG_DIR, "yams_remote.sqlite")
ROOT_DIR = pathlib.Path.cwd()


def read_config(path):
    global config
    with open(path, "rb") as f:
        data = json.load(f)
        config = Config(**data)


def write_config(path, data: BaseModel):
    with open(path, "w") as f:
        f.write(data.model_dump_json(indent=4))


def init():
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    if not CONFIG_FILE.exists():
        write_config(CONFIG_FILE, config)
    read_config(CONFIG_FILE)
