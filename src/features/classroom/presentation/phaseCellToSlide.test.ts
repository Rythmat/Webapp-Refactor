import { describe, expect, it } from 'vitest';
import type { StudentPhaseView } from '../buildStudentView';
import { PHASES, STUDENT_PHASE_LABELS } from '../phases';
import { phaseCellToSlide } from './phaseCellToSlide';

const base = (over: Partial<StudentPhaseView> = {}): StudentPhaseView => ({
  phaseKey: 'connectRegulate',
  label: STUDENT_PHASE_LABELS.connectRegulate,
  title: { en: '', es: '' },
  prompt: { en: '', es: '' },
  launchTiles: [],
  ...over,
});

describe('phaseCellToSlide', () => {
  it('produces a content slide anchored to the phase', () => {
    const slide = phaseCellToSlide(base({ title: { en: 'Warm up' } }));
    expect(slide.kind).toBe('content');
    expect(slide.phase).toBe('connectRegulate');
    expect(slide.id).toBe('present-connectRegulate');
  });

  it('keeps title + prompt when a title is present', () => {
    const slide = phaseCellToSlide(
      base({ title: { en: 'Warm up' }, prompt: { en: 'Sing the scale' } }),
    );
    expect(slide.title.en).toBe('Warm up');
    expect(slide.prompt?.en).toBe('Sing the scale');
  });

  it('promotes the prompt to the headline when the title is blank (no run-on, no chip dupe)', () => {
    const slide = phaseCellToSlide(
      base({ title: { en: '' }, prompt: { en: 'Class Playlist Shuffle.' } }),
    );
    expect(slide.title.en).toBe('Class Playlist Shuffle.');
    expect(slide.prompt).toBeUndefined();
  });

  it('preserves the Spanish line when promoting the prompt', () => {
    const slide = phaseCellToSlide(
      base({
        title: { en: '' },
        prompt: { en: 'Shuffle', es: 'Mezcla' },
      }),
    );
    expect(slide.title).toEqual({ en: 'Shuffle', es: 'Mezcla' });
  });

  it('falls back to the phase label only when both title and prompt are empty', () => {
    const slide = phaseCellToSlide(base({ title: { en: '' }, prompt: { en: '' } }));
    expect(slide.title).toEqual(STUDENT_PHASE_LABELS.connectRegulate);
    expect(slide.prompt).toBeUndefined();
  });

  it('attaches artistImage media when a song reference is present', () => {
    const slide = phaseCellToSlide(
      base({ title: { en: 'x' }, song: { id: 'lovely_day' } }),
    );
    expect(slide.media).toEqual({ type: 'artistImage', songId: 'lovely_day' });
  });

  it('omits media when there is no song', () => {
    const slide = phaseCellToSlide(base({ title: { en: 'x' } }));
    expect(slide.media).toBeUndefined();
  });

  it('produces a slide for every phase', () => {
    for (const phaseKey of PHASES) {
      const slide = phaseCellToSlide(
        base({ phaseKey, label: STUDENT_PHASE_LABELS[phaseKey], title: { en: 't' } }),
      );
      expect(slide.phase).toBe(phaseKey);
      expect(slide.id).toBe(`present-${phaseKey}`);
    }
  });
});
