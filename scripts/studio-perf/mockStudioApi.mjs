/* eslint-env node */
/**
 * An in-memory Studio projects API for the reload round-trip suite
 * (roundtrip.mjs), installed into a Playwright browser context with
 * context.route so the editor's real save and open code runs against it:
 *
 *   const api = createMockStudioApi({ mode: 'legacy' });
 *   const assetId = api.seedAsset({ bytes, contentType: 'audio/wav' });
 *   const projectId = api.seedProject({ name: 'Earlier work' });
 *   await api.install(context);   // before the editor loads
 *
 * One instance can serve several contexts, so a project saved in one page
 * opens in a fresh one (a cloud save → open on another device).
 *
 * It intercepts requests to /api/studio/projects and /api/studio/assets (on
 * any host: the editor's base is VITE_MUSIC_ATLAS_API_URL, plus /api, see
 * src/lib/studio-projects/api.ts and src/lib/studio-assets/api.ts), and the
 * signed bucket URLs it hands out itself (on STORAGE_ORIGIN). Everything
 * else, including the rest of /api/studio, goes to the network untouched.
 *
 * Mode 'legacy' is today's contract, as the client sends and reads it:
 *
 *   GET    /api/studio/projects                 summaries
 *   POST   /api/studio/projects                 create (full project)
 *   GET    /api/studio/projects/:id             detail
 *   PUT    /api/studio/projects/:id             full replace of the track tree
 *   PATCH  /api/studio/projects/:id/meta        Library filing tags only
 *   DELETE /api/studio/projects/:id             soft delete
 *   POST   /api/studio/projects/:id/cleanup-pending-assets
 *   POST   /api/studio/assets                   reserve an upload
 *   PUT    <signedUploadUrl>                    the bytes (bucket)
 *   POST   /api/studio/assets/:id/finalize      mark ready
 *   GET    /api/studio/assets/:id/url           signed download URL
 *   POST   /api/studio/assets/status            { missing, notReady }
 *   GET    <download url>                       the bytes (bucket)
 *
 * Like the real API, 2xx bodies are SuperJSON (the client parses them with
 * SuperJSON.parse, which reads a plain-JSON body as undefined) and errors
 * are plain JSON { error }. What the mock models of the server, because the
 * round trips depend on it:
 *
 * - by default it keeps the fields the client's request types declare, and
 *   only those (CloudProjectInput in SessionSerializer.ts: name,
 *   composerName, bpm, prism {rootNote, rhythmName, genre, swing}, returns,
 *   and per track the mixer fields, activeEffects, the opaque settings
 *   blob, columnar midiClips and asset-backed audioClips);
 * - a MIDI clip keeps its id, name and startTick and its five note columns
 *   (notes, velocities, startTickDeltas, durations, channels): the shape
 *   music-atlas-api declares for it (MidiClipColumnar, which
 *   src/lib/studio-projects/api.ts mirrors) and the only one a server that
 *   validates its input plausibly keeps. Anything else a client puts there
 *   (a column only the local draft has: note ids, a clip length, CC data)
 *   is dropped, so the round trip never shows such a field as carried by
 *   today's cloud until milestone 1.5's document carries it. That the real
 *   API stores midiClips exactly so is an assumption no one has checked
 *   against the server yet;
 * - it stores each track's settings blob and the project's returns as
 *   sent, although the shapes api.ts mirrors declare neither. Much of what a
 *   cloud open brings back rides in settings: the track's saved id
 *   (sourceTrackId, decision D4), its effects, its instrument state and its
 *   Oracle patch. So what R3 shows as kept assumes the real API keeps them
 *   too, which is also unchecked. With `strictShape` the mock keeps only
 *   what api.ts declares (no settings, no returns), which shows what a cloud
 *   open would lose if the API kept no more (roundtrip.mjs --strict-api);
 * - it mints new track and audio-clip row ids on every write, ordinal by
 *   position, as a full replace does. The R3 id results do not hang on
 *   this: the client sends no row id on save, loads each track under the
 *   id it saved in the settings blob (settings.sourceTrackId) and mints
 *   audio-clip ids on open (deserializeCloudProject), and roundtrip.mjs
 *   records how many reopened track ids are the mock's (none) and how many
 *   the saved ones. Whether the real API keeps row ids across a PUT is
 *   unchecked: the local music-atlas-api checkout predates the Studio
 *   routes;
 * - a write that references an audio asset that is missing or not ready is
 *   refused (the server's assertAudioAssetsReady);
 * - projects have an owner: the student the request's bearer token names
 *   (ownerOfToken: the dev bypass's 'dev-bypass-token' is
 *   'dev-bypass-user', and harness.mjs asUser serves another student
 *   'dev-bypass-token:<userId>'). The list holds only the caller's projects,
 *   and another student's project answers 404 to GET, PUT, PATCH, DELETE and
 *   cleanup, as a server that scopes by owner does, so two students on one
 *   device (R22, the '~device' claim) never see each other's cloud work. A
 *   request with no bearer token answers 401. seedProject takes `owner`
 *   (default the bypass user). Assets are not owner-scoped, and no session
 *   is checked (any token is accepted), nor are size limits;
 * - by default an asset is reserved for any projectId, even a deleted or
 *   missing project's, and a deleted project's assets stay. With
 *   `rejectAssetsForDeletedProjects`, POST /assets answers 404 when its
 *   projectId names a project that is missing, deleted or another
 *   student's (as GET does), and a project delete (the DELETE route or
 *   deleteProject) reclaims the project's assets, so an upload that races a
 *   delete elsewhere sees the 404 a save restarts from (R17).
 *
 * Faults (milestone 1.4): `fault({ method, path, status | abort | body |
 * delayMs, times })` makes the next `times` requests (default every one)
 * that match `method` (any when left out) and `path` (a substring of the URL
 * path, or a RegExp) wait `delayMs`, then fail with `status` (a plain JSON
 * error, as the API sends one), be aborted with the network error `abort`
 * (Playwright route.abort: 'internetdisconnected', 'failed', 'timedout',
 * …), or be answered with `body` (a SuperJSON 2xx body, `status` or 200: a
 * payload the client cannot use, such as a project whose tracks are not a
 * list), or, with only a delay, go on to the route as usual. `clearFaults()` drops them.
 * Offline is an abort fault ('internetdisconnected') together with
 * context.setOffline(true): setOffline flips navigator.onLine and fires
 * 'offline', but a routed request is still fulfilled under it, so without the
 * fault an offline save would succeed; setOffline(false) then fires 'online'.
 * A faulted request is logged with `fault: true` (and `aborted` or its
 * status) and never counts as a write.
 *
 * Mode 'document' is the milestone 1.5 contract (plan.md 1.5: a `document`
 * JSONB field with `documentSchema`, `revision` and `writtenAtRevision`,
 * unknown fields preserved on PUT, 409 on an older schema or a revision
 * conflict). It is designed in 1.5 together with music-atlas-api, so it is
 * deliberately not guessed here: asking for it throws
 * MockModeNotImplemented, which roundtrip.mjs reports as a skipped scenario.
 * Implement it by adding a `document` entry to ROUTES.
 */
