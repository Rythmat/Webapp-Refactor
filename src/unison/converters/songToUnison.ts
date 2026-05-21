/**
 * Song (chord-chart curriculum entry) → UnisonDocument.
 *
 * The Song dictionary at src/curriculum/data/songs/ holds 664 chord-chart
 * entries authored by the Music Atlas PDF pipeline. Each Song's bars/chords
 * lower to lead-sheet ChordRegions, which the existing leadSheetConverters
 * pipeline already knows how to analyze, so this converter is a thin adapter:
 *
 *   Song → ChordRegion[] + sections + repeats → leadSheetToUnison()
 *
 * Repeat semantics: `section.repeatCount` is captured as a LeadSheetRepeat
 * marker over the section's measure range rather than unrolled. Unrolling
 * would over-weight the section's chords during progression matching.
 */

import type { Song, ChordHit } from '@/curriculum/types/songLibrary';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { LeadSheetRepeat, LeadSheetSection } from '@/daw/store/uiSlice';
import {
  arrangeForStyle,
  type ArrangeForStyleOptions,
} from '../engine/arrangeForStyle';
import { applyBass, type RenderBassOptions } from '../engine/bassRenderer';
import {
  applyComping,
  type RenderCompingOptions,
} from '../engine/compingRenderer';
import { applyDrums, type RenderDrumsOptions } from '../engine/drumRenderer';
import {
  applyMelody,
  type MelodyConfig,
  type RenderMelodyOptions,
} from '../engine/melodyRenderer';
import {
  applyVoicingsToTimeline,
  type RenderVoicingOptions,
} from '../engine/voicingRenderer';
import type { UnisonDocument } from '../types/schema';
import {
  leadSheetToUnison,
  type LeadSheetToUnisonOptions,
} from './leadSheetConverters';

const PPQ = 480;

export interface SongToUnisonOptions {
  /** Override the song's title in metadata. */
  title?: string;
  /**
   * Apply a Genre Voicing Taxonomy voicing to each chord in the timeline.
   * When set, every chord region whose quality is covered by the taxonomy
   * gets `voicingNotes` and `voicingId` populated.
   */
  applyGenreVoicings?: {
    genre: string;
    level: number;
    renderOptions?: RenderVoicingOptions;
  };
  /**
   * Apply a comping pattern from the Comping Pattern Library, emitted as a
   * chords track on the document. If `applyGenreVoicings` is also set, the
   * voicings populated by it are what the comping pattern strikes.
   */
  applyComping?: {
    patternId: string;
    renderOptions?: RenderCompingOptions;
  };
  /**
   * Apply a bass line from the Bass Pattern Library, emitted as a bass
   * track on the document. Composes a contour (pitch sequence) with a
   * rhythm (timing) per chord region.
   */
  applyBass?: {
    contourId: string;
    rhythmId: string;
    renderOptions?: RenderBassOptions;
  };
  /**
   * Apply a drum groove from the Studio drum pattern library, emitted as
   * a drums track. Bar count is auto-derived from the song's duration.
   */
  applyDrums?: Omit<RenderDrumsOptions, 'bars'> & { bars?: number };
  /**
   * Generate a melodic line over the chord timeline using the Melody
   * Contour + Phrase Rhythm libraries, emitted as a melody track.
   */
  applyMelody?: {
    config: MelodyConfig;
    renderOptions?: RenderMelodyOptions;
  };
  /**
   * One-shot arrangement: parse a natural-language style phrase
   * (e.g. "advanced funk", "pop jazz", "smooth jazz") and apply all five
   * Phase-4 renderers automatically using the matching GCM entry. Skipped
   * if the phrase doesn't parse (use `applyStyleOptions.strict` to throw).
   */
  applyStyle?: string;
  applyStyleOptions?: ArrangeForStyleOptions;
}

/**
 * Convert a Song chord-chart entry into a full UnisonDocument.
 */
