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
 * - it does not model auth (any bearer token is accepted), asset ownership
 *   or size limits.
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
 * `strictShape`, a write keeps only what api.ts declares (see the header).
 */
function legacyRoutes(state, { strictShape }) {
  const { projects, assets } = state;

  const live = (id) => {
    const project = projects.get(id);
    if (!project || project.deletedAt) {
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
  const write = (input, existing) => {
    if (!input || typeof input.name !== 'string' || !input.tracks) {
      throw new HttpError(400, 'Invalid project body');
    }
    assertAssetsReady(input);
    const now = new Date();
    return {
      id: existing?.id ?? randomUUID(),
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
      updatedAt: now,
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
      () =>
        [...projects.values()]
          .filter((p) => !p.deletedAt)
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map(summary),
    ],
    [
      'POST',
      `^${projectsPath}$`,
      ({ body }) => {
        const project = write(body, null);
        projects.set(project.id, project);
        return detail(project);
      },
    ],
    ['GET', `^${projectsPath}/${ID}$`, ({ params }) => detail(live(params[0]))],
    [
      'PUT',
      `^${projectsPath}/${ID}$`,
      ({ params, body }) => {
        const project = write(body, live(params[0]));
        projects.set(project.id, project);
        return detail(project);
      },
    ],
    [
      'PATCH',
      `^${projectsPath}/${ID}/meta$`,
      ({ params, body }) => {
        const project = live(params[0]);
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
      ({ params }) => {
        const project = live(params[0]);
        project.deletedAt = new Date();
        return { id: project.id, deletedAt: project.deletedAt };
      },
    ],
    [
      'POST',
      `^${projectsPath}/${ID}/cleanup-pending-assets$`,
      ({ params }) => {
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
      ({ body }) => {
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
 * what api.ts declares of a project (see the header).
 */
export function createMockStudioApi({
  mode = 'legacy',
  strictShape = false,
} = {}) {
  if (!API_MODES.includes(mode)) {
    throw new Error(`unknown mock Studio API mode "${mode}"`);
  }
  if (!ROUTES[mode]) throw new MockModeNotImplemented(mode);

  const state = { projects: new Map(), assets: new Map() };
  const routes = ROUTES[mode](state, { strictShape });
  const log = [];
  const writes = [];

  const record = (entry) => {
    log.push({ at: Date.now(), ...entry });
  };

  async function handleStorage(route, request, url) {
    const [, action, id] = url.pathname.split('/');
    const asset = state.assets.get(id);
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders() });
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
        const result = r.handle({ params: match.slice(1), body });
        if (method !== 'GET') writes.push({ method, path, body });
        record({ method, path, status: 200 });
        return route.fulfill({
          status: 200,
          headers: { ...corsHeaders(), 'content-type': 'application/json' },
          body: SuperJSON.stringify(result),
        });
      } catch (error) {
        const status = error instanceof HttpError ? error.status : 500;
        record({ method, path, status, error: error.message });
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
    /** project id → stored project (as the server would hold it). */
    projects: state.projects,
    /** asset id → asset row, with its bytes. */
    assets: state.assets,
    /** Every intercepted request: { at, method, path, status, error? }. */
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
     * A project with no tracks, as if a client had created it earlier
     * (through the create route itself, though no request is logged), for a
     * session that needs a cloud link the mock can answer for. Returns its
     * id.
     */
    seedProject({ name = 'Seeded project', bpm = 120 } = {}) {
      const create = routes.find(
        (r) => r.method === 'POST' && r.pattern.test(`${API_PREFIX}/projects`),
      );
      const project = create.handle({
        params: [],
        body: {
          name,
          bpm,
          prism: { rootNote: null, rhythmName: '', genre: '', swing: 0 },
          tracks: [],
        },
      });
      return project.id;
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
