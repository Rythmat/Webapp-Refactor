// @vitest-environment jsdom
/**
 * sessionFingerprint: what decides whether two sessions hold the same work,
 * for kept work (a link finds its work kept already) and for the pristine
 * check (a template nobody has changed is no work to keep). It is the
 * session's cloud link and its document content as the save status
 * fingerprints it; how the project was last seen, arming and inputs, and
 * prefs are not work. A v2 draft and the v3 session restored from it hold
 * the same work, so they fingerprint the same.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/sessionFingerprint.test.ts
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTrackSynthState } from '@/daw/oracle-synth/synthTrackState';
import { useStore } from '@/daw/store';
import {
  deserializeSession,
  forgetLiveSession,
  isPristineSession,
  markSessionPristine,
  serializeSession,
  sessionFingerprint,
  type SessionData,
} from '../SessionSerializer';

const FIXTURES = resolve(
  process.cwd(),
  'src/daw/persistence/__tests__/fixtures',
);
const read = (path: string): SessionData =>
  JSON.parse(readFileSync(join(FIXTURES, path), 'utf8')) as SessionData;

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
});

describe('a session’s fingerprint', () => {
  it('is the same for each captured v2 draft and the v3 session restored from it', () => {
    const differ: string[] = [];
    for (const folder of ['v2', 'v2-1.2']) {
      for (const file of readdirSync(join(FIXTURES, folder))) {
        if (!file.endsWith('.json') || file === 'manifest.json') continue;
        const v2 = read(`${folder}/${file}`);
        useStore.setState(useStore.getInitialState(), true);
        expect(deserializeSession(v2)).toBe(true);
        if (sessionFingerprint(v2) !== sessionFingerprint(serializeSession())) {
          differ.push(`${folder}/${file}`);
        }
      }
    }
    expect(differ).toEqual([]);
  });

  it('is the same every time for the same session', () => {
    const draft = read('v3-all-fields/all-fields.json');
    expect(sessionFingerprint(draft)).toBe(
      sessionFingerprint(structuredClone(draft)),
    );
  });

  describe('of a template nobody has changed', () => {
    beforeEach(() => {
      deserializeSession(read('v3-all-fields/all-fields.json'));
      markSessionPristine();
    });

    it('stays as it opened however it is looked at, armed or played', () => {
      useStore.setState({
        position: 4800,
        loopEnabled: false,
        currentView: 'leadsheet',
        libraryOpen: true,
        channelStripTab: 'prism',
        timelineZoom: 4,
        timelineScrollLeft: 900,
        selectedTrackId: 'trk-bass',
        automationOpenTrackId: null,
        masteringBypass: false,
        metronomeEnabled: !s().metronomeEnabled,
        countInBars: 4,
      });
      s().updateTrack('trk-keys', {
        recordArmed: true,
        monitoring: true,
        midiInputId: 'keyboard-2',
      });
      s().updateTrack('trk-guitar', {
        audioInputId: 'interface-2',
        audioInputChannel: { mode: 'mono', channel: 4 },
      });
      expect(isPristineSession()).toBe(true);
    });

    const edits: [string, () => void][] = [
      ['the cloud link', () => s().setProjectId('project-2')],
      ['a track', () => s().updateTrack('trk-keys', { volume: 0.2 })],
      ['the chord lane', () => s().deleteChordRegion('chord-2')],
      ['the mode', () => s().setMode('lydian')],
      ['the Prism builder', () => s().setStrumAmount(80)],
      [
        'a Score mark',
        () =>
          useStore.setState({
            scoreSlashNotes: ['trk-keys:clip-keys:0:60'],
          }),
      ],
      ['a marker', () => s().addMarker(960, 'Intro')],
      ['the master volume', () => s().setMasterVolume(0.9)],
      [
        'an Oracle patch',
        () =>
          setTrackSynthState('trk-lead', {
            ...(serializeSession().data.tracks[1].settings?.oracleSynth ?? {}),
            presetName: 'EDITED',
          } as never),
      ],
    ];
    for (const [what, edit] of edits) {
      it(`changes with ${what}`, () => {
        edit();
        expect(isPristineSession()).toBe(false);
      });
    }
  });

  it('never throws, even for a draft whose decode fails', () => {
    const draft = read('v3-all-fields/all-fields.json');
    let reads = 0;
    Object.defineProperty(draft.data.tracks[0].settings, 'presetName', {
      enumerable: true,
      // Fails the decode, then reads as text for the comparison.
      get() {
        reads++;
        if (reads === 1) throw new Error('unreadable');
        return 'Rhodes';
      },
    });
    expect(sessionFingerprint(draft)).toMatch(/^unreadable:/);
  });

  it('compares a draft no build can read word for word', () => {
    const broken = { version: 2, data: { tracks: 'none' } } as never;
    expect(sessionFingerprint(broken)).toBe(
      sessionFingerprint(structuredClone(broken)),
    );
    expect(sessionFingerprint(broken)).not.toBe(
      sessionFingerprint({ version: 2, data: { tracks: 'other' } } as never),
    );
  });
});