import { randomUUID } from 'node:crypto';
import SuperJSON from 'superjson';

export const API_MODES = ['legacy', 'document'];

/** Where the mock's signed bucket URLs point (never resolved: intercepted). */
export const STORAGE_ORIGIN = 'https://storage.studio-perf.invalid';

const API_PREFIX = '/api/studio';
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Thrown for a mode whose contract does not exist yet. */
export class MockModeNotImplemented extends Error {
  constructor(mode) {
    super(
      `mock Studio API mode "${mode}" is the milestone 1.5 contract and is not implemented yet`,
    );
    this.name = 'MockModeNotImplemented';
    this.mode = mode;
  }
}

/** The dev auth bypass's own student and token (src/auth/devBypass.ts). */
export const DEV_OWNER = 'dev-bypass-user';
const DEV_TOKEN = 'dev-bypass-token';

/**
 * The student a bearer token names: the bypass's token is its user, and
 * 'dev-bypass-token:<userId>' (harness.mjs asUser) is <userId>. Any other
 * token is its own owner. null without a bearer token.
 */
export function ownerOfToken(authorization) {
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  if (!match) return null;
  const token = match[1].trim();
  if (token === DEV_TOKEN) return DEV_OWNER;
  if (token.startsWith(`${DEV_TOKEN}:`)) {
    return token.slice(DEV_TOKEN.length + 1) || DEV_OWNER;
  }
  return token;
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const pick = (source, keys) =>
  Object.fromEntries(keys.map((key) => [key, source?.[key] ?? null]));

/** `source`'s own `keys`, and nothing else (a missing key stays missing). */
const keepOnly = (source, keys) =>
  Object.fromEntries(
    keys
      .filter((key) => source && Object.hasOwn(source, key))
      .map((key) => [key, source[key]]),
  );

/** What a stored MIDI clip keeps (see the header). */
const MIDI_CLIP_KEYS = ['id', 'name', 'startTick'];
const MIDI_NOTE_COLUMNS = [
  'notes',
  'velocities',
  'startTickDeltas',
  'durations',
  'channels',
];

/**
 * Drops every asset of project `projectId` (a delete that reclaims them,
 * `rejectAssetsForDeletedProjects`). Returns how many went.
 */
function reclaimProjectAssets(assets, projectId) {
  let reclaimed = 0;
  for (const [id, asset] of assets) {
    if (asset.projectId === projectId) {
      assets.delete(id);
      reclaimed += 1;
    }
  }
  return reclaimed;
}

const storedMidiClip = (clip) => ({
  ...keepOnly(clip, MIDI_CLIP_KEYS),
  events: keepOnly(clip?.events, MIDI_NOTE_COLUMNS),
});

function corsHeaders() {
  // No credentials are sent, so `*` is allowed; Authorization still has to
  // be named explicitly for the preflight to pass.
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers':
      'authorization,content-type,x-app-session,x-goog-content-length-range',
    'access-control-max-age': '600',
  };
}

