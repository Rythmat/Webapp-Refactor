// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { StaffLayout } from '@/components/notation/StaffView';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import {
  GUITAR_ATLAS_BOOK_ONE,
  GUITAR_KEY_ORDER,
} from '@/curriculum/data/guitar/bookOne';
import {
  GUITAR_THEORY_NOTES,
  GUITAR_THEORY_STRINGS,
} from '@/curriculum/data/guitar/theoryNotes';
import type { GuitarKeyName } from '@/curriculum/data/guitar/types';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import type { GuitarSubsectionPrefix } from '@/lib/guitar/theory';
import { GuitarChordStrip } from '../../GuitarChordStrip';
import { guitarVisualModel } from '../../guitarVisualModel';
import { GuitarKeyIntro } from '../GuitarKeyIntro';
import { GuitarSectionBCard } from '../GuitarSectionBCard';
import { GuitarTheoryPanel } from '../GuitarTheoryPanel';
import { MusicMapOverlay } from '../MusicMapOverlay';
import { activityId } from '../theoryUi';

// Guardrail 5, original wording only: every sentence of theory these
// surfaces show is an authored string from theoryNotes.ts (copy-checked
// against the book), with only its {tokens} filled in. Opens every note,
// drawer item and popover, then reads each paragraph and note heading.

const RED = '#D2404A';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** An authored string as a pattern: its {tokens} match any filled value. */
const pattern = (text: string) =>
  new RegExp(`^${escape(text).replace(/\\\{\w+\\\}/g, '.+')}$`, 'u');
const AUTHORED = [
  ...GUITAR_THEORY_NOTES.flatMap((note) => [note.title, note.body]),
  ...Object.values(GUITAR_THEORY_STRINGS),
].map(pattern);
const isAuthored = (text: string) => AUTHORED.some((p) => p.test(text));

/** Paragraphs and note headings on the page, portalled popovers included. */
function shownCopy(): string[] {
  return [...document.body.querySelectorAll('p, h4')]
    .filter((el) => !el.closest('[data-skip-take-result]'))
    .map((el) => el.textContent?.trim() ?? '')
    .filter(Boolean);
}

const seen = new Set<string>();
function collect() {
  for (const text of shownCopy()) seen.add(text);
}
/** Whether a note's body was shown on some surface. */
function reached(noteId: string): boolean {
  const note = GUITAR_THEORY_NOTES.find((n) => n.id === noteId);
  if (!note) throw new Error(`no note ${noteId}`);
  const body = pattern(note.body);
  return [...seen].some((text) => body.test(text));
}

function clickAll(selector: string) {
  for (const el of [...document.querySelectorAll<HTMLElement>(selector)]) {
    fireEvent.click(el);
    collect();
  }
}

/** Opens each popover trigger in turn (one popover is open at a time). */
function openPopovers(root: ParentNode) {
  for (const trigger of [
    ...root.querySelectorAll<HTMLElement>('[aria-haspopup="dialog"]'),
  ]) {
    fireEvent.click(trigger);
    collect();
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });
  }
}

function tabLayout(bars: number): StaffLayout {
  return {
    barlines: [],
    measures: Array.from({ length: bars }, (_, i) => ({
      measureIndex: i,
      partIndex: 0,
      system: 0,
      x: 20 + i * 200,
      y: 28,
      width: 200,
      height: 128,
      startTick: i * 1920,
      endTick: (i + 1) * 1920,
    })),
    notes: [],
    rests: [],
    scale: 1,
    systemHeight: 168,
    stepPx: 6.5,
    topLineDrop: 13,
  };
}

function readPanel(
  flow: ActivityFlowV2,
  step: ActivityStepV2,
  key: GuitarKeyName,
) {
  useGuitarDisplaySettings.setState({ dismissedNotes: [] });
  const view = render(
    <GuitarTheoryPanel
      flow={flow}
      step={step}
      keyCenter={key}
      keyColor={RED}
      includePractice
      allowRomanToggle
      onHearShape={() => {}}
    />,
  );
  collect();
  clickAll('[data-why]');
  const more = screen.queryByRole('button', { name: /^More notes/ });
  if (more) fireEvent.click(more);
  clickAll('[data-info-note] > button');
  const compare = screen.queryByRole('button', {
    name: 'Same root, four kinds',
  });
  if (compare) fireEvent.click(compare);
  collect();
  view.unmount();
}

