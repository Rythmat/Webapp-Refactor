/* eslint-env node */
/**
 * The device drafts, as the reload round-trip suite (roundtrip.mjs) and the
 * lesson walkthrough (lessons.mjs) read them (milestone 1.4).
 *
 * Since 1.4 the editor no longer writes the live session to
 * localStorage['musicAtlas:daw:autosave']. It writes it to a draft in
 * IndexedDB ('ma-studio', src/lib/studio-projects/drafts/draftStore.ts),
 * debounced 1 s (at most 5 s after the first unwritten change), and, as a
 * tab is hidden, closed or frozen with memory ahead of the last commit, to a
 * synchronous localStorage mirror
 * ('musicAtlas:daw:mirror:<userKey>:<draftId>', draftMirror.ts). The tab's
 * draft is named in sessionStorage ('musicAtlas:daw:activeDraft'). The
 * editor exposes the autosave on window.__MA_DRAFTS__ under the dev auth
 * bypass (src/daw/persistence/drafts/devHandle.ts): status(), list(userKey),
 * readBody(id), flush(), mediaRestoring() and its constants. Every helper
 * here reads through that handle, so the harness never opens IndexedDB
 * itself.
 *
 *   await context.addInitScript(bootDraftSnapshot);   // before the editor loads
 *   const draft = await waitForDraft(page);           // { draftId, meta, text }
 *   const digest = await draftDigest(page);           // of the tab's draft
 *
 * bootDraftSnapshot runs at document start and reads ONLY synchronous
 * storage: the mirror keys and the sessionStorage pointer. It must never
 * open IndexedDB: opening without a version on a fresh device creates an
 * empty database, and a connection left open blocks the app's own upgrade
 * (versionchange).
 */

/** The tab's draft pointer (src/lib/studio-projects/drafts/activeDraft.ts). */
export const ACTIVE_DRAFT_KEY = 'musicAtlas:daw:activeDraft';
/** Every mirror key's prefix (src/lib/studio-projects/drafts/draftMirror.ts). */
export const MIRROR_PREFIX = 'musicAtlas:daw:mirror:';
/** The dev auth bypass's user and its draft namespace (encodeURIComponent). */
export const DEV_USER = 'dev-bypass-user';
export const DEV_USER_KEY = encodeURIComponent(DEV_USER);
/** How long the draft must stay caught up before it counts as written. */
export const DRAFT_QUIET_MS = 1500;

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * Init script (context.addInitScript): the draft storage as the document
 * found it, before the editor read or rewrote any of it, on
 * window.__RT_BOOT_DRAFT__ = { pointer, mirrors: [{ key, draftId, userKey,
 * baseSeq, writeSeq, at, chars, unreadable }] }. A mirror's session text is
 * left out (it can be a million characters); only its envelope is read.
 */
export function bootDraftSnapshot() {
  if (window !== window.top || window.__RT_BOOT_DRAFT__) return;
  const snapshot = { at: Date.now(), pointer: null, mirrors: [] };
  window.__RT_BOOT_DRAFT__ = snapshot;
  try {
    const raw = sessionStorage.getItem('musicAtlas:daw:activeDraft');
    snapshot.pointer = raw ? JSON.parse(raw) : null;
  } catch {
    snapshot.pointer = { unreadable: true };
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('musicAtlas:daw:mirror:')) continue;
      const raw = localStorage.getItem(key) ?? '';
      const entry = { key, chars: raw.length, unreadable: false };
      // The envelope comes before the session text: '{…,"session":<text>}'.
      const cut = raw.indexOf(',"session":');
      try {
        const head = JSON.parse(`${raw.slice(0, cut)}}`);
        Object.assign(entry, {
          v: head.v,
          draftId: head.draftId,
          userKey: head.userKey,
          baseSeq: head.baseSeq,
          writeSeq: head.writeSeq,
          at: head.at,
          contentHash: head.contentHash ?? null,
        });
      } catch {
        entry.unreadable = true;
      }
      snapshot.mirrors.push(entry);
    }
  } catch {
    // An opaque origin (about:blank) has no storage; the editor page does.
  }
}

/** The boot snapshot the page's init script took (bootDraftSnapshot). */
export const bootDraft = (page) =>
  page.evaluate(() => window.__RT_BOOT_DRAFT__ ?? null);