/**
 * The legacy (today's) contract: route table over the shared state. With
 * `strictShape`, a write keeps only what api.ts declares; with
 * `rejectAssetsForDeletedProjects`, assets follow their project's life (see
 * the header).
 */
function legacyRoutes(state, { strictShape, rejectAssetsForDeletedProjects }) {
  const { projects, assets } = state;

  // Another owner's project is as missing as a deleted one (no leak of
  // whether it exists).
  const live = (id, owner) => {
    const project = projects.get(id);
    if (!project || project.deletedAt || project.owner !== owner) {
      throw new HttpError(404, `Studio project ${id} not found`);
    }
    return project;
  };

  const summary = (p) => ({
    id: p.id,
    name: p.name,
    composerName: p.composerName,
    bpm: p.bpm,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    libraryGenre: p.libraryGenre,
    libraryStatus: p.libraryStatus,
    libraryInstruments: p.libraryInstruments,
    collaborators: p.collaborators,
  });

  const detail = (p) => ({
    ...summary(p),
    prism: p.prism,
    ...(Object.hasOwn(p, 'returns') ? { returns: p.returns } : {}),
    tracks: p.tracks,
  });

  const assertAssetsReady = (input) => {
    for (const track of input.tracks ?? []) {
      for (const clip of track.audioClips ?? []) {
        const asset = assets.get(clip.assetId);
        if (!asset || asset.uploadStatus !== 'ready') {
          throw new HttpError(400, `Audio asset ${clip.assetId} is not ready`);
        }
      }
    }
  };

  // A full write: the project row's scalar fields plus a new track tree.
  const write = (input, existing, owner) => {
    if (!input || typeof input.name !== 'string' || !input.tracks) {
      throw new HttpError(400, 'Invalid project body');
    }
    assertAssetsReady(input);
    const now = new Date();
    return {
      id: existing?.id ?? randomUUID(),
      owner: existing?.owner ?? owner,
      name: input.name,
      composerName: input.composerName ?? null,
      bpm: input.bpm,
      prism: pick(input.prism, ['rootNote', 'rhythmName', 'genre', 'swing']),
      ...(strictShape ? {} : { returns: input.returns ?? null }),
      tracks: input.tracks.map((t, ordinal) => ({
        id: randomUUID(),
        ordinal,
        ...pick(t, [
          'name',
          'type',
          'instrument',
          'color',
          'mute',
          'solo',
          'volume',
          'pan',
        ]),
        activeEffects: t.activeEffects ?? [],
        ...(strictShape ? {} : { settings: t.settings ?? null }),
        midiClips: (t.midiClips ?? []).map(storedMidiClip),
        audioClips: (t.audioClips ?? []).map((c) => ({
          id: randomUUID(),
          assetId: c.assetId,
          startTick: c.startTick,
          duration: c.duration,
          offsetSeconds: c.offsetSeconds ?? 0,
          gain: c.gain ?? 1,
          fadeInTicks: c.fadeInTicks ?? 0,
          fadeOutTicks: c.fadeOutTicks ?? 0,
        })),
      })),
      libraryGenre: existing?.libraryGenre ?? null,
      libraryStatus: existing?.libraryStatus ?? null,
      libraryInstruments: existing?.libraryInstruments ?? [],
      collaborators: existing?.collaborators ?? [],
      createdAt: existing?.createdAt ?? now,
      // A strictly later stamp than the one it replaces: two writes in the
      // same millisecond must still read as a change (E11 compares them).
      updatedAt:
        existing?.updatedAt && existing.updatedAt.getTime() >= now.getTime()
          ? new Date(existing.updatedAt.getTime() + 1)
          : now,
      deletedAt: null,
    };
  };

  const assetSummary = (a) => ({
    id: a.id,
    projectId: a.projectId,
    bucketKey: a.bucketKey,
    contentType: a.contentType,
    sizeBytes: a.sizeBytes,
    durationSeconds: a.durationSeconds,
    sampleRate: a.sampleRate,
    channels: a.channels,
    originalName: a.originalName,
    source: a.source,
    sourceUrl: a.sourceUrl,
    checksumSha256: a.checksumSha256,
    uploadStatus: a.uploadStatus,
    createdAt: a.createdAt,
  });

  const projectsPath = `${API_PREFIX}/projects`;
  const assetsPath = `${API_PREFIX}/assets`;
  const ID = '([^/]+)';

  return [
    [
      'GET',
      `^${projectsPath}$`,
      ({ owner }) =>
        [...projects.values()]
          .filter((p) => !p.deletedAt && p.owner === owner)
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map(summary),
    ],
    [
      'POST',
      `^${projectsPath}$`,
      ({ body, owner }) => {
        const project = write(body, null, owner);
        projects.set(project.id, project);
        return detail(project);
      },
    ],
    [
      'GET',
      `^${projectsPath}/${ID}$`,
      ({ params, owner }) => detail(live(params[0], owner)),
    ],
    [
      'PUT',
      `^${projectsPath}/${ID}$`,
      ({ params, body, owner }) => {
        const project = write(body, live(params[0], owner), owner);
        projects.set(project.id, project);
        return detail(project);
      },
    ],
    [
      'PATCH',
      `^${projectsPath}/${ID}/meta$`,
      ({ params, body, owner }) => {
        const project = live(params[0], owner);
        for (const key of [
          'libraryGenre',
          'libraryStatus',
          'libraryInstruments',
          'collaborators',
        ]) {
          if (body?.[key] !== undefined) project[key] = body[key];
        }
        return pick(project, [
          'libraryGenre',
          'libraryStatus',
          'libraryInstruments',
          'collaborators',
        ]);
      },
    ],
    [
      'DELETE',
      `^${projectsPath}/${ID}$`,
      ({ params, owner }) => {
        const project = live(params[0], owner);
        project.deletedAt = new Date();
        if (rejectAssetsForDeletedProjects) {
          reclaimProjectAssets(assets, project.id);
        }
        return { id: project.id, deletedAt: project.deletedAt };
      },
    ],
    [
      'POST',
      `^${projectsPath}/${ID}/cleanup-pending-assets$`,
      ({ params, owner }) => {
        // A deleted project's pending assets can still be cleaned up.
        if (projects.get(params[0])?.owner !== owner) {
          throw new HttpError(404, `Studio project ${params[0]} not found`);
        }
        let deletedRows = 0;
        for (const [id, asset] of assets) {
          if (
            asset.projectId === params[0] &&
            asset.uploadStatus === 'pending'
          ) {
            assets.delete(id);
            deletedRows += 1;
          }
        }
        return { deletedRows, bucketDeleteFailures: 0 };
      },
    ],
    [
      'POST',
      `^${assetsPath}/status$`,
      ({ body }) => {
        const ids = body?.assetIds ?? [];
        return {
          missing: ids.filter((id) => !assets.has(id)),
          notReady: ids.filter(
            (id) => assets.has(id) && assets.get(id).uploadStatus !== 'ready',
          ),
        };
      },
    ],
    [
      'POST',
      `^${assetsPath}$`,
      ({ body, owner }) => {
        // The project must be the caller's and live (live() throws the 404).
        if (rejectAssetsForDeletedProjects && body?.projectId != null) {
          live(body.projectId, owner);
        }
        const id = randomUUID();
        const asset = {
          id,
          projectId: body?.projectId ?? null,
          bucketKey: `studio/${body?.projectId ?? 'none'}/${id}`,
          contentType: body?.contentType ?? 'application/octet-stream',
          sizeBytes: body?.sizeBytes ?? 0,
          durationSeconds: 0,
          sampleRate: null,
          channels: null,
          originalName: body?.originalName ?? null,
          source: body?.source ?? 'upload',
          sourceUrl: body?.sourceUrl ?? null,
          checksumSha256: body?.checksumSha256 ?? null,
          uploadStatus: 'pending',
          createdAt: new Date(),
          bytes: null,
        };
        assets.set(id, asset);
        return {
          assetId: id,
          bucketKey: asset.bucketKey,
          signedUploadUrl: `${STORAGE_ORIGIN}/upload/${id}`,
          expiresAt: new Date(Date.now() + 15 * 60_000),
          maxUploadBytes: MAX_UPLOAD_BYTES,
        };
      },
    ],
    [
      'POST',
      `^${assetsPath}/${ID}/finalize$`,
      ({ params, body }) => {
        const asset = assets.get(params[0]);
        if (!asset) throw new HttpError(404, `Asset ${params[0]} not found`);
        if (!asset.bytes) {
          throw new HttpError(409, `Asset ${params[0]} has no uploaded bytes`);
        }
        asset.uploadStatus = 'ready';
        asset.durationSeconds = body?.durationSeconds ?? asset.durationSeconds;
        asset.sampleRate = body?.sampleRate ?? asset.sampleRate;
        asset.channels = body?.channels ?? asset.channels;
        return assetSummary(asset);
      },
    ],
    [
      'GET',
      `^${assetsPath}/${ID}/url$`,
      ({ params }) => {
        const asset = assets.get(params[0]);
        if (!asset || asset.uploadStatus !== 'ready') {
          throw new HttpError(404, `Asset ${params[0]} not found`);
        }
        return {
          url: `${STORAGE_ORIGIN}/download/${asset.id}`,
          expiresAt: new Date(Date.now() + 15 * 60_000),
        };
      },
    ],
  ].map(([method, pattern, handle]) => ({
    method,
    pattern: new RegExp(pattern),
    handle,
  }));
}