function readStrip(step: ActivityStepV2, key: GuitarKeyName) {
  const chords = guitarVisualModel(step, key).chords;
  if (chords.length < 2) return;
  const mapMeta = step.guitar?.musicMap;
  const view = render(
    <GuitarChordStrip
      chords={chords}
      currentIndex={0}
      keyColor={RED}
      heard={false}
      mirrored={false}
      keyCenter={key}
      stepPrefix={activityId(step).split('.')[0] as GuitarSubsectionPrefix}
      map={
        mapMeta
          ? GUITAR_ATLAS_BOOK_ONE[key].musicMaps[mapMeta.example - 1]
          : undefined
      }
    />,
  );
  openPopovers(view.container);
  view.unmount();
}

beforeEach(() => {
  localStorage.clear();
  seen.clear();
  useGuitarDisplaySettings.setState({
    dismissedNotes: [],
    showRomanNumerals: true,
    showChordJobs: true,
    showSharedNotes: true,
  });
});
afterEach(cleanup);

describe('theory copy guard', () => {
  it.each<GuitarKeyName>(['C', 'G', 'F#', 'Db', 'Bb'])(
    'shows only authored copy, filled in (%s)',
    (key) => {
      const flow = buildGuitarAppliedTheoryFundamentalsFlow(key);
      for (const step of flow.sections.flatMap((s) => s.steps)) {
        readPanel(flow, step, key);
        readStrip(step, key);
      }

      render(
        <GuitarSectionBCard
          flow={flow}
          keyCenter={key}
          keyColor={RED}
          onClose={() => {}}
        />,
      );
      fireEvent.click(
        screen.getByRole('button', { name: 'Where is chord 7?' }),
      );
      collect();
      cleanup();

      render(<GuitarKeyIntro keyCenter={key} defaultOpen />);
      collect();
      cleanup();

      for (const map of GUITAR_ATLAS_BOOK_ONE[key].musicMaps) {
        const view = render(
          <div style={{ position: 'relative' }}>
            <MusicMapOverlay
              layout={tabLayout(map.bars.length * 2 + 1)}
              keyCenter={key}
              map={map}
              countInOffset={1920}
              keyColor={RED}
              showChordJobs
              showRomanNumerals
            />
          </div>,
        );
        openPopovers(view.container);
        view.unmount();
      }

      // Every surface was reached, so the check below is not empty: step
      // intros and the (i) drawer, the Section B card, the key intro, the
      // chord strip's popovers and the compare panel's caption.
      expect(reached('a1.steps')).toBe(true);
      expect(reached('b7.why')).toBe(true);
      expect(reached('pt.focus')).toBe(true);
      expect(reached('b.fromScale')).toBe(true);
      expect(reached('b.sevenLater')).toBe(true);
      expect(reached('key.circle')).toBe(true);
      expect(reached('b8.topNote')).toBe(true);
      expect(reached('d3.tricky') || reached('b2.anchor')).toBe(true);
      expect(
        [...seen].some((text) =>
          pattern(GUITAR_THEORY_STRINGS['compare.caption']).test(text),
        ),
      ).toBe(true);

      expect([...seen].filter((text) => !isAuthored(text))).toEqual([]);
    },
    30_000,
  );

  it('reaches the Music Map chip notes (G Example 4)', () => {
    render(
      <div style={{ position: 'relative' }}>
        <MusicMapOverlay
          layout={tabLayout(9)}
          keyCenter="G"
          map={GUITAR_ATLAS_BOOK_ONE.G.musicMaps[3]}
          countInOffset={1920}
          keyColor={RED}
          showChordJobs
          showRomanNumerals
        />
      </div>,
    );
    openPopovers(document.body);
    expect(reached('d3.turnaround')).toBe(true);
    expect(reached('d3.twoFiveOneWrap')).toBe(true);
    expect([...seen].filter((text) => !isAuthored(text))).toEqual([]);
  });

  it('keeps every key intro to authored copy', () => {
    for (const key of GUITAR_KEY_ORDER) {
      render(<GuitarKeyIntro keyCenter={key} defaultOpen />);
      const texts = shownCopy();
      expect(texts.length).toBeGreaterThanOrEqual(6);
      expect(texts.filter((text) => !isAuthored(text))).toEqual([]);
      cleanup();
    }
  });
});
