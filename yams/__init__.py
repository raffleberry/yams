import logging

loglevels = {
    "critical": 50,
    "error": 40,
    "warning": 30,
    "info": 20,
    "debug": 10,
}

logging.basicConfig(
    format="%(asctime)s %(filename)s:%(lineno)-4s %(levelname)-8s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

log = logging.getLogger("yams")
