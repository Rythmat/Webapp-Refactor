# Console Song Editor — backend work (api-refactor)

The `/console/content/song` editor is now an in-place, WYSIWYG replica of the
published song page (frontend: `src/features/admin/content/songEditor/`). Two
pieces live in the **api-refactor** backend (not this repo) and are needed for
it to be fully functional. The frontend is already written to these contracts.

## 1. Artist-image asset upload

The editor lets an admin upload an artist image from their computer. Images are
stored **the same way as existing artist images** — a served file URL that goes
verbatim into `Song.artistImageRef` (like `/artists/svg/stevie-wonder.webp`),
**not** inline base64. This repo has no blob/CDN storage and `public/` is
read-only at runtime, so the store must live on the backend.

**Endpoint** (admin-gated, same auth as `/api/admin/content/*`):

```
POST /api/admin/content/asset
Content-Type: multipart/form-data
Authorization: Bearer <auth0 token>     # + X-App-Session, same as other admin calls
Body: field "file" = the image (JPEG/PNG/WebP, already center-cropped square, ~320px)

200 → { "url": "<publicly-served image URL>" }
```

- The frontend (`src/hooks/data/admin/useAdminAssetUpload.ts`) posts the file and
  writes the returned `url` into `artistImageRef` (with `artistImageSource: 'manual'`).
- Store wherever the current `/artists/...` assets are served from (or the content
  CDN). Return a stable, cache-friendly public URL. Re-encoding to WebP is welcome.
- Recommended guards: max ~2 MB, image mime allowlist, admin-only.
- Until this ships, the editor degrades gracefully: the upload fails, a warning
  shows, and the admin can paste a URL/path into the same field.

## 2. Bulk-import the existing song catalog

`/console/content/song` reads **only** from the authoring DB
(`GET /api/admin/content/items?kind=song`). The ~600 catalog songs currently
live as static TS (`src/curriculum/data/songs/*.ts`) and are **not** in that DB,
which is why the list is empty. (The frontend now surfaces this explicitly —
error / not-signed-in / empty are distinct states — but it cannot populate the DB.)

**One-time job**: load each static `Song` into the authoring store as a `song`
row with `status: 'published'`. The row body is the exact `Song` object already
accepted by the existing save endpoint:

```
PUT /api/admin/content/items
Body: { kind: 'song', slug: <song.id>, body: <Song>, status: 'published' }
```

- Source of truth for the shape: `src/curriculum/types/songLibrary.ts` (`Song`).
- The bundled songs can be read from `src/content/songStore.ts` /
  `src/curriculum/data/songs/*.ts` at build time to drive the import.
- After import, publish a release so the CDN bundle matches (existing
  `POST /api/admin/content/releases` → parts → activate flow).
