// @vitest-environment jsdom
/**
 * The cloud copy of the all-fields project (fixtures/v3-all-fields), held
 * still as milestone 1.5 writes it: fixtures/cloud-1.5 holds the server's
 * answer for a save in each mode, 'document' (the API's field) and
 * 'interim' (the first track's settings). Opening either must give back
 * every field the cloud keeps, exactly as the draft does; and today's
 * client must write the same document from it, so a change to the
 * document's format fails here until CLOUD_DOCUMENT_SCHEMA (the draft's
 * SESSION_SCHEMA_VERSION) is bumped with new fixtures, keeping these for the
 * decode of what was saved before.
 *
 * Fixtures are written only with WRITE_FIXTURES=1.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/cloudFixtures.test.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore, type AllSlices } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import { encodeCloudDocument } from '../projectDocument/cloudDocument';
import {
  DOC_CONTENT_KEYS,
  STORE_FIELDS,
  TRACK_FIELDS,
} from '../projectDocument/fields';
import {
  deserializeCloudProject,
  forgetLiveSession,
  loadSession,
  serializeSessionForCloud,
  type CloudProjectDetail,
  type CloudWriteMode,
} from '../SessionSerializer';

const DIR = resolve(process.cwd(), 'src/daw/persistence/__tests__/fixtures');
const ALL_FIELDS = resolve(DIR, 'v3-all-fields/all-fields.json');
const CLOUD = resolve(DIR, 'cloud-1.5');
const MODES: CloudWriteMode[] = ['document', 'interim'];

const s = () => useStore.getState();

function loadAllFields(): void {
  const outcome = loadSession(readFileSync(ALL_FIELDS, 'utf8'));
  if (!outcome.ok) throw new Error(`all-fields draft: ${outcome.reason}`);
}

/** The server's answer to a save of the live session in `mode`. */
function answerFor(mode: CloudWriteMode): CloudProjectDetail {
  const body = JSON.parse(
    JSON.stringify(serializeSessionForCloud(undefined, mode)),
  );
  return {
    ...body,
    id: 'cloud-fixture',
    createdAt: '2026-10-12T00:00:00.000Z',
    updatedAt: '2026-10-12T00:00:00.000Z',
    tracks: body.tracks.map((t: object, i: number) => ({
      ...t,
      id: `row-${i}`,
      ordinal: i,
    })),
    ...(mode === 'document'
      ? { revision: 1, writtenAtRevision: 1 }
      : { document: undefined, documentSchema: undefined }),
  };
}

const fixture = (mode: CloudWriteMode): CloudProjectDetail =>
  JSON.parse(readFileSync(resolve(CLOUD, `${mode}.json`), 'utf8'));

/** A Track as the cloud keeps it: no per-device fields, no audio clip ids. */
function cloudTrack(track: Track): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(TRACK_FIELDS) as (keyof Track)[]) {
    if (TRACK_FIELDS[key].cloud === false) continue;
    out[key] = track[key];
  }
  out.audioClips = track.audioClips.map(({ id: _id, ...clip }) => clip);
  return JSON.parse(JSON.stringify(out));
}

/** Every field the cloud keeps, as the store holds it now. */
function cloudContent(state: AllSlices): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of DOC_CONTENT_KEYS) {
    if (STORE_FIELDS[key].cloud === false) continue;
    out[key] =
      key === 'tracks'
        ? state.tracks.map(cloudTrack)
        : JSON.parse(JSON.stringify(state[key] ?? null));
  }
  return out;
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
});

it.skipIf(process.env.WRITE_FIXTURES !== '1')('writes the fixtures', () => {
  mkdirSync(CLOUD, { recursive: true });
  for (const mode of MODES) {
    loadAllFields();
    writeFileSync(
      resolve(CLOUD, `${mode}.json`),
      `${JSON.stringify(answerFor(mode), null, 2)}\n`,
    );
  }
});

describe.each(MODES)('a cloud copy saved in %s mode', (mode) => {
  it('opens with every field the cloud keeps, as the draft has it', () => {
    loadAllFields();
    const expected = cloudContent(s());
    useStore.setState(useStore.getInitialState(), true);

    const report = deserializeCloudProject(fixture(mode));
    expect(report).toMatchObject({
      document: mode === 'document' ? 'field' : 'interim',
      stale: false,
      newer: false,
      partsSkipped: 0,
    });
    expect(cloudContent(s())).toEqual(expected);
  });

  it('writes the same document again (else bump the schema)', () => {
    const saved = fixture(mode);
    const document =
      mode === 'document'
        ? saved.document
        : saved.tracks[0].settings?.projectDoc;
    deserializeCloudProject(saved);
    expect(JSON.parse(JSON.stringify(encodeCloudDocument(s())))).toEqual(
      document,
    );
  });
});
