/**
 * The ids a cloud open gives its tracks (planCloudTrackIds), and the fields
 * naming tracks that follow them (rewriteTrackRefs).
 *
 * Run: npx vitest run src/daw/persistence/projectDocument/__tests__/cloudIds.test.ts
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { MASTER_AUTOMATION_ID } from '@/daw/audio/automationParams';
import {
  planCloudTrackIds,
  rewriteTrackRefs,
  type TrackRefHolder,
} from '../cloudIds';

/** A mint that counts, so a test can name the ids it hands out. */
function counter(prefix = 'new'): () => string {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

/** A track that keys its ducker from `keyTrackId`. */
const ducked = (keyTrackId: string | null): TrackRefHolder => ({
  effects: { ducker: { keyTrackId } },
});

/** Freeze `value` all the way down, so any write to it throws. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

describe('planCloudTrackIds', () => {
  it('reuses every saved id that is valid and unique', () => {
    const mint = vi.fn(counter());
    const { ids, remap } = planCloudTrackIds(['keys', 'bass', 'drums'], mint);

    expect(ids).toEqual(['keys', 'bass', 'drums']);
    expect(mint).not.toHaveBeenCalled();
    expect(remap).toEqual(
      new Map([
        ['keys', 'keys'],
        ['bass', 'bass'],
        ['drums', 'drums'],
      ]),
    );
  });

  it('keeps a repeated saved id on its first track and mints for the later ones', () => {
    // Only a corrupt or hand-edited payload holds two tracks with one saved
    // id (no app path writes one), but ids must stay unique all the same.
    const { ids, remap } = planCloudTrackIds(
      ['keys', 'bass', 'keys', 'keys'],
      counter(),
    );

    expect(ids).toEqual(['keys', 'bass', 'new-1', 'new-2']);
    expect(new Set(ids).size).toBe(ids.length);
    expect(remap.get('keys')).toBe('keys');
  });

  it('mints for missing and invalid saved ids', () => {
    const longest = 'a'.repeat(64);
    const { ids } = planCloudTrackIds(
      [
        undefined,
        null,
        '',
        'old:keys',
        'old|keys',
        'a'.repeat(65),
        // The ids of the bus FX racks and the Master's automation lane.
        'master',
        'return-A',
        MASTER_AUTOMATION_ID,
        longest,
        'master-keys',
        // What a corrupt payload can hold where a string belongs.
        42 as unknown as string,
      ],
      counter(),
    );

    expect(ids).toEqual([
      'new-1',
      'new-2',
      'new-3',
      'new-4',
      'new-5',
      'new-6',
      'new-7',
      'new-8',
      'new-9',
      longest,
      'master-keys',
      'new-10',
    ]);
  });

  it('maps each saved id to the id its first track loads under', () => {
    const { ids, remap } = planCloudTrackIds(
      ['old:keys', 'bass', 'old:keys', undefined, '', 'bass'],
      counter(),
    );

    expect(ids).toEqual(['new-1', 'bass', 'new-2', 'new-3', 'new-4', 'new-5']);
    // Invalid saved ids are still mapped, so references to them follow
    // their track; missing and empty ones name nothing.
    expect(remap).toEqual(
      new Map([
        ['old:keys', 'new-1'],
        ['bass', 'bass'],
      ]),
    );
  });

  it('never mints an id that a later track reuses', () => {
    // The mint's first id is the second track's saved id.
    const { ids } = planCloudTrackIds([undefined, 'new-1'], counter());

    expect(ids).toEqual(['new-2', 'new-1']);
  });

  it('skips minted ids that are taken or invalid', () => {
    const minted = ['keys', 'bad:id', 'x'.repeat(65), 'master', 'fresh'];
    const { ids } = planCloudTrackIds(['keys', undefined], () =>
      String(minted.shift()),
    );

    expect(ids).toEqual(['keys', 'fresh']);
  });

  it('throws when the mint never finds a free id', () => {
    expect(() => planCloudTrackIds(['keys', undefined], () => 'keys')).toThrow(
      /mint\(\)/,
    );
  });

  it('loads one payload under the same ids every time', () => {
    // A reopen, a Save As copy and kept work restored after a reopen all come
    // back under ids this page has seen. That is why every cache keyed by
    // track id (engines, the Oracle patch cache, the synth panel bridge) has
    // to start over on a load, through bumpSessionGeneration
    // (src/daw/session/sessionGeneration.ts, owned by the cache-generation
    // track), which the loaders call first, before they fill any cache keyed
    // by track id (setTrackSynthState) and before the tracks reach the store.
    const payload = ['keys', undefined, 'bass', 'keys'];
    const first = planCloudTrackIds(payload, counter('first'));
    const second = planCloudTrackIds(payload, counter('second'));

    expect(first.ids).toEqual(['keys', 'first-1', 'bass', 'first-2']);
    expect(second.ids).toEqual(['keys', 'second-1', 'bass', 'second-2']);
    expect(second.remap).toEqual(first.remap);
  });
});

describe('rewriteTrackRefs', () => {
  const remap = new Map([
    ['old-drums', 'drums'],
    ['old-guitar', 'guitar'],
    ['old-lead', 'lead'],
  ]);

  it('points every reference at the id its track loaded under', () => {
    const input = {
      tracks: [
        ducked('old-drums'),
        { audioMidiSource: { sourceTrackId: 'old-guitar' } },
      ],
      scoreChordTracks: ['old-lead', 'old-guitar'],
      scoreChordHidden: ['old-lead:cr-1', 'old-guitar:cr-2'],
      leadSheetMelodyTrackId: 'old-lead',
      selectedTrackId: 'old-guitar',
      automationOpenTrackId: 'old-drums',
    };

    expect(rewriteTrackRefs(input, remap)).toEqual({
      tracks: [
        ducked('drums'),
        { audioMidiSource: { sourceTrackId: 'guitar' } },
      ],
      scoreChordTracks: ['lead', 'guitar'],
      scoreChordHidden: ['lead:cr-1', 'guitar:cr-2'],
      leadSheetMelodyTrackId: 'lead',
      selectedTrackId: 'guitar',
      automationOpenTrackId: 'drums',
    });
  });

  it('rewrites both references on one track and keeps everything else', () => {
    const track = {
      id: 'bass',
      name: 'Bass',
      midiClips: [{ id: 'c1', startTick: 0, events: [] }],
      effects: {
        reverb: { enabled: true, mix: 0.3 },
        ducker: { enabled: true, amount: 0.6, keyTrackId: 'old-drums' },
      },
      audioMidiSource: {
        enabled: true,
        sourceTrackId: 'old-guitar',
        mode: 'poly' as const,
      },
    };

    expect(rewriteTrackRefs({ tracks: [track] }, remap).tracks[0]).toEqual({
      ...track,
      effects: {
        ...track.effects,
        ducker: { ...track.effects.ducker, keyTrackId: 'drums' },
      },
      audioMidiSource: { ...track.audioMidiSource, sourceTrackId: 'guitar' },
    });
  });

  it('clears references to tracks the payload does not hold', () => {
    const input = {
      tracks: [ducked('gone')],
      scoreChordTracks: ['gone', 'old-lead'],
      scoreChordHidden: ['gone:cr-1', 'old-lead:cr-2', 'no-track', ':cr-3'],
      leadSheetMelodyTrackId: 'gone',
      selectedTrackId: 'gone',
      automationOpenTrackId: 'gone',
    };

    expect(rewriteTrackRefs(input, remap)).toEqual({
      tracks: [ducked(null)],
      scoreChordTracks: ['lead'],
      scoreChordHidden: ['lead:cr-2'],
      leadSheetMelodyTrackId: null,
      selectedTrackId: null,
      automationOpenTrackId: null,
    });
  });

  it('leaves a MIDI source that names no track as it is', () => {
    // Null there would mean "use the first guitar or bass track", which would
    // start live input from a track the student never chose.
    const lost = { audioMidiSource: { enabled: true, sourceTrackId: 'gone' } };
    const input = { tracks: [lost, ducked('old-drums')] };

    const out = rewriteTrackRefs(input, remap);

    expect(out.tracks[0]).toBe(lost);
    expect(out.tracks[1]).toEqual(ducked('drums'));
  });

  it('keeps the Master automation lane open', () => {
    const input = { tracks: [], automationOpenTrackId: MASTER_AUTOMATION_ID };
    // A corrupt payload whose track was saved under the lane's id: that
    // track is minted a fresh id, and the lane still means the Master.
    const { remap: loaded } = planCloudTrackIds(
      [MASTER_AUTOMATION_ID],
      counter(),
    );

    expect(rewriteTrackRefs(input, new Map())).toBe(input);
    expect(rewriteTrackRefs(input, loaded)).toBe(input);
  });

  it('keys a ducker to the first of two tracks that share a saved id', () => {
    // Two tracks carry the saved id 'drums' (a corrupt payload). A remap that
    // let the later one overwrite the entry would key the bass's ducker from
    // the wrong track.
    const payload = [
      { name: 'Drums', sourceTrackId: 'drums', ...ducked(null) },
      { name: 'Drums again', sourceTrackId: 'drums', ...ducked(null) },
      { name: 'Bass', sourceTrackId: 'bass', ...ducked('drums') },
    ];
    const { ids, remap: loaded } = planCloudTrackIds(
      payload.map((t) => t.sourceTrackId),
      counter(),
    );
    const { tracks } = rewriteTrackRefs({ tracks: payload }, loaded);

    expect(ids).toEqual(['drums', 'new-1', 'bass']);
    expect(tracks[2].effects?.ducker?.keyTrackId).toBe(ids[0]);
  });

  it('keys a ducker to the first of two tracks that share an invalid saved id', () => {
    // Both tracks are minted fresh ids here, so the remap entry is the only
    // thing that says which one the key meant.
    const payload = [
      { sourceTrackId: 'old:drums', ...ducked(null) },
      { sourceTrackId: 'old:drums', ...ducked(null) },
      { sourceTrackId: undefined, ...ducked('old:drums') },
    ];
    const { ids, remap: loaded } = planCloudTrackIds(
      payload.map((t) => t.sourceTrackId),
      counter(),
    );
    const { tracks } = rewriteTrackRefs({ tracks: payload }, loaded);

    expect(ids).toEqual(['new-1', 'new-2', 'new-3']);
    expect(tracks[2].effects?.ducker?.keyTrackId).toBe('new-1');
  });

  it('returns the input itself when every reference already resolves', () => {
    const identity = new Map([
      ['drums', 'drums'],
      ['lead', 'lead'],
    ]);
    const input = {
      tracks: [
        ducked('drums'),
        ducked(null),
        { audioMidiSource: undefined },
        { audioMidiSource: { sourceTrackId: 'drums' } },
      ],
      scoreChordTracks: ['lead'],
      scoreChordHidden: ['lead:cr-1'],
      leadSheetMelodyTrackId: 'lead',
      selectedTrackId: 'drums',
      automationOpenTrackId: 'lead',
    };
    const empty = { tracks: [] };

    expect(rewriteTrackRefs(input, identity)).toBe(input);
    expect(rewriteTrackRefs(empty, new Map())).toBe(empty);
  });

  it('copies only what changes and never writes to its input', () => {
    const drums = ducked('drums');
    const input = deepFreeze({
      tracks: [drums, ducked('old-drums')],
      scoreChordTracks: ['lead'],
      scoreChordHidden: ['old-lead:cr-1'],
    });
    const identity = new Map([...remap, ['drums', 'drums'], ['lead', 'lead']]);

    const out = rewriteTrackRefs(input, identity);

    expect(out).not.toBe(input);
    expect(out.tracks[0]).toBe(drums);
    expect(out.tracks[1]).toEqual(ducked('drums'));
    expect(out.scoreChordTracks).toBe(input.scoreChordTracks);
    expect(out.scoreChordHidden).toEqual(['lead:cr-1']);
  });

  it('leaves out the fields the input leaves out', () => {
    const out = rewriteTrackRefs({ tracks: [ducked('old-drums')] }, remap);

    expect(Object.keys(out)).toEqual(['tracks']);
  });

  it('keeps every colon of a hidden chord after the track id', () => {
    const out = rewriteTrackRefs(
      { tracks: [], scoreChordHidden: ['old-lead:cr:1'] },
      remap,
    );

    expect(out.scoreChordHidden).toEqual(['lead:cr:1']);
  });
});

// The captured autosaves (frozen; see fixtures/manifest.test.ts). A cloud
// save writes the same settings blob per track (trackSettings in
// SessionSerializer.ts), so its sourceTrackId is what a cloud open reads.
interface SavedTrack {
  id: string;
  name: string;
  settings?: {
    sourceTrackId?: string;
    effects?: { ducker?: { keyTrackId: string | null } };
  };
}

const FIXTURES = resolve(
  process.cwd(),
  'src/daw/persistence/__tests__/fixtures',
);

function savedTracks(folder: string, file: string): SavedTrack[] {
  const session = JSON.parse(
    readFileSync(join(FIXTURES, folder, file), 'utf8'),
  ) as { data: { tracks: SavedTrack[] } };
  return session.data.tracks;
}

function fixtureFiles(folder: string): string[] {
  const manifest = JSON.parse(
    readFileSync(join(FIXTURES, folder, 'manifest.json'), 'utf8'),
  ) as { fixtures: { file: string }[] };
  return manifest.fixtures.map((entry) => entry.file);
}

describe('cloud opens of the captured projects', () => {
  for (const folder of ['v2', 'v2-1.2']) {
    it(`reuses every saved track id and keeps every reference (${folder})`, () => {
      const files = fixtureFiles(folder);
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        const tracks = savedTracks(folder, file);
        const mint = vi.fn(counter());
        const { ids, remap } = planCloudTrackIds(
          tracks.map((t) => t.settings?.sourceTrackId),
          mint,
        );
        const opened = {
          tracks: tracks.map((t) => ({ effects: t.settings?.effects })),
        };

        expect(ids, file).toEqual(tracks.map((t) => t.id));
        expect(mint, file).not.toHaveBeenCalled();
        expect(rewriteTrackRefs(opened, remap), file).toBe(opened);
      }
    });
  }

  it('keeps the synth ducked under the drums (house lesson)', () => {
    const tracks = savedTracks('v2', 'lesson-end-house-make-it-pump.json');
    const opened = (saved: SavedTrack[]) => {
      const { ids, remap } = planCloudTrackIds(
        saved.map((t) => t.settings?.sourceTrackId),
        counter(),
      );
      return rewriteTrackRefs(
        {
          tracks: saved.map((t, i) => ({
            id: ids[i],
            name: t.name,
            effects: t.settings?.effects,
          })),
        },
        remap,
      ).tracks;
    };
    const keyOf = (loaded: ReturnType<typeof opened>, name: string) =>
      loaded.find((t) => t.name === name)?.effects?.ducker?.keyTrackId;
    const idOf = (loaded: ReturnType<typeof opened>, name: string) =>
      loaded.find((t) => t.name === name)?.id;
    const savedEffects = tracks.find((t) => t.name === 'Synth')?.settings
      ?.effects;
    const effectsOf = (loaded: ReturnType<typeof opened>) =>
      loaded.find((t) => t.name === 'Synth')?.effects;

    const loaded = opened(tracks);
    expect(idOf(loaded, 'Drums')).toBe(
      tracks.find((t) => t.name === 'Drums')?.id,
    );
    expect(keyOf(loaded, 'Synth')).toBe(idOf(loaded, 'Drums'));
    expect(effectsOf(loaded)).toEqual(savedEffects);

    // A save from before tracks carried their id can't say which track the
    // key named, so the ducker is cleared, as cloud opens always did. The
    // rest of the Synth's effects come through as saved.
    const legacy = opened(
      tracks.map((t) => ({
        ...t,
        settings: { ...t.settings, sourceTrackId: undefined },
      })),
    );
    expect(idOf(legacy, 'Drums')).toBe('new-1');
    expect(keyOf(legacy, 'Synth')).toBeNull();
    expect(effectsOf(legacy)).toEqual({
      ...savedEffects,
      ducker: { ...savedEffects?.ducker, keyTrackId: null },
    });
  });
});
