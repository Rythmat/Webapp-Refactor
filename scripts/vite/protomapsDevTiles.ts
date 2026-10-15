import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

/**
 * Dev and preview servers only: Protomaps' daily planet builds, same-origin,
 * so the Globe page's street map (docs/globe-ui/ENGINE.md) can be seen on
 * this machine without a tile host of our own.
 *
 * build.protomaps.com serves each day's planet as one .pmtiles file and
 * answers range requests, but sends no CORS headers, so a browser cannot
 * read it from another origin. This forwards `/__protomaps/<file>` to it,
 * and `/__protomaps/latest.pmtiles` redirects to the newest build (each is
 * deleted after a few days), so `.env.local` can say once:
 *
 *   VITE_BASEMAP_PMTILES_URL=/__protomaps/latest.pmtiles
 *
 * Production never uses this: a deployed build needs its own tile host or
 * an API key (ENGINE.md, "Tiles").
 */

export const PROTOMAPS_DEV_PATH = '/__protomaps';

const UPSTREAM = 'https://build.protomaps.com';
const BUILDS = 'https://build-metadata.protomaps.dev/builds.json';
/** How long the newest build's name is kept before asking again. */
const NEWEST_TTL_MS = 60 * 60 * 1000;

/** The newest daily build's file name, from Protomaps' build list. */
export function newestBuild(builds: readonly { key?: unknown }[]): string {
  const keys = builds
    .map((build) => build.key)
    .filter(
      (key): key is string =>
        typeof key === 'string' && /^\d{8}\.pmtiles$/.test(key),
    )
    .sort();
  const newest = keys.at(-1);
  if (!newest) throw new Error('no daily build in the Protomaps build list');
  return newest;
}

export function protomapsDevTiles(): Plugin {
  let newest: { key: string; at: number } | null = null;

  const latest = async (
    _req: IncomingMessage,
    res: ServerResponse,
    next: (error?: unknown) => void,
  ) => {
    try {
      if (!newest || Date.now() - newest.at > NEWEST_TTL_MS) {
        const response = await fetch(BUILDS);
        if (!response.ok) throw new Error(`${BUILDS}: ${response.status}`);
        const builds: unknown = await response.json();
        if (!Array.isArray(builds)) throw new Error(`${BUILDS}: not a list`);
        newest = { key: newestBuild(builds), at: Date.now() };
      }
      res.statusCode = 302;
      res.setHeader('Location', `${PROTOMAPS_DEV_PATH}/${newest.key}`);
      // The browser keeps the redirect, so each tile asks once, not twice.
      res.setHeader('Cache-Control', 'max-age=3600');
      res.end();
    } catch (error) {
      next(error);
    }
  };

  return {
    name: 'protomaps-dev-tiles',
    apply: 'serve',
    config: () => ({
      server: {
        proxy: {
          [`${PROTOMAPS_DEV_PATH}/`]: {
            target: UPSTREAM,
            changeOrigin: true,
            rewrite: (url: string) => url.slice(PROTOMAPS_DEV_PATH.length),
          },
        },
      },
    }),
    // Added before Vite's own middleware, so the redirect runs ahead of the
    // proxy that would otherwise forward `latest.pmtiles` upstream.
    configureServer(server) {
      server.middlewares.use(`${PROTOMAPS_DEV_PATH}/latest.pmtiles`, latest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(`${PROTOMAPS_DEV_PATH}/latest.pmtiles`, latest);
    },
  };
}
