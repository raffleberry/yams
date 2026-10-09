/**
 * Runtime configuration.
 *
 * The Go binary rewrites /config.js at request time so the SPA works both at
 * the domain root and behind a -prefix sub-path. Vite bakes `base: "./"` into
 * the HTML, so we read the effective base from <base href> rather than
 * duplicating prefix logic here.
 */

const fromBase = (): string => {
  if (typeof document !== "undefined") {
    const href = document.querySelector("base")?.getAttribute("href");
    if (href) {
      // "/yams/" -> "/yams" ; "/" -> ""
      return href.replace(/\/+$/, "");
    }
    if (location.pathname !== "/") {
      const guess = location.pathname.replace(/\/[^/]*$/, "");
      return guess === "/" ? "" : guess;
    }
  }
  return "";
};

/** Base URL for every request, e.g. "" or "/yams". */
export const base: string = fromBase();

/** Build an absolute URL under the configured base path. */
export const url = (path: string): string => `${base}${path}`;
