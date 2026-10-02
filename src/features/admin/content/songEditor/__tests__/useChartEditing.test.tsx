/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ChordBar, Song } from '@/curriculum/types/songLibrary';
import { toggleBarFlag } from '@/lib/chartEditor/roadmapOps';
import { useChartEditing, type ChartEditing } from '../useChartEditing';

/**
 * The glue, driven for real.
 *
 * `lib/chartEditor` is pure and tested on its own; what is untested until
 * here is whether this hook hands the right value to the right function at
 * the right time — whether shift-click actually extends, whether undo
 * actually reaches the owner, whether typing in a field eats ⌘Z.
 */

const bar = (name: string): ChordBar => ({
  chords: [{ degree: '1 maj', chordName: name, beat: 1, duration: 4 }],
});

const song = (): Song =>
  ({
    id: 't',
    title: 'T',
    artist: 'T',
    key: 'C major',
    keyRoot: 60,
    mode: 'major',
    tempo: 120,
    timeSignature: [4, 4],
    difficulty: 1,
    genreTags: [],
    techniques: [],
    sections: [
      {
        id: 'a',
        label: 'Verse',
        bars: [bar('C'), bar('F'), bar('G'), bar('C')],
      },
      { id: 'b', label: 'Chorus', bars: [bar('Am'), bar('E')] },
    ],
    audioSources: [],
    artistImageSource: 'none',
  }) as Song;

/** Mount the hook over a song the harness owns, as the song editor does. */
function mount() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  const seen = { api: null as ChartEditing | null, song: song(), writes: 0 };

  const Harness = () => {
    seen.api = useChartEditing(seen.song, (sections) => {
      seen.song = { ...seen.song, sections };
      seen.writes += 1;
      render();
    });
    return null;
  };
  const render = () => act(() => root.render(<Harness />));
  render();

  return {
    seen,
    root,
    host,
    api: () => seen.api!,
    run: (fn: (api: ChartEditing) => void) => act(() => fn(seen.api!)),
  };
}

const key = (init: Partial<KeyboardEvent> & { key: string }) =>
  ({
    ...init,
    target: document.createElement('div'),
    preventDefault: () => {},
  }) as unknown as React.KeyboardEvent;

let mounted: ReturnType<typeof mount>;
beforeEach(() => {
  mounted = mount();
});
afterEach(() => {
  act(() => mounted.root.unmount());
  mounted.host.remove();
});

describe('picking bars', () => {
  it('selects one bar on a plain click', () => {
    mounted.run((a) => a.pickBar({ section: 0, bar: 1 }, {}));
    expect(mounted.api().selectedBars).toEqual([{ section: 0, bar: 1 }]);
  });

  it('extends to a run on shift-click, across a section', () => {
    mounted.run((a) => a.pickBar({ section: 0, bar: 2 }, {}));
    mounted.run((a) => a.pickBar({ section: 1, bar: 0 }, { shift: true }));
    expect(mounted.api().selectedBars).toEqual([
      { section: 0, bar: 2 },
      { section: 0, bar: 3 },
      { section: 1, bar: 0 },
    ]);
  });

  it('adds and removes one bar on a toggle click', () => {
    mounted.run((a) => a.pickBar({ section: 0, bar: 0 }, {}));
    mounted.run((a) => a.pickBar({ section: 0, bar: 2 }, { toggle: true }));
    expect(mounted.api().selectedBars).toHaveLength(2);
    mounted.run((a) => a.pickBar({ section: 0, bar: 2 }, { toggle: true }));
    expect(mounted.api().selectedBars).toEqual([{ section: 0, bar: 0 }]);
  });

  it('drops a selection whose bars are gone', () => {
    mounted.run((a) => a.pickBar({ section: 1, bar: 1 }, {}));
    mounted.run((a) =>
      a.apply(
        [mounted.seen.song.sections[0], { id: 'b', label: 'Chorus', bars: [] }],
        'Delete bars',
      ),
    );
    expect(mounted.api().selectedBars).toEqual([]);
  });
});

