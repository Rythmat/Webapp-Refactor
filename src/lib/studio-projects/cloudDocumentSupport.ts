// ── Whether music-atlas-api has the document field (milestone 1.5) ─────────
//
// The cloud document goes in the project's `document` field once the API has
// one (docs/studio-cloud-document-contract.md), and on the first track's
// settings until then (the interim fallback). The API says which: from the
// deploy that adds the field, every project it returns holds the `document`
// key, null when nothing was saved there. Each project this page receives
// (an open, a create, a save) updates the answer, so a deploy while the
// editor is open is picked up by the next save after any response.
//
// Until a project has come back, the answer is unknown and saves use the
// fallback: the API from before the field may refuse a body with keys it
// doesn't know, and the fallback reaches any API that keeps the settings
// blob. The answer lives for the page: one server serves every project.
//
// No imports: the projects client that calls it loads on every route.

let supported: boolean | null = null;

/** true: the API has the document field; false: it hasn't; null: unknown. */
export function cloudDocumentFieldSupported(): boolean | null {
  return supported;
}

/**
 * Learn from a project the API returned (detail, not a summary): whether it
 * holds the `document` key. Anything that isn't a project says nothing.
 */
export function noteCloudDocumentSupport(project: unknown): void {
  if (typeof project !== 'object' || project === null) return;
  if (!Array.isArray((project as { tracks?: unknown }).tracks)) return;
  supported = Object.prototype.hasOwnProperty.call(project, 'document');
}

/** Forget the answer (tests). */
export function resetCloudDocumentSupport(): void {
  supported = null;
}