/**
 * The autosave's status as plain data: __MA_DRAFTS__.status() (draft id,
 * pending and committed change counters, writing, paused, error, mirror,
 * the pending media), plus whether draft media is being restored and the
 * open's phase (__MA_SESSION__). null before the editor exposes them.
 */
export const draftStatus = (page) =>
  page.evaluate(() => {
    const drafts = window.__MA_DRAFTS__;
    if (!drafts) return null;
    const status = { ...drafts.status() };
    const retry = status.retry;
    delete status.retry;
    const session = window.__MA_SESSION__?.getState() ?? null;
    return {
      ...status,
      retryable: typeof retry === 'function',
      mediaRestoring: drafts.mediaRestoring(),
      phase: session?.phase ?? null,
      sessionDraftId: session?.draftId ?? null,
      generation: session?.generation ?? null,
    };
  });

/** The user's drafts' metas, newest first (never another user's). */
export const listDrafts = (page, userKey = undefined) =>
  page.evaluate(async (key) => {
    const list = await window.__MA_DRAFTS__.list(key ?? undefined);
    return JSON.parse(JSON.stringify(list));
  }, userKey ?? null);

/** A draft's stored body text, or null. */
export const readDraftBody = (page, draftId) =>
  page.evaluate(
    async (id) => (await window.__MA_DRAFTS__.readBody(id))?.text ?? null,
    draftId,
  );

/**
 * In the page: whether the draft has caught up with the editor. The open
 * has settled ('ready'; 'idle' with nothing open; or 'failed', a failure
 * after the switch, whose kept or new empty draft is then the one that must
 * catch up), the session's draft
 * is the autosave's, writes run (not paused), every change the page made is
 * committed and nothing is being written, no pending media is in memory
 * only or being written, and no draft media is being restored. Returns the
 * reason it has not, or '' once it has.
 */
async function draftBehind() {
  const drafts = window.__MA_DRAFTS__;
  const session = window.__MA_SESSION__?.getState();
  if (!drafts || !session) return 'the editor has not exposed its drafts';
  if (!['ready', 'idle', 'failed'].includes(session.phase)) {
    return `the open is ${session.phase}`;
  }
  const st = drafts.status();
  if (!st.draftId) return 'no draft is active';
  if (st.draftId !== session.draftId)
    return 'the session and the autosave name other drafts';
  if (st.paused) return 'writes are paused';
  if (st.writing) return 'a write is running';
  if (st.pendingSeq !== st.committedSeq) {
    return `changes ${st.committedSeq + 1}..${st.pendingSeq} are not committed`;
  }
  if (st.media.writing > 0) return `${st.media.writing} media write(s) running`;
  if (st.media.pendingInMemory > 0) {
    return `${st.media.pendingInMemory} media item(s) only in memory`;
  }
  if (drafts.mediaRestoring()) return 'draft media is being restored';
  return '';
}

/**
 * In the page: the committed meta of the active draft holds the media the
 * page has stored (critique: a media write that lands after the last draft
 * write must still reach the meta). Returns the reason it does not, or ''.
 * It reads pendingMediaManifest() through the dev-module resolver
 * (fixtures/fingerprint.mjs installDevModules); a page without it, or a
 * failed import, is a reason too, never a silent pass.
 */
async function draftMediaBehind() {
  const id = window.__MA_DRAFTS__.status().draftId;
  const [meta] = (await window.__MA_DRAFTS__.list()).filter(
    (m) => m.draftId === id,
  );
  if (!meta) return 'the active draft has no record';
  const devModule = window.__RT_DEV_MODULE__;
  if (!devModule) {
    return 'cannot read pendingMediaManifest: the page has no dev-module resolver (installDevModules); pass requireMedia: false to skip the media check';
  }
  let manifest;
  try {
    const media = await devModule(
      '/src/daw/persistence/drafts/pendingMedia.ts',
    );
    manifest = media.pendingMediaManifest();
  } catch (error) {
    return `cannot read pendingMediaManifest: ${String(error).slice(0, 200)}`;
  }
  const ids = (refs) =>
    [...new Set((refs ?? []).map((r) => r.mediaId))].sort().join(',');
  if (ids(meta.media) !== ids(manifest.refs)) {
    return `the draft lists media [${ids(meta.media)}], the page has [${ids(manifest.refs)}]`;
  }
  if ((meta.mediaMissing ?? 0) !== (manifest.missing ?? 0)) {
    return `the draft counts ${meta.mediaMissing} missing, the page ${manifest.missing}`;
  }
  return '';
}

