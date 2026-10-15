/**
 * snapshotLiveSession, emptyDocFingerprint and bodyContent (milestone 1.4,
 * E7): one capture of the live session for a draft write.
 *
 * Run: npx vitest run src/daw/persistence/drafts/__tests__/snapshot.test.ts
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { documentFingerprint } from '@/daw/persistence/saveStatusStore';
import {
  isLoadableSession,
  SESSION_SCHEMA_VERSION,
  type SessionData,
} from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';
import { hashFingerprint } from '@/lib/studio-projects/drafts/fingerprintHash';
import {
  bodyContent,
  emptyDocFingerprint,
  snapshotLiveSession,
} from '../snapshot';

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});

describe('snapshotLiveSession', () => {
  it('captures an empty project as no content', () => {
    const snap = snapshotLiveSession();
    expect(snap.hasContent).toBe(false);
    expect(snap.trackCount).toBe(0);
    expect(snap.docFingerprint).toBe(emptyDocFingerprint());
    expect(snap.schema).toBe(SESSION_SCHEMA_VERSION);
    expect(snap.projectId).toBeNull();
    expect(snap.roomId).toBeNull();
  });

  it('describes the session its body holds', () => {
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    s().addMidiClip(keys, { id: 'c1', startTick: 0, events: [] });
    s().setProjectName('Blue Hour');
    s().setProjectId('project-1');
    const snap = snapshotLiveSession();

    expect(snap).toMatchObject({
      hasContent: true,
      name: 'Blue Hour',
      trackCount: 1,
      projectId: 'project-1',
    });
    expect(snap.docFingerprint).toBe(hashFingerprint(documentFingerprint()));
    expect(snap.docFingerprint).not.toBe(emptyDocFingerprint());
    expect(isLoadableSession(snap.text)).toBe(true);
    const body = JSON.parse(snap.text) as SessionData;
    expect(body.data.tracks.map((t) => t.name)).toEqual(['Keys']);
  });

  it('counts a tempo or a name as content, the view as none', () => {
    s().setTimelineZoom(3);
    expect(snapshotLiveSession().hasContent).toBe(false);
    s().setBpm(97);
    expect(snapshotLiveSession().hasContent).toBe(true);
  });
});

describe('bodyContent', () => {
  it('tells two writes of one project apart only by content', () => {
    s().addTrack('midi', 'piano-sampler', 'Keys');
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000);
      const first = snapshotLiveSession().text;
      vi.setSystemTime(2_000_000);
      const second = snapshotLiveSession().text;
      expect(first).not.toBe(second);
      expect(bodyContent(first)).toBe(bodyContent(second));

      s().setBpm(140);
      expect(bodyContent(snapshotLiveSession().text)).not.toBe(
        bodyContent(first),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('leaves text without an envelope timestamp as it is', () => {
    expect(bodyContent('{"data":{"timestamp":5}}')).toBe(
      '{"data":{"timestamp":5}}',
    );
    expect(bodyContent('not json')).toBe('not json');
  });
});
