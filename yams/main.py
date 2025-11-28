from importlib import resources

from aiohttp import web

from yams import app, routes, scan, ui
from yams.app import log

scan.start_scanning()

frontend_routes = web.RouteTableDef()


@frontend_routes.get(r"/{path:.*}")
async def frontend_handler(req: web.Request):
    path = req.path.strip("/")
    log.info(f"Frontend: {path}")
    root = resources.files(ui)
    fp = root / path
    if not fp.is_file() or fp.is_dir():
        fp = root / "index.html"
    with resources.as_file(fp) as file:
        return web.FileResponse(file)


api = web.Application(logger=log)
api.add_subapp("/api", routes.api)
api.add_routes(frontend_routes)


def main():
    print(f"Yams - http://{app.config.Ip}:{app.config.Port}/")
    log.info(f"Using config: {app.config}")

    web.run_app(
        app=api,
        host=app.config.Ip,
        port=app.config.Port,
        access_log=log,
    )


if __name__ == "__main__":
    main()
