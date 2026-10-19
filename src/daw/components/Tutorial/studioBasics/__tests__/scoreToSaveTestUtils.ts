import { describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import { applyDemo } from '@/daw/data/demoSeed';
import { getDemoProject } from '@/daw/data/demoProjects';
import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import { useStore, type AllSlices } from '@/daw/store';
import type { DemoBeat } from '../../demo/demoTypes';
import { getTutorial, type TutorialStep } from '../../tutorials';

// ── Shared by the tests of Studio Basics 6 to 9 ────────────────────────────
// The course's song opened as a cold start opens it, a step armed as the
// lesson layer arms it, and the conventions every lesson's steps and demos
// keep (demo/demoTypes.ts): short sentence-case captions, plain hints, a
// demo that puts back what it opens and never does the student's task.
// Whether a demo leaves the real Studio as it found it is for the browser
// walkthrough, which compares the store before and after every demo.

export const s = () => useStore.getState();

export function stepsOf(lesson: string): TutorialStep[] {
  const tutorial = getTutorial(lesson);
  if (!tutorial) throw new Error(`no lesson ${lesson}`);
  return tutorial.steps;
}

export function stepOf(lesson: string, id: string): TutorialStep {
  const step = stepsOf(lesson).find((st) => st.id === id);
  if (!step) throw new Error(`no step ${lesson}/${id}`);
  return step;
}

/** A drum groove, two hits a bar for the song's four bars. */
const DRUMS: MidiNoteEvent[] = Array.from({ length: 8 }, (_, i) => ({
  note: i % 2 ? 38 : 36,
  velocity: 100,
  startTick: i * 960,
  durationTicks: 120,
  channel: 9,
}));

/**
 * The course's song, "Studio Basics Song", opened as a cold start opens it
 * (its groove stands in for the one the Grooves library would fetch).
 */
export function openDemoSong(): void {
  s().quitTutorial();
  resetProjectState('open:demo');
  const demo = getDemoProject('demo-studio-basics');
  if (!demo) throw new Error('no demo-studio-basics');
  applyDemo({ demo, drums: DRUMS, grooveName: 'Rock 2' });
}

/**
 * Arms a step as TutorialLayer and useTutorialDetection do: its `requires`
 * applied, then the Studio as it is becomes the snapshot the check compares
 * with. `passes()` asks the check about the Studio now.
 */
export function arm(lesson: string, id: string) {
  const step = stepOf(lesson, id);
  const r = step.requires;
  if (r?.view !== undefined) s().setCurrentView(r.view);
  if (r?.libraryOpen !== undefined) s().setLibraryOpen(r.libraryOpen);
  const armed: AllSlices = s();
  const check = step.check;
  if (!check) throw new Error(`${lesson}/${id} has no check`);
  return { armed, passes: () => check(s(), armed) };
}

export function trackNamed(name: string) {
  const track = s().tracks.find((t) => t.name === name);
  if (!track) throw new Error(`no ${name} track`);
  return track;
}

/** Rewrites the events of the first clip of track `name`. */
export function writeEvents(
  name: string,
  edit: (events: MidiNoteEvent[]) => MidiNoteEvent[],
): void {
  const track = trackNamed(name);
  const clip = track.midiClips[0];
  s().updateMidiClipEvents(track.id, clip.id, edit([...clip.events]));
}

// ── The conventions ────────────────────────────────────────────────────────

const targetsOf = (target: DemoBeat['target']): string[] =>
  !target ? [] : Array.isArray(target) ? [...target] : [target as string];

const isKey = (beat: DemoBeat, key: string) =>
  typeof beat.action === 'object' && beat.action.key === key;

/** Controls that finish something: a demo may point at them, never press them. */
const DOING = [
  'file-save',
  'file-save-as',
  'file-export-midi',
  'file-export-musicxml',
  'export-audio-run',
  'score-print',
  'score-export-musicxml',
  'leadsheet-print',
  'leadsheet-export-musicxml',
  'leadsheet-melody-auto',
  'clip-menu-duplicate',
  'clip-menu-copy',
  'clip-menu-paste',
  'lane-menu-paste',
  'track-menu-duplicate',
];
const doing = (id: string) =>
  DOING.includes(id) || id.startsWith('leadsheet-melody-track-');

/** On and off again: a demo clicks these an even number of times. */
const TOGGLES = [
  'score-note-input',
  'leadsheet-melody-toggle',
  'leadsheet-melody-picker',
];

/** What a click opens, for Esc to close: a menu, a dialog. */
const OPENERS = ['file-menu', 'file-export-audio'];

const words = (text: string) =>
  text.replace(/\*\*/g, '').trim().split(/\s+/).length;

/** The checks every one of these lessons keeps, as tests. */
export function describeLessonConventions(lesson: string): void {
  describe(`${lesson}: the conventions`, () => {
    const steps = stepsOf(lesson);
    const title = getTutorial(lesson)!.title;

    it('is labelled with its title in sentence case, step by step', () => {
      const stage = title[0] + title.slice(1).toLowerCase();
      for (const step of steps) expect(step.stage, step.id).toBe(stage);
    });

    it('checks every step but the last, a wrap-up the student finishes', () => {
      const last = steps[steps.length - 1];
      expect(last.check).toBeUndefined();
      expect(last.demo).toBeUndefined();
      expect(last.instruction).toMatch(/Press \*\*Finish\*\*/);
      for (const step of steps.slice(0, -1)) {
        expect(step.check, step.id).toBeTypeOf('function');
        expect(step.demo?.length, step.id).toBeGreaterThan(0);
        expect(step.demo!.length, step.id).toBeLessThanOrEqual(5);
      }
      expect(steps.length).toBeGreaterThanOrEqual(5);
      expect(steps.length).toBeLessThanOrEqual(9);
    });

    it('sets its view as each step arrives', () => {
      for (const step of steps.slice(0, -1)) {
        expect(step.requires?.view, step.id).toBeDefined();
      }
    });

    it('writes short captions and plain instructions', () => {
      for (const step of steps) {
        const text = [step.instruction, step.hint ?? ''].join(' ');
        expect(text, step.id).not.toMatch(/\b(simply|just)\b/i);
        expect(text, step.id).not.toMatch(/colour|favourite|organis/i);
        // The coach card writes a hint as plain text: bold is for instructions.
        expect(step.hint ?? '', step.id).not.toContain('**');
        for (const beat of step.demo ?? []) {
          expect(words(beat.caption), beat.caption).toBeGreaterThanOrEqual(3);
          expect(words(beat.caption), beat.caption).toBeLessThanOrEqual(8);
          expect(beat.caption).not.toMatch(/\b(simply|just)\b/i);
          // Sentence case: a capital first, no full stop.
          expect(beat.caption, beat.caption).toMatch(/^(\*\*)?[A-Z↑↓]/);
          expect(beat.caption.endsWith('.'), beat.caption).toBe(false);
        }
      }
    });

    describe.each(steps.filter((st) => st.demo))('$id’s demo', (step) => {
      const beats = step.demo!;

      it('doesn’t do the student’s task', () => {
        for (const beat of beats) {
          if (
            beat.action === 'click' ||
            beat.action === 'doubleClick' ||
            typeof beat.action === 'function'
          ) {
            for (const id of targetsOf(beat.target)) {
              expect(doing(id), `${step.id} presses ${id}`).toBe(false);
            }
          }
          // No typing into a field (a chord, a name): only Esc leaves one.
          if (typeof beat.action === 'object' && beat.action.on === 'element') {
            expect(beat.action.key, step.id).toBe('Escape');
          }
        }
      });

      it('puts back what it opens', () => {
        for (const toggle of TOGGLES) {
          const clicks = beats.filter(
            (b) => b.action === 'click' && targetsOf(b.target).includes(toggle),
          ).length;
          expect(clicks % 2, `${step.id}: ${toggle}`).toBe(0);
        }
        // A view it opens, it leaves for the view the step set.
        const views = beats.filter(
          (b) =>
            b.action === 'click' &&
            targetsOf(b.target).some((id) => id.startsWith('view-switch-')),
        );
        if (views.length > 0) {
          expect(targetsOf(views[views.length - 1].target)).toEqual([
            `view-switch-${step.requires?.view}`,
          ]);
        }
        // A menu, a dialog or an edit box it opens, Esc closes, after it.
        const opens = beats.flatMap((b, i) =>
          b.action === 'contextMenu' ||
          b.action === 'doubleClick' ||
          (b.action === 'click' &&
            targetsOf(b.target).some((id) => OPENERS.includes(id)))
            ? [i]
            : [],
        );
        const closes = beats.flatMap((b, i) => (isKey(b, 'Escape') ? [i] : []));
        if (opens.length > 0) {
          expect(closes.length, step.id).toBeGreaterThan(0);
          expect(Math.max(...closes), step.id).toBeGreaterThan(
            Math.max(...opens),
          );
        }
        // A note moved up is moved back down.
        expect(beats.filter((b) => isKey(b, 'ArrowUp')).length).toBe(
          beats.filter((b) => isKey(b, 'ArrowDown')).length,
        );
      });
    });
  });
}
