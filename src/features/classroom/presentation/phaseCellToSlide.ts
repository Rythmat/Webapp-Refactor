/**
 * phaseCellToSlide — adapts a legacy phase cell (`StudentPhaseView`) into a
 * deck `Slide` so Presentation Mode can render through the same shell the deck
 * surfaces use (`SlideFrame` + `SlideHeading` + `SlideMediaPanel`). Pure: no
 * React, no data-library imports.
 *
 * Title handling (the screenshot's run-on-heading bug): annual-plan stub Days
 * seed `title:{en:''}`, so the prompt was rendering as an accidental giant
 * headline. `SlideFrame` already shows the phase name as its chip, so we do NOT
 * fall back to the phase label as the title (that would duplicate the chip).
 * Instead, when the title is blank we promote the prompt into the title slot so
 * it becomes a real headline; the phase label is only used when a phase has no
 * text at all.
 *
 * Song handling: a `song` reference becomes an `artistImage` media block on the
 * content slide; `SlideMediaPanel` resolves it to artwork (via getSong) with a
 * HexAvatar/initials fallback — no raw slug, no data-library import here.
 */
import type { StudentPhaseView } from '../buildStudentView';
import type { ContentSlide } from '../slides/types';
import type { LocalizedText } from '../types';

const hasText = (t: LocalizedText): boolean => Boolean(t.en?.trim());

export const phaseCellToSlide = (phase: StudentPhaseView): ContentSlide => {
  let title: LocalizedText;
  let prompt: LocalizedText | undefined;
  if (hasText(phase.title)) {
    title = phase.title;
    prompt = hasText(phase.prompt) ? phase.prompt : undefined;
  } else if (hasText(phase.prompt)) {
    // Promote the prompt to the headline; no separate prompt line.
    title = phase.prompt;
    prompt = undefined;
  } else {
    // Truly empty phase — at least name it.
    title = phase.label;
    prompt = undefined;
  }

  return {
    id: `present-${phase.phaseKey}`,
    kind: 'content',
    phase: phase.phaseKey,
    title,
    ...(prompt ? { prompt } : {}),
    ...(phase.song
      ? { media: { type: 'artistImage', songId: phase.song.id } as const }
      : {}),
  };
};
