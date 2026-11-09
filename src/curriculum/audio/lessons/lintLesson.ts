import { STEMS } from '../mix/stems';
import {
  allScreens,
  isChecked,
  type LessonScript,
  type Rich,
  type Why,
} from './types';

// ── A lesson's house rules ─────────────────────────────────────────────────
// What makes a lesson read as one idea at a time, checked by a test over every
// script, so that a new one can't drift back to a wall of text.

export const WORD_CAPS = {
  body: 45,
  hookTitle: 12,
  feedback: 30,
  why: 140,
  inSession: 40,
  limits: 40,
} as const;

const MAX_BOLD_TERMS = 2;

const words = (text: Rich) => text.split(/\s+/).filter(Boolean).length;
const boldCount = (text: Rich) => (text.match(/\*\*[^*]+\*\*/g) ?? []).length;
const whyWords = (why: Why) =>
  why.paragraphs.reduce((sum, p) => sum + words(p), 0);

/** Everything wrong with a lesson, in words. Empty means it passes. */
export function lintLesson<S>(script: LessonScript<S>): string[] {
  const problems: string[] = [];
  const screens = allScreens(script);
  const note = (id: string, problem: string) =>
    problems.push(`${script.id}/${id}: ${problem}`);

  const ids = screens.map((s) => s.id);
  if (new Set(ids).size !== ids.length) {
    problems.push(`${script.id}: screen ids repeat`);
  }
  if (ids.includes('done')) problems.push(`${script.id}: "done" is reserved`);

  // The student does something by the second screen.
  const first = script.screens[0];
  if (!first || !isChecked(first)) {
    problems.push(`${script.id}: the screen after the hook must be checked`);
  }

  screens.forEach((screen, i) => {
    const check = (text: Rich, cap: number, what: string) => {
      if (words(text) > cap) note(screen.id, `${what} over ${cap} words`);
    };
    check(screen.body, WORD_CAPS.body, 'body');
    if (boldCount(screen.body) > MAX_BOLD_TERMS) {
      note(screen.id, `over ${MAX_BOLD_TERMS} bold terms`);
    }
    // An explanation is followed by using it.
    if (screen.kind === 'explain') {
      const following = screens[i + 1];
      if (!following || !isChecked(following)) {
        note(screen.id, 'an explain must be followed by a checked screen');
      }
    }
    if (isChecked(screen) && whyWords(screen.why) > WORD_CAPS.why) {
      note(screen.id, `why over ${WORD_CAPS.why} words`);
    }
    if (screen.kind === 'hook') {
      check(screen.title, WORD_CAPS.hookTitle, 'title');
    }
    if (screen.kind === 'do') {
      for (const [mistake, text] of Object.entries(screen.feedback)) {
        check(text as Rich, WORD_CAPS.feedback, `feedback "${mistake}"`);
      }
      const answered = screen.evaluate({
        ...script.initial,
        ...screen.scene,
        ...screen.answer,
      });
      if (!answered.ok) note(screen.id, 'its own answer fails');
      const seen = new Set<string>();
      for (const probe of screen.probes) {
        const verdict = screen.evaluate({
          ...script.initial,
          ...screen.scene,
          ...screen.answer,
          ...probe.scene,
        });
        const got = verdict.ok ? 'ok' : verdict.mistake;
        seen.add(got);
        if (got !== probe.expect) {
          note(screen.id, `probe expected ${probe.expect}, got ${got}`);
        }
      }
      for (const mistake of Object.keys(screen.feedback)) {
        if (!seen.has(mistake)) note(screen.id, `no probe for "${mistake}"`);
      }
      if (!seen.has('ok')) note(screen.id, 'no probe that passes');
    }
    if (screen.kind === 'choose') {
      if (!screen.choices.some((c) => c.id === screen.correct)) {
        note(screen.id, 'correct is not one of its choices');
      }
      for (const choice of screen.choices) {
        if (choice.id === screen.correct) continue;
        if (!choice.feedback) note(screen.id, `"${choice.id}" has no feedback`);
        else check(choice.feedback, WORD_CAPS.feedback, 'feedback');
      }
    }
    if (screen.kind === 'takeaway') {
      check(screen.inSession, WORD_CAPS.inSession, 'inSession');
      check(screen.limits, WORD_CAPS.limits, 'limits');
    }
  });

  const known = new Set<string>(STEMS.map((s) => s.id));
  for (const need of script.needs) {
    if (!known.has(need)) problems.push(`${script.id}: no stem "${need}"`);
  }
  return problems;
}
