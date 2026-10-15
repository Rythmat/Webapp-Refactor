import { describe, expect, it } from 'vitest';
import {
  edgesForGroove,
  edgesForLesson,
  edgesForPart,
} from '@/content/graph/deriveGraph';
import { isValidEdge, isWellFormed } from '@/content/graph/types';
import {
  instrumentContentSnapshot,
  lessonId,
  loadLessonInputs,
  partInstrument,
} from '../instrumentContentSnapshot';

describe('the instrument content snapshot', () => {
  const snapshot = instrumentContentSnapshot();

  it('holds every groove, the Studio’s included', () => {
    expect(snapshot.grooves.length).toBeGreaterThanOrEqual(44);
    expect(snapshot.grooves.some((g) => g.id === 'groove-rock-2')).toBe(true);
  });

  it('gives every node a well-formed id', () => {
    const ids = [
      ...snapshot.grooves.map((g) => `groove:${g.id}`),
      ...snapshot.parts.map((p) => `part:${p.id}`),
      ...snapshot.feels.map((f) => `feel:${f.id}`),
      ...snapshot.patches.map((p) => `patch:${p.id}`),
      ...snapshot.kits.map((k) => `kit:${k.id}`),
    ];
    expect(ids.filter((id) => !isWellFormed(id))).toEqual([]);
  });

  it('derives only valid edges, to kits and patches that exist', () => {
    const kits = new Set(snapshot.kits.map((k) => k.id));
    for (const g of snapshot.grooves) {
      expect(edgesForGroove(g).every(isValidEdge), g.id).toBe(true);
      if (g.kit) expect(kits.has(g.kit), `${g.id} kit ${g.kit}`).toBe(true);
    }
    const patches = new Set(snapshot.patches.map((p) => p.id));
    for (const p of snapshot.parts) {
      expect(edgesForPart(p).every(isValidEdge), p.id).toBe(true);
      if (p.patch) expect(patches.has(p.patch), p.id).toBe(true);
    }
  });

  it('reads a part’s instrument from its sound', () => {
    expect(
      partInstrument({ instrument: 'bass', sound: 'bass-electric:upright' }),
    ).toBe('upright-bass');
    expect(
      partInstrument({ instrument: 'bass', sound: 'bass-electric:808' }),
    ).toBe('synth-bass');
    expect(
      partInstrument({ instrument: 'piano', sound: 'electric-piano' }),
    ).toBe('electric-piano');
    expect(
      partInstrument({ instrument: 'guitar', sound: 'soundfont:25' }),
    ).toBe('acoustic-guitar');
  });
});

describe('the lesson levels', () => {
  it('names each level by its flow key and links its real grooves', async () => {
    const lessons = await loadLessonInputs();
    expect(lessonId('hip-hop', 1)).toBe('hiphop-l1');
    const funk2 = lessons.find((l) => l.id === 'funk-l2');
    expect(funk2?.grooveIds.length).toBeGreaterThan(0);
    const grooves = new Set(
      instrumentContentSnapshot().grooves.map((g) => g.id),
    );
    // Every groove a lesson plays over exists as a groove node.
    const dangling = lessons.flatMap((l) =>
      edgesForLesson(l)
        .map((e) => e.to.slice('groove:'.length))
        .filter((id) => !grooves.has(id)),
    );
    expect(dangling).toEqual([]);
  });
});
