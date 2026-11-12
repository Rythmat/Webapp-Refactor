import { WORD_CAPS } from '@/curriculum/audio/lessons/lintLesson';
import {
  chapterScreens,
  isCheckedScreen,
  type GuidedChapter,
  type Rich,
  type Why,
} from './types';

// ── A played lesson's house rules ──────────────────────────────────────────
// Audio's, so that the two formats read as one: one idea a screen, the student
// playing by the second, every wrong answer explained.

const MAX_BOLD_TERMS = 2;

const words = (text: Rich) => text.split(/\s+/).filter(Boolean).length;
const boldCount = (text: Rich) => (text.match(/\*\*[^*]+\*\*/g) ?? []).length;
const whyWords = (why: Why) =>
  why.paragraphs.reduce((sum, p) => sum + words(p), 0);

/** Everything wrong with a chapter, in words. Empty means it passes. */
export function lintChapter(id: string, chapter: GuidedChapter): string[] {
  const problems: string[] = [];
  const screens = chapterScreens(chapter);
  const note = (screenId: string, problem: string) =>
    problems.push(`${id}/${screenId}: ${problem}`);

  const ids = screens.map((s) => s.id);
  if (new Set(ids).size !== ids.length)
    problems.push(`${id}: screen ids repeat`);

  const first = chapter.screens[0];
  if (!first || !isCheckedScreen(first)) {
    problems.push(`${id}: the screen after the hook must be checked`);
  }
  if (words(chapter.hook.title) > WORD_CAPS.hookTitle) {
    note('hook', `title over ${WORD_CAPS.hookTitle} words`);
  }

  screens.forEach((screen, i) => {
    const check = (text: Rich, cap: number, what: string) => {
      if (words(text) > cap) note(screen.id, `${what} over ${cap} words`);
    };
    check(screen.body, WORD_CAPS.body, 'body');
    if (boldCount(screen.body) > MAX_BOLD_TERMS) {
      note(screen.id, `over ${MAX_BOLD_TERMS} bold terms`);
    }
    if (screen.kind === 'explain') {
      const following = screens[i + 1];
      if (!following || !isCheckedScreen(following)) {
        note(screen.id, 'an explanation must be followed by using it');
      }
    }
    if (screen.kind === 'play') {
      if (!screen.rungs.length) note(screen.id, 'nothing to play');
      check(screen.right, WORD_CAPS.feedback, 'right');
      Object.entries(screen.faults ?? {}).forEach(([fault, text]) =>
        check(text, WORD_CAPS.feedback, `${fault} feedback`),
      );
    }
    if (screen.kind === 'pick') {
      check(screen.right, WORD_CAPS.feedback, 'right');
      check(screen.extra(['F♯', 'B♭']), WORD_CAPS.feedback, 'extra feedback');
      check(screen.missing(5, 7), WORD_CAPS.feedback, 'missing feedback');
      if (!screen.scale.includes(screen.tonicPc)) {
        note(screen.id, 'the tonic isn’t in the scale');
      }
    }
    if (screen.kind === 'choose') {
      check(screen.right, WORD_CAPS.feedback, 'right');
      if (!screen.choices.some((c) => c.id === screen.correct)) {
        note(screen.id, 'the right answer isn’t among the choices');
      }
      screen.choices.forEach((choice) => {
        if (choice.id === screen.correct) return;
        if (!choice.feedback) note(screen.id, `${choice.id} says nothing`);
        else
          check(choice.feedback, WORD_CAPS.feedback, `${choice.id} feedback`);
      });
    }
    if (isCheckedScreen(screen) && whyWords(screen.why) > WORD_CAPS.why) {
      note(screen.id, `why over ${WORD_CAPS.why} words`);
    }
    if (screen.kind === 'takeaway') {
      check(screen.inSession, WORD_CAPS.inSession, 'inSession');
      check(screen.limits, WORD_CAPS.limits, 'limits');
    }
  });
  return problems;
}
