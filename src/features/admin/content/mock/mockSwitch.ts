// ── DEV-only switch for the offline content mock ─────────────────────────────
//
// The console can run against an in-memory copy of the content API (see
// contentMockServer.ts) so it works with no backend at all. Everything that
// decides whether to use it reads the constants below, and each one is guarded
// on a literal `import.meta.env.DEV`, the same way src/auth/devBypass.ts is:
// Vite replaces it with `false` in a production build, the branches that would
// reach the mock fold away, and (with the import-site guard below) the mock's
// chunk is never emitted.
// `npm run verify:prod` reports it if any of it ships anyway. Nothing runs
// that scan by itself: `build` is `tsc -b && vite build`, and there is no CI,
// so it is the import-site guards below that keep the mock out of dist.
//
// Every dynamic import of the mock must also be guarded by a literal
// `import.meta.env.DEV` in the importing module itself. With only the
// constant from here, the bundler still removes the dead import() call but
// writes the mock's chunk into dist anyway, and verify:prod fails on it.
//
// This file must stay tiny and import nothing: manifest.ts reads it on the
// eager path of every page. Repo mode's switch lives here too, below.
//
// Turn it on for a local session with
//   VITE_CONTENT_MOCK=1 VITE_DEV_AUTH_BYPASS=1 VITE_DEV_AUTH_BYPASS_ROLE=admin npx vite
// (VITE_DEV_AUTH_BYPASS_ROLE=editor to rehearse proposals) and add
// VITE_CONTENT_MOCK_KINDS=legacy to rehearse today's production API. The mock
// takes the caller's role from the session token, as the API does, so a real
// login works too; a request it cannot read a role from gets a 401.

/** True only in a dev server started with VITE_CONTENT_MOCK=1. */
export const CONTENT_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_CONTENT_MOCK === '1';

/**
 * Which API the mock imitates.
 *
 * - `all`: the API as docs/console-content-api-contract.md specifies it, with
 *   the record kinds, capabilities, lookup, export and create-only PUT.
 * - `legacy`: today's API — the six kinds, song schema level 0 (the keys
 *   docs/song-body-schema-gap.md lists are refused, and the seed holds each
 *   chart without them), no /capabilities (so the console's fallbacks run),
 *   no reference checks, bare PUT responses.
 * - `repo`: the dev repo content server's profile. Its store is the repo's
 *   own data files on the owner's machine, held in Node by the dev server
 *   and never in the browser; `src/scripts/repoContent/` seeds it and
 *   writes each change back into the files. A save is on disk when it is
 *   answered: git is the review, and commit plus deploy is the publish. So
 *   it is admin-only, with no proposals, releases or rollback, no drafts
 *   except a song `bundled.ts` does not register, every kind it serves
 *   authoritative, and no song → event derivation. The browser mock never
 *   runs it, and no environment variable here chooses it: only the repo
 *   server asks for it.
 */
export type ContentMockMode = 'all' | 'legacy' | 'repo';

export const CONTENT_MOCK_MODE: Exclude<ContentMockMode, 'repo'> =
  import.meta.env.DEV && import.meta.env.VITE_CONTENT_MOCK_KINDS === 'legacy'
    ? 'legacy'
    : 'all';

/**
 * The CDN base the content stores see in mock mode. A made-up scheme on
 * purpose: nothing can fetch it by accident, so a request that escapes the
 * mock fails loudly instead of reaching a real bucket.
 */
export const MOCK_CDN_URL: string | undefined = import.meta.env.DEV
  ? 'mock://cdn'
  : undefined;

// ── Repo mode ────────────────────────────────────────────────────────────────
//
// With VITE_CONTENT_REPO=1 the dev server hosts the repo content server
// (scripts/vite/repoContentPlugin.ts), whose store is the repo's own data
// files on this machine: the console's saves go straight into them, git is
// the review, and commit plus deploy is the publish. The console only
// fetches it, same origin, at REPO_CONTENT_BASE; it never loads its code.
//
//   VITE_CONTENT_REPO=1 npx vite
//
// Precedence is the offline mock, then repo mode, then the content API. It
// is never switched on by itself: vitest runs with DEV true, and a probe
// would silently change where saves land. `npm run verify:prod` fails if
// any of it reaches a production build.

/** True only in a dev server started with VITE_CONTENT_REPO=1, the mock off. */
export const CONTENT_REPO =
  import.meta.env.DEV &&
  import.meta.env.VITE_CONTENT_REPO === '1' &&
  !CONTENT_MOCK;

/** Where the dev server answers in repo mode: the content API under it. */
export const REPO_CONTENT_BASE: string | undefined = import.meta.env.DEV
  ? '/__repo-content'
  : undefined;

if (
  import.meta.env.DEV &&
  import.meta.env.VITE_CONTENT_REPO === '1' &&
  CONTENT_MOCK
) {
  console.warn(
    'VITE_CONTENT_REPO and VITE_CONTENT_MOCK are both set: the offline mock answers, and nothing is saved into the repo files.',
  );
}