/** Route tables per mode; `document` arrives with milestone 1.5. */
const ROUTES = { legacy: legacyRoutes };

/**
 * A fresh mock. `mode` is 'legacy' (today's contract) or 'document' (not
 * implemented yet: throws MockModeNotImplemented). `strictShape` keeps only
 * what api.ts declares of a project, and `rejectAssetsForDeletedProjects`
 * refuses an asset for a project that is gone and reclaims a deleted
 * project's assets (see the header).
 */
export function createMockStudioApi({
  mode = 'legacy',
  strictShape = false,
  rejectAssetsForDeletedProjects = false,
} = {}) {
  if (!API_MODES.includes(mode)) {
    throw new Error(`unknown mock Studio API mode "${mode}"`);
  }
  if (!ROUTES[mode]) throw new MockModeNotImplemented(mode);

  const state = { projects: new Map(), assets: new Map() };
  const routes = ROUTES[mode](state, {
    strictShape,
    rejectAssetsForDeletedProjects,
  });
  const log = [];
  const writes = [];
  /** Active faults, in the order they were added (fault()). */
  let faults = [];

  const record = (entry) => {
    log.push({ at: Date.now(), ...entry });
  };

  /** The first fault that matches the request, with a use left, or null. */
  const takeFault = (method, path) => {
    const found = faults.find(
      (f) =>
        f.left > 0 &&
        (!f.method || f.method === method) &&
        (f.path instanceof RegExp ? f.path.test(path) : path.includes(f.path)),
    );
    if (found) found.left -= 1;
    return found ?? null;
  };

  /**
   * Applies a fault to a request: waits its delay, then aborts or fails it.
   * Resolves true when the request was answered (aborted or failed), false
   * when it goes on to the route as usual (a delay alone).
   */
  async function applyFault(fault, route, method, path) {
    if (fault.delayMs > 0) {
      await new Promise((done) => setTimeout(done, fault.delayMs));
    }
    if (fault.abort) {
      record({ method, path, status: 0, fault: true, aborted: fault.abort });
      await route.abort(fault.abort).catch(() => {});
      return true;
    }
    if (fault.body !== undefined) {
      const status = fault.status || 200;
      record({ method, path, status, fault: true, body: true });
      await route
        .fulfill({
          status,
          headers: { ...corsHeaders(), 'content-type': 'application/json' },
          body: SuperJSON.stringify(fault.body),
        })
        .catch(() => {});
      return true;
    }
    if (fault.status) {
      record({ method, path, status: fault.status, fault: true });
      await route
        .fulfill({
          status: fault.status,
          headers: { ...corsHeaders(), 'content-type': 'application/json' },
          body: JSON.stringify({ error: `mock fault ${fault.status}` }),
        })
        .catch(() => {});
      return true;
    }
    return false;
  }

  async function handleStorage(route, request, url) {
    const [, action, id] = url.pathname.split('/');
    const asset = state.assets.get(id);
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders() });
    }
    const fault = takeFault(request.method(), url.pathname);
    if (
      fault &&
      (await applyFault(fault, route, request.method(), url.pathname))
    ) {
      return undefined;
    }
    if (action === 'upload' && request.method() === 'PUT' && asset) {
      asset.bytes = request.postDataBuffer() ?? Buffer.alloc(0);
      record({ method: 'PUT', path: url.pathname, status: 200 });
      return route.fulfill({ status: 200, headers: corsHeaders(), body: '' });
    }
    if (action === 'download' && request.method() === 'GET' && asset?.bytes) {
      record({ method: 'GET', path: url.pathname, status: 200 });
      return route.fulfill({
        status: 200,
        headers: { ...corsHeaders(), 'content-type': asset.contentType },
        body: asset.bytes,
      });
    }
    record({ method: request.method(), path: url.pathname, status: 404 });
    return route.fulfill({ status: 404, headers: corsHeaders(), body: '' });
  }

  async function handle(route) {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === STORAGE_ORIGIN) {
      return handleStorage(route, request, url);
    }
    const method = request.method();
    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders() });
    }
    // A base that already ends in /api resolves to this same path.
    const path = url.pathname;
    const fault = takeFault(method, path);
    if (fault && (await applyFault(fault, route, method, path))) {
      return undefined;
    }
    const owner = ownerOfToken(request.headers().authorization);
    if (!owner && path.startsWith(`${API_PREFIX}/projects`)) {
      record({ method, path, status: 401, error: 'no bearer token' });
      return route.fulfill({
        status: 401,
        headers: { ...corsHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }
    let body;
    try {
      const text = request.postData();
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }
    for (const r of routes) {
      if (r.method !== method) continue;
      const match = r.pattern.exec(path);
      if (!match) continue;
      try {
        const result = r.handle({ params: match.slice(1), body, owner });
        if (method !== 'GET') writes.push({ method, path, body, owner });
        record({ method, path, status: 200, owner });
        return route.fulfill({
          status: 200,
          headers: { ...corsHeaders(), 'content-type': 'application/json' },
          body: SuperJSON.stringify(result),
        });
      } catch (error) {
        const status = error instanceof HttpError ? error.status : 500;
        record({ method, path, status, owner, error: error.message });
        return route.fulfill({
          status,
          headers: { ...corsHeaders(), 'content-type': 'application/json' },
          body: JSON.stringify({ error: error.message }),
        });
      }
    }
    record({ method, path, status: 404 });
    return route.fulfill({
      status: 404,
      headers: { ...corsHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ error: `No mock route for ${method} ${path}` }),
    });
  }

  return {
    mode,
    strictShape,
    rejectAssetsForDeletedProjects,
    /** project id → stored project (as the server would hold it). */
    projects: state.projects,
    /** asset id → asset row, with its bytes. */
    assets: state.assets,
    /** Every intercepted request: { at, method, path, status, owner?, error? }. */
    log,
    /** Every successful non-GET API call with its parsed body. */
    writes,

    /**
     * A ready asset holding `bytes`, as if uploaded and finalized earlier.
     * Returns its id.
     */
    seedAsset({
      bytes,
      contentType = 'audio/wav',
      durationSeconds = 1,
      sampleRate = null,
      channels = null,
      originalName = 'seeded.wav',
      projectId = null,
    }) {
      const id = randomUUID();
      state.assets.set(id, {
        id,
        projectId,
        bucketKey: `studio/${projectId ?? 'seed'}/${id}`,
        contentType,
        sizeBytes: bytes.length,
        durationSeconds,
        sampleRate,
        channels,
        originalName,
        source: 'upload',
        sourceUrl: null,
        checksumSha256: null,
        uploadStatus: 'ready',
        createdAt: new Date(),
        bytes,
      });
      return id;
    },

    /**
     * A project, as if a client had created it earlier (through the create
     * route itself, though no request is logged), for a session that needs
     * a cloud link the mock can answer for. `detail` is a project body as
     * the client sends one (name, bpm, composerName, prism, returns,
     * tracks); by default a project with no tracks. `owner` is the student
     * it belongs to (default the dev bypass's user; asUser's userId for
     * another). Returns its id.
     */
    seedProject({ owner = DEV_OWNER, ...detail } = {}) {
      const create = routes.find(
        (r) => r.method === 'POST' && r.pattern.test(`${API_PREFIX}/projects`),
      );
      const project = create.handle({
        params: [],
        owner,
        body: {
          name: 'Seeded project',
          bpm: 120,
          prism: { rootNote: null, rhythmName: '', genre: '', swing: 0 },
          tracks: [],
          ...detail,
        },
      });
      return project.id;
    },

    /**
     * Another device's save of project `id`: the stored project with
     * `changes` (fields of the stored row, e.g. a name or a bpm) and a new
     * updatedAt, as a PUT from elsewhere leaves it. No request is logged.
     */
    touchProject(id, changes = {}) {
      const project = state.projects.get(id);
      if (!project || project.deletedAt) {
        throw new Error(`mock: no live project ${id}`);
      }
      Object.assign(project, changes, {
        updatedAt: new Date(
          Math.max(Date.now(), project.updatedAt.getTime() + 1),
        ),
      });
      return project.updatedAt;
    },

    /**
     * Deletes project `id` as another device would (a soft delete: GET and
     * PUT then answer 404, and the list leaves it out; with
     * `rejectAssetsForDeletedProjects` its assets go too, and a new one for
     * it is refused). No request is logged.
     */
    deleteProject(id) {
      const project = state.projects.get(id);
      if (project) {
        project.deletedAt = new Date();
        if (rejectAssetsForDeletedProjects) {
          reclaimProjectAssets(state.assets, id);
        }
      }
      return Boolean(project);
    },

    /**
     * Fails, answers or delays requests (see the header): { method?, path,
     * status? | abort? | body?, delayMs?, times? }. Returns a function that
     * removes it.
     */
    fault({
      method = null,
      path,
      status = 0,
      abort = null,
      body = undefined,
      delayMs = 0,
      times = Infinity,
    }) {
      if (!path)
        throw new Error('mock fault: give it a path (substring or RegExp)');
      const entry = {
        method: method ? method.toUpperCase() : null,
        path,
        status,
        abort,
        body,
        delayMs,
        left: times,
      };
      faults.push(entry);
      return () => {
        faults = faults.filter((f) => f !== entry);
      };
    },

    /**
     * The offline fault: every Studio API and bucket request is aborted as
     * a disconnected network aborts it. Use it with context.setOffline(true)
     * (roundtrip.mjs setOffline does both). Returns the remover.
     */
    offlineFault() {
      return this.fault({
        path: /^\/(api\/studio\/|upload\/|download\/)/,
        abort: 'internetdisconnected',
      });
    },

    /** Drops every fault. */
    clearFaults() {
      faults = [];
    },

    /** The API requests (not the bucket's) logged since index `from`. */
    requestsSince(from = 0) {
      return log.slice(from).filter((l) => l.path.startsWith(API_PREFIX));
    },

    /** Installs the routes on a BrowserContext (or a Page). */
    async install(target) {
      // Only the two families it models; the rest of /api/studio (collab
      // TURN credentials, …) goes to the network as it would without it.
      await target.route(
        (url) =>
          url.origin === STORAGE_ORIGIN ||
          /^\/api\/studio\/(projects|assets)(\/|$)/.test(url.pathname),
        handle,
      );
    },
  };
}