describe('undo and redo', () => {
  it('sends the restored chart back to the owner', () => {
    mounted.run((a) => a.pickBar({ section: 0, bar: 0 }, {}));
    mounted.run((a) =>
      a.apply(
        toggleBarFlag(mounted.seen.song.sections, a.selectedBars, 'segno'),
        'Segno',
      ),
    );
    expect(mounted.seen.song.sections[0].bars[0].segno).toBe(true);
    expect(mounted.api().canUndo).toBe(true);

    mounted.run((a) => a.undo());
    expect(mounted.seen.song.sections[0].bars[0].segno).toBeUndefined();

    mounted.run((a) => a.redo());
    expect(mounted.seen.song.sections[0].bars[0].segno).toBe(true);
  });

  it('names the step, so the button can say what it undoes', () => {
    mounted.run((a) => a.pickBar({ section: 0, bar: 0 }, {}));
    mounted.run((a) =>
      a.apply(
        toggleBarFlag(mounted.seen.song.sections, a.selectedBars, 'fermata'),
        'Fermata',
      ),
    );
    expect(mounted.api().undoLabel).toBe('Fermata');
  });

  it('has nothing to undo before anything is edited', () => {
    expect(mounted.api().canUndo).toBe(false);
    expect(mounted.api().canRedo).toBe(false);
  });
});

describe('the keyboard', () => {
  const edit = (a: ChartEditing) =>
    a.apply(
      toggleBarFlag(mounted.seen.song.sections, a.selectedBars, 'segno'),
      'Segno',
    );

  it('undoes on cmd-Z and redoes on shift-cmd-Z', () => {
    mounted.run((a) => a.pickBar({ section: 0, bar: 0 }, {}));
    mounted.run(edit);
    mounted.run((a) => a.onKeyDown(key({ key: 'z', metaKey: true })));
    expect(mounted.seen.song.sections[0].bars[0].segno).toBeUndefined();
    mounted.run((a) =>
      a.onKeyDown(key({ key: 'z', metaKey: true, shiftKey: true })),
    );
    expect(mounted.seen.song.sections[0].bars[0].segno).toBe(true);
  });

  it('copies and pastes a bar with its roadmap', () => {
    mounted.run((a) => a.pickBar({ section: 0, bar: 0 }, {}));
    mounted.run(edit);
    mounted.run((a) => a.onKeyDown(key({ key: 'c', metaKey: true })));
    expect(mounted.api().pasteLabel).toContain('bar');

    mounted.run((a) => a.pickBar({ section: 1, bar: 1 }, {}));
    mounted.run((a) => a.onKeyDown(key({ key: 'v', metaKey: true })));
    // The mark travelled with the bar, which is the point of copying bars.
    expect(mounted.seen.song.sections[1].bars[1].segno).toBe(true);
    expect(mounted.seen.song.sections[1].bars[1].chords[0].chordName).toBe('C');
  });

  it('selects the whole chart on cmd-A', () => {
    mounted.run((a) => a.onKeyDown(key({ key: 'a', metaKey: true })));
    expect(mounted.api().selectedBars).toHaveLength(6);
  });

  it('clears the selection on Escape', () => {
    mounted.run((a) => a.pickBar({ section: 0, bar: 0 }, {}));
    mounted.run((a) => a.onKeyDown(key({ key: 'Escape' })));
    expect(mounted.api().selectedBars).toEqual([]);
  });

  it('leaves a person typing in a field alone', () => {
    // ⌘Z in a chord-name box is undo for the box, not for the chart.
    mounted.run((a) => a.pickBar({ section: 0, bar: 0 }, {}));
    mounted.run(edit);
    const inField = {
      key: 'z',
      metaKey: true,
      target: document.createElement('input'),
      preventDefault: () => {},
    } as unknown as React.KeyboardEvent;
    mounted.run((a) => a.onKeyDown(inField));
    expect(mounted.seen.song.sections[0].bars[0].segno).toBe(true);
  });

  it('ignores a bare key, so typing is never an edit', () => {
    mounted.run((a) => a.pickBar({ section: 0, bar: 0 }, {}));
    mounted.run(edit);
    mounted.run((a) => a.onKeyDown(key({ key: 'z' })));
    expect(mounted.seen.song.sections[0].bars[0].segno).toBe(true);
  });
});