/**
 * Why the tab's draft has not caught up with the editor yet (draftBehind),
 * or '' once it has.
 */
export const draftBehindReason = (page) =>
  page.evaluate(draftBehind).catch((error) => String(error));

/**
 * Waits until the tab's draft has caught up with the editor (draftBehind)
 * and stayed so for `quietMs`, with the store still for as long (the watch's
 * lastWrite, when the page has one), and its meta lists the page's media.
 * Resolves to { draftId, meta, text }: the committed record and body.
 * With `allowMissing`, a draft that never catches up resolves to null
 * instead of throwing. The media check needs the page's dev-module resolver
 * (installDevModules): without one it fails, unless `requireMedia` is false
 * (a page that holds no pending audio, such as lessons.mjs's).
 */
export async function waitForDraft(
  page,
  {
    quietMs = DRAFT_QUIET_MS,
    timeout = 30_000,
    allowMissing = false,
    requireMedia = true,
  } = {},
) {
  const start = Date.now();
  let since = 0;
  let reason = '';
  for (;;) {
    reason = await page.evaluate(draftBehind).catch((e) => String(e));
    if (!reason) {
      const still = await page.evaluate(
        (quiet) => {
          const watch = window.__RT_WATCH__;
          return !watch || Date.now() - watch.lastWrite >= quiet;
        },
        Math.min(quietMs, 1000),
      );
      if (!still) reason = 'the store is still being written';
    }
    if (!reason) {
      since ||= Date.now();
      if (Date.now() - since >= quietMs) {
        reason = requireMedia
          ? await page.evaluate(draftMediaBehind).catch((e) => String(e))
          : '';
        if (reason.startsWith('cannot read pendingMediaManifest')) {
          throw new Error(`waitForDraft: ${reason}`);
        }
        if (!reason) {
          return page.evaluate(async () => {
            const drafts = window.__MA_DRAFTS__;
            const id = drafts.status().draftId;
            const meta = (await drafts.list()).find((m) => m.draftId === id);
            const body = await drafts.readBody(id);
            return {
              draftId: id,
              meta: JSON.parse(JSON.stringify(meta ?? null)),
              text: body?.text ?? null,
            };
          });
        }
        since = 0;
      }
    } else {
      since = 0;
    }
    if (Date.now() - start > timeout) {
      if (allowMissing) return null;
      throw new Error(`the draft never caught up: ${reason}`);
    }
    await sleep(150);
  }
}

/**
 * What a draft body holds of the student's work: the project name, the
 * chord-region count and, per track, its name, clip counts and note count.
 * A restore re-serialises the session, so two bodies of the same work may
 * differ as text (the view, the timestamp) while this is the same.
 */
export function bodySummary(text) {
  if (!text) return null;
  try {
    const { data } = JSON.parse(text);
    return {
      name: data.projectName ?? null,
      chordRegions: data.chordRegions?.length ?? 0,
      tracks: (data.tracks ?? []).map((t) => [
        t.name,
        t.midiClips?.length ?? 0,
        t.audioClips?.length ?? 0,
        (t.midiClips ?? []).reduce(
          (n, c) => n + (c.events?.notes?.length ?? 0),
          0,
        ),
      ]),
    };
  } catch {
    return { unreadable: true };
  }
}

/** FNV-1a (32-bit) of `text`, as 8 hex digits. */
function fnv(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Canonical JSON (sorted keys, undefined dropped). */
function canon(value) {
  if (Array.isArray(value)) return `[${value.map(canon).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canon(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * A body's digest: `hash`, of its parsed data without the view (how the
 * project was last seen, which a flush adds) and without the stamp, and the
 * `summary` (bodySummary). Two drafts of the same work have the same hash.
 */
export function bodyDigest(text) {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    const data = { ...(parsed.data ?? {}) };
    delete data.view;
    return { hash: fnv(canon(data)), summary: bodySummary(text) };
  } catch {
    return { hash: null, summary: { unreadable: true } };
  }
}

/** The digest (bodyDigest) of the tab's draft, or of `draftId`. */
export async function draftDigest(page, draftId = null) {
  const id =
    draftId ??
    (await page.evaluate(() => window.__MA_DRAFTS__?.status().draftId ?? null));
  if (!id) return null;
  return bodyDigest(await readDraftBody(page, id));
}