export function songToUnison(
  song: Song,
  options?: SongToUnisonOptions,
): UnisonDocument {
  const [tsNum, tsDen] = song.timeSignature;
  const ticksPerMeasure = tsNum * PPQ;
  const ticksPerBeat = PPQ;

  const chordRegions: ChordRegion[] = [];
  const sections: LeadSheetSection[] = [];
  const repeats: LeadSheetRepeat[] = [];

  let measureCursor = 0;
  let chordIdx = 0;

  for (const section of song.sections) {
    const sectionStartMeasure = measureCursor;

    sections.push({
      measureIdx: sectionStartMeasure,
      label: section.label,
    });

    for (const bar of section.bars) {
      const barStartTick = measureCursor * ticksPerMeasure;
      const barSpan = bar.restBars && bar.restBars > 0 ? bar.restBars : 1;

      // Only emit chord regions for non-rest bars.
      if (!bar.restBars || bar.restBars <= 0) {
        for (const chord of bar.chords) {
          chordRegions.push(
            chordHitToRegion(chord, barStartTick, ticksPerBeat, chordIdx++),
          );
        }
      }

      measureCursor += barSpan;
    }

    // section.repeatCount represents play count; >1 means "repeat this section".
    // Encode as a single repeat marker over the section's measure range — the
    // play count itself is not representable in LeadSheetRepeat, so the Song
    // dictionary remains the source of truth for it.
    if (
      section.repeatCount &&
      section.repeatCount > 1 &&
      measureCursor > sectionStartMeasure
    ) {
      repeats.push({
        startMeasure: sectionStartMeasure,
        endMeasure: measureCursor - 1,
      });
    }
  }

  const opts: LeadSheetToUnisonOptions = {
    bpm: song.tempo,
    rootNote: song.keyRoot % 12,
    mode: normalizeMode(song.mode),
    timeSignatureNumerator: tsNum,
    timeSignatureDenominator: tsDen,
    title: options?.title ?? song.title,
  };

  let doc = leadSheetToUnison({ chordRegions, sections, repeats }, opts);

  if (options?.applyGenreVoicings) {
    const { genre, level, renderOptions } = options.applyGenreVoicings;
    doc.analysis.chordTimeline = applyVoicingsToTimeline(
      doc.analysis.chordTimeline,
      genre,
      level,
      renderOptions,
    );
  }

  if (options?.applyComping) {
    doc = applyComping(
      doc,
      options.applyComping.patternId,
      options.applyComping.renderOptions,
    );
  }

  if (options?.applyBass) {
    doc = applyBass(
      doc,
      options.applyBass.contourId,
      options.applyBass.rhythmId,
      options.applyBass.renderOptions,
    );
  }

  if (options?.applyDrums) {
    doc = applyDrums(doc, options.applyDrums);
  }

  if (options?.applyMelody) {
    doc = applyMelody(
      doc,
      options.applyMelody.config,
      options.applyMelody.renderOptions,
    );
  }

  if (options?.applyStyle) {
    doc = arrangeForStyle(
      doc,
      options.applyStyle,
      options.applyStyleOptions,
    ).doc;
  }

  return doc;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function chordHitToRegion(
  chord: ChordHit,
  barStartTick: number,
  ticksPerBeat: number,
  idx: number,
): ChordRegion {
  const startTick = barStartTick + (chord.beat - 1) * ticksPerBeat;
  const endTick = startTick + chord.duration * ticksPerBeat;
  return {
    id: `song-chord-${idx}`,
    startTick,
    endTick,
    name: chord.degree,
    noteName: chord.chordName,
    color: [0, 0, 0],
  };
}

/** Song.mode uses 'major'/'minor' aliases; the engine expects 'ionian'/'aeolian'. */
function normalizeMode(mode: Song['mode']): string {
  if (mode === 'major') return 'ionian';
  if (mode === 'minor') return 'aeolian';
  return mode;
}
