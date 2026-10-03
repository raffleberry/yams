import argparse
from importlib import resources

from aiohttp import web

from yams import app, routes, scan, ui
from yams.app import log

scan.start_scanning()

# URL prefix when hosted behind a sub-path, e.g. "/yams".
# "" means serve from root (current behavior).
PREFIX = ""


def normalize_prefix(raw: str) -> str:
    p = (raw or "").strip()
    if not p:
        return ""
    if not p.startswith("/"):
        p = "/" + p
    p = p.rstrip("/")
    return p


frontend_routes = web.RouteTableDef()


@frontend_routes.get(r"/{path:.*}")
async def frontend_handler(req: web.Request):
    # match_info is relative to the subapp mount point, so this works
    # both with and without a prefix (unlike req.path which keeps it).
    path = req.match_info.get("path", "") or ""
    if ".." in path.split("/"):
        path = ""
    log.info(f"Frontend: {path}")
    root = resources.files(ui)
    fp = root / path if path else root / "index.html"
    if not fp.is_file():
        fp = root / "index.html"
    name = fp.name

    if name == "index.html" and PREFIX:
        text = fp.read_text(encoding="utf-8")
        text = text.replace('href="/', f'href="{PREFIX}/')
        text = text.replace('src="/', f'src="{PREFIX}/')
        return web.Response(text=text, content_type="text/html")

    if path == "app/base.js" or (not PREFIX and name == "base.js"):
        # Always serve via text so `base` is consistent; rewrite only when set.
        text = fp.read_text(encoding="utf-8")
        if PREFIX:
            text = text.replace('export const base = ""', f'export const base = "{PREFIX}"')
        return web.Response(text=text, content_type="text/javascript")

    if name == "site.webmanifest" and PREFIX:
        text = fp.read_text(encoding="utf-8")
        text = text.replace('"/android', f'"{PREFIX}/android')
        return web.Response(text=text, content_type="application/manifest+json")

    with resources.as_file(fp) as file:
        return web.FileResponse(file)


api = web.Application(logger=log)
api.add_subapp("/api", routes.api)
api.add_routes(frontend_routes)


def main():
    global PREFIX
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--prefix",
        default="",
        help="serve behind a sub-path, e.g. --prefix=/yams (nginx location /yams/)",
    )
    args = parser.parse_args()
    PREFIX = normalize_prefix(args.prefix)

    to_run = api
    if PREFIX:
        root = web.Application(logger=log)

        async def redirect_root(_req: web.Request):
            raise web.HTTPFound(PREFIX + "/")

        root.router.add_get("/", redirect_root)
        root.add_subapp(PREFIX, api)
        to_run = root

    base_path = PREFIX if PREFIX else ""
    print(f"Yams - http://{app.config.Ip}:{app.config.Port}{base_path}/")
    log.info(f"Using config: {app.config} prefix={PREFIX!r}")

    web.run_app(
        app=to_run,
        host=app.config.Ip,
        port=app.config.Port,
        access_log=log,
    )


if __name__ == "__main__":
    main()
