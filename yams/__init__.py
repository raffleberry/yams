import logging

logging.basicConfig(
    format="%(asctime)s %(filename)s:%(lineno)-4s %(levelname)-8s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

log = logging.getLogger("yams")
