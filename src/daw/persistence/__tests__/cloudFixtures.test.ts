// @vitest-environment jsdom
/**
 * The cloud copy of the all-fields project (fixtures/v6-all-fields), held
 * still as today's client writes it: fixtures/cloud-2.12 holds the server's
 * answer for a save in each mode, 'document' (the API's field) and
 * 'interim' (the first track's settings). Opening either must give back
 * every field the cloud keeps, exactly as the draft does; and today's
 * client must write the same document from it, so a change to the
 * document's format fails here until CLOUD_DOCUMENT_SCHEMA (the draft's
 * SESSION_SCHEMA_VERSION) is bumped with new fixtures, keeping these for the
 * decode of what was saved before. fixtures/cloud-1.5 are milestone 1.5's
 * (schema 3, from fixtures/v3-all-fields), fixtures/cloud-1.10 milestone
 * 1.10's (schema 4, from fixtures/v4-all-fields) and fixtures/cloud-2.7
 * milestone 2.7's (schema 5, from fixtures/v5-all-fields); all still open
 * whole.
 *
 * Fixtures are written only with WRITE_FIXTURES=1.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/cloudFixtures.test.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { withoutIdentity } from '@/daw/harmony/chordIdentity';
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
const ALL_FIELDS = resolve(DIR, 'v6-all-fields/all-fields.json');
const CLOUD = resolve(DIR, 'cloud-2.12');
/** Milestone 2.7's saves (schema 5), of the v5 all-fields draft. */
const ALL_FIELDS_V5 = resolve(DIR, 'v5-all-fields/all-fields.json');
const CLOUD_V5 = resolve(DIR, 'cloud-2.7');
/** Milestone 1.10's saves (schema 4), of the v4 all-fields draft. */
const ALL_FIELDS_V4 = resolve(DIR, 'v4-all-fields/all-fields.json');
const CLOUD_V4 = resolve(DIR, 'cloud-1.10');
/** Milestone 1.5's saves (schema 3), of the v3 all-fields draft. */
const ALL_FIELDS_V3 = resolve(DIR, 'v3-all-fields/all-fields.json');
const CLOUD_V3 = resolve(DIR, 'cloud-1.5');
const MODES: CloudWriteMode[] = ['document', 'interim'];

const s = () => useStore.getState();

function loadAllFields(file = ALL_FIELDS): void {
  const outcome = loadSession(readFileSync(file, 'utf8'));
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

const fixture = (mode: CloudWriteMode, dir = CLOUD): CloudProjectDetail =>
  JSON.parse(readFileSync(resolve(dir, `${mode}.json`), 'utf8'));

/**
 * A Track as the cloud keeps it: no per-device fields, and with
 * `audioClipIds` its audio clips' ids (since 1.10; 1.5's saves carry none).
 */
function cloudTrack(
  track: Track,
  audioClipIds: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(TRACK_FIELDS) as (keyof Track)[]) {
    if (TRACK_FIELDS[key].cloud === false) continue;
    out[key] = track[key];
  }
  if (!audioClipIds) {
    out.audioClips = track.audioClips.map(({ id: _id, ...clip }) => clip);
  }
  return JSON.parse(JSON.stringify(out));
}

/** Every field the cloud keeps, as the store holds it now. */
function cloudContent(
  state: AllSlices,
  audioClipIds = true,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of DOC_CONTENT_KEYS) {
    if (STORE_FIELDS[key].cloud === false) continue;
    out[key] =
      key === 'tracks'
        ? state.tracks.map((t) => cloudTrack(t, audioClipIds))
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
    // A chord saved without an identity gets one read from its labels when
    // it opens (source 'derived', milestone 1.16a): a value in a field the
    // format already had, not a new format. Fixtures from 1.16a on hold it.
    const underived = (doc: any) => ({
      ...doc,
      chordRegions: doc.chordRegions.map((region: any) =>
        region.identity?.source === 'derived'
          ? withoutIdentity(region)
          : region,
      ),
    });
    const again = JSON.parse(JSON.stringify(encodeCloudDocument(s())));
    expect(underived(again)).toEqual(underived(document));
  });
});

describe.each(MODES)('a cloud copy milestone 2.7 saved in %s mode', (mode) => {
  it('still opens with every field it kept', () => {
    loadAllFields(ALL_FIELDS_V5);
    const expected = cloudContent(s());
    useStore.setState(useStore.getInitialState(), true);

    const report = deserializeCloudProject(fixture(mode, CLOUD_V5));
    expect(report).toMatchObject({ stale: false, newer: false });
    expect(cloudContent(s())).toEqual(expected);
  });
});

describe.each(MODES)('a cloud copy milestone 1.10 saved in %s mode', (mode) => {
  it('still opens with every field it kept', () => {
    loadAllFields(ALL_FIELDS_V4);
    const expected = cloudContent(s());
    useStore.setState(useStore.getInitialState(), true);

    const report = deserializeCloudProject(fixture(mode, CLOUD_V4));
    expect(report).toMatchObject({ stale: false, newer: false });
    expect(cloudContent(s())).toEqual(expected);
  });
});

describe.each(MODES)('a cloud copy milestone 1.5 saved in %s mode', (mode) => {
  it('still opens with every field it kept', () => {
    loadAllFields(ALL_FIELDS_V3);
    const expected = cloudContent(s(), false);
    useStore.setState(useStore.getInitialState(), true);

    const report = deserializeCloudProject(fixture(mode, CLOUD_V3));
    expect(report).toMatchObject({ stale: false, newer: false });
    expect(cloudContent(s(), false)).toEqual(expected);
  });
});
