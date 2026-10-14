/* eslint-env node */
/**
 * The mock Studio API's two modes against milestone 1.5's contract
 * (docs/studio-cloud-document-contract.md): the round-trip suite's R3 runs
 * the editor against them, so they must say exactly what the contract says.
 *
 * Run: npx vitest run scripts/studio-perf/__tests__/mockStudioApi.test.mjs
 */
import SuperJSON from 'superjson';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMockStudioApi, MAX_DOCUMENT_BYTES } from '../mockStudioApi.mjs';

/** The mock's request handler, through a stand-in for context.route. */
async function handlerOf(api) {
  let handle = null;
  await api.install({
    route: async (_match, fn) => {
      handle = fn;
    },
  });
  return (method, path, body) =>
    new Promise((resolve) => {
      handle({
        request: () => ({
          url: () => `https://api.test${path}`,
          method: () => method,
          headers: () => ({ authorization: 'Bearer dev-bypass-token' }),
          postData: () => (body === undefined ? null : JSON.stringify(body)),
        }),
        fulfill: async ({ status, body: text }) =>
          resolve({
            status,
            body: !text
              ? null
              : status < 300
                ? SuperJSON.parse(text)
                : JSON.parse(text),
          }),
        abort: async () => resolve({ status: 0, body: null }),
      });
    });
}

const PROJECTS = '/api/studio/projects';
const project = (extra = {}) => ({
  name: 'Tune',
  bpm: 100,
  prism: { rootNote: 2, rhythmName: '', genre: '', swing: 0 },
  tracks: [
    {
      name: 'Keys',
      type: 'midi',
      instrument: 'piano-sampler',
      color: '#fff',
      mute: false,
      solo: false,
      volume: 0.8,
      pan: 0,
      activeEffects: [],
      settings: { sourceTrackId: 't1' },
      midiClips: [],
      audioClips: [],
    },
  ],
  ...extra,
});
const DOC = { schema: 3, compat: 3, trackIds: ['t1'], clips: {}, mode: 'x' };

describe('the legacy mode', () => {
  it('ignores the document fields and returns none', async () => {
    const call = await handlerOf(createMockStudioApi({ mode: 'legacy' }));
    const created = await call('POST', PROJECTS, project({ document: DOC }));
    expect(created.status).toBe(200);
    expect('document' in created.body).toBe(false);
    expect(created.body.revision).toBeUndefined();
    const put = await call('PUT', `${PROJECTS}/${created.body.id}`, {
      ...project(),
      baseRevision: 99,
    });
    expect(put.status).toBe(200);
  });

  it('keeps the interim fallback in the settings blob', async () => {
    const call = await handlerOf(createMockStudioApi({ mode: 'legacy' }));
    const body = project();
    body.tracks[0].settings.projectDoc = DOC;
    const created = await call('POST', PROJECTS, body);
    expect(created.body.tracks[0].settings.projectDoc).toEqual(DOC);
  });
});

describe('the document mode', () => {
  let api;
  let call;
  beforeEach(async () => {
    api = createMockStudioApi({ mode: 'document' });
    call = await handlerOf(api);
  });

  it('always returns the document key, null until one is sent', async () => {
    const created = await call('POST', PROJECTS, project());
    expect(created.body).toMatchObject({
      document: null,
      documentSchema: null,
      revision: 1,
      writtenAtRevision: null,
    });
  });

  it('stores the document as sent and bumps the revision on every write', async () => {
    const created = await call(
      'POST',
      PROJECTS,
      project({ document: DOC, documentSchema: 3 }),
    );
    expect(created.body).toMatchObject({
      document: DOC,
      documentSchema: 3,
      revision: 1,
      writtenAtRevision: 1,
    });
    const id = created.body.id;
    const put = await call('PUT', `${PROJECTS}/${id}`, {
      ...project({ document: { ...DOC, mode: 'y' }, documentSchema: 3 }),
      baseRevision: 1,
    });
    expect(put.body).toMatchObject({
      document: { mode: 'y' },
      revision: 2,
      writtenAtRevision: 2,
    });
  });

  it('keeps the document through a write without one, which shows', async () => {
    const created = await call(
      'POST',
      PROJECTS,
      project({ document: DOC, documentSchema: 3 }),
    );
    const put = await call(
      'PUT',
      `${PROJECTS}/${created.body.id}`,
      project({ bpm: 90 }),
    );
    expect(put.body).toMatchObject({
      bpm: 90,
      document: DOC,
      documentSchema: 3,
      revision: 2,
      writtenAtRevision: 1,
    });
    const older = api.saveAsOlderApp(created.body.id, (body) => {
      body.bpm = 80;
    });
    expect(older).toMatchObject({ bpm: 80, revision: 3, writtenAtRevision: 1 });
    expect(older.document).toEqual(DOC);
  });

  it('refuses a save based on an older revision, writing nothing', async () => {
    const created = await call('POST', PROJECTS, project());
    const id = created.body.id;
    await call('PUT', `${PROJECTS}/${id}`, project({ bpm: 90 }));
    const stale = await call('PUT', `${PROJECTS}/${id}`, {
      ...project({ bpm: 70 }),
      baseRevision: 1,
    });
    expect(stale).toMatchObject({
      status: 409,
      body: { code: 'revision_conflict', revision: 2 },
    });
    expect(api.projects.get(id)).toMatchObject({ bpm: 90, revision: 2 });
  });

  it('refuses a document from an older schema than the stored one', async () => {
    const created = await call(
      'POST',
      PROJECTS,
      project({ document: { ...DOC, schema: 4 }, documentSchema: 4 }),
    );
    const older = await call('PUT', `${PROJECTS}/${created.body.id}`, {
      ...project({ document: DOC, documentSchema: 3 }),
    });
    expect(older).toMatchObject({
      status: 409,
      body: { code: 'document_schema_too_old', documentSchema: 4 },
    });
  });

  it('refuses a document over the size limit', async () => {
    const big = { ...DOC, pad: 'x'.repeat(MAX_DOCUMENT_BYTES) };
    const created = await call(
      'POST',
      PROJECTS,
      project({ document: big, documentSchema: 3 }),
    );
    expect(created).toMatchObject({
      status: 413,
      body: { code: 'document_too_large' },
    });
  });

  it('leaves the revision alone on a filing change, and lists it', async () => {
    const created = await call('POST', PROJECTS, project());
    const id = created.body.id;
    await call('PATCH', `${PROJECTS}/${id}/meta`, { libraryGenre: 'Pop' });
    expect(api.projects.get(id).revision).toBe(1);
    const list = await call('GET', PROJECTS);
    expect(list.body[0]).toMatchObject({
      id,
      revision: 1,
      documentSchema: null,
      trackCount: 1,
    });
  });

  it('moves the revision on for another device’s save', async () => {
    const created = await call(
      'POST',
      PROJECTS,
      project({ document: DOC, documentSchema: 3 }),
    );
    api.touchProject(created.body.id, { name: 'Elsewhere' });
    expect(api.projects.get(created.body.id)).toMatchObject({
      revision: 2,
      writtenAtRevision: 2,
    });
  });
});
