import type { ChordRegion } from '@/daw/store/prismSlice';
import {
  regionToMeasures,
  measureSegments,
  parseChordDisplay,
  splitDuration,
  ticksToDuration,
  PPQ,
} from './leadSheetUtils';

// ── Types ────────────────────────────────────────────────────────────────

export interface LeadSheetOptions {
  title?: string;
  bpm: number;
  rootNote: number | null; // 0–11, null defaults to C
  mode?: string; // 'ionian', 'aeolian', etc.
  beatsPerMeasure?: number; // default 4
  beatType?: number; // default 4
}

// ── Root → MusicXML fifths ───────────────────────────────────────────────

const ROOT_TO_FIFTHS: Record<number, number> = {
  0: 0, // C
  7: 1, // G
  2: 2, // D
  9: 3, // A
  4: 4, // E
  11: 5, // B
  6: 6, // F# / Gb
  1: -5, // Db
  8: -4, // Ab
  3: -3, // Eb
  10: -2, // Bb
  5: -1, // F
};

function rootToFifths(rootNote: number | null): number {
  if (rootNote === null) return 0;
  return ROOT_TO_FIFTHS[rootNote] ?? 0;
}

// ── Mode → MusicXML mode string ─────────────────────────────────────────

const MODE_MAP: Record<string, string> = {
  ionian: 'major',
  dorian: 'dorian',
  phrygian: 'phrygian',
  lydian: 'lydian',
  mixolydian: 'mixolydian',
  aeolian: 'minor',
  locrian: 'locrian',
};

function modeToMusicXml(mode?: string): string {
  if (!mode) return 'major';
  return MODE_MAP[mode] ?? 'major';
}

// ── Abbreviated quality → MusicXML <kind> ────────────────────────────────

const QUALITY_TO_KIND: Record<string, string> = {
  maj: 'major',
  min: 'minor',
  aug: 'augmented',
  dim: 'diminished',
  sus2: 'suspended-second',
  sus4: 'suspended-fourth',
  '5': 'power',
  maj6: 'major-sixth',
  min6: 'minor-sixth',
  dom7: 'dominant',
  maj7: 'major-seventh',
  min7: 'minor-seventh',
  dim7: 'diminished-seventh',
  min7b5: 'half-diminished',
  maj7dim: 'half-diminished',
  minmaj7: 'major-minor',
  dom7sus2: 'dominant',
  dom7sus4: 'dominant',
  maj7sus2: 'major-seventh',
  maj7sus4: 'major-seventh',
  dom7b5: 'dominant',
  'dom7#5': 'dominant',
  'maj7#5': 'major-seventh',
  maj7b5: 'major-seventh',
  'min7#5': 'minor-seventh',
  dom9: 'dominant-ninth',
  maj9: 'major-ninth',
  min9: 'minor-ninth',
  dom7b9: 'dominant',
  'dom7#9': 'dominant',
  min7b9: 'minor-seventh',
  minmaj9: 'major-minor',
  'maj9#5': 'major-ninth',
  dim7b9: 'diminished-seventh',
  min7b5b9: 'half-diminished',
  'maj7#9': 'major-seventh',
  'dom7#5b9': 'dominant',
  'dom9#5': 'dominant-ninth',
  min9b5: 'half-diminished',
  'dom7#5#9': 'dominant',
  'maj7#5#9': 'major-seventh',
  min6add9: 'minor-sixth',
  maj6add9: 'major-sixth',
  'dom7#11': 'dominant',
  'maj7#11': 'major-seventh',
  dimmaj7: 'diminished',
  Add2: 'major',
  Add4: 'major',
};

// ── Parse chord noteName → MusicXML harmony parts ────────────────────────

interface HarmonyParts {
  rootStep: string;
  rootAlter: number;
  kindValue: string;
  kindText: string;
}

function parseChordForXml(noteName: string): HarmonyParts {
  const { root, quality } = parseChordDisplay(noteName);

  // Parse root letter + accidental
  const step = root[0].toUpperCase();
  let alter = 0;
  if (root.length > 1) {
    if (root[1] === 'b' || root[1] === '\u266D') alter = -1;
    if (root[1] === '#' || root[1] === '\u266F') alter = 1;
  }

  const kindValue = QUALITY_TO_KIND[quality] ?? 'other';

  return { rootStep: step, rootAlter: alter, kindValue, kindText: quality };
}

// ── XML Helpers ──────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function xmlHarmony(parts: HarmonyParts): string {
  const alterTag =
    parts.rootAlter !== 0 ? `<root-alter>${parts.rootAlter}</root-alter>` : '';

  const kindAttr =
    parts.kindValue === 'other'
      ? ` text="${esc(parts.kindText)}"`
      : parts.kindText
        ? ` text="${esc(parts.kindText)}"`
        : '';

  return [
    '      <harmony>',
    '        <root>',
    `          <root-step>${parts.rootStep}</root-step>`,
    alterTag ? `          ${alterTag}` : null,
    '        </root>',
    `        <kind${kindAttr}>${parts.kindValue}</kind>`,
    '      </harmony>',
  ]
    .filter(Boolean)
    .join('\n');
}

function xmlRest(durationTicks: number, isMeasureRest: boolean): string {
  const { type, dots } = ticksToDuration(durationTicks);
  const restTag = isMeasureRest ? '<rest measure="yes"/>' : '<rest/>';
  const dotTags = dots > 0 ? '\n        <dot/>' : '';

  return [
    '      <note>',
    `        ${restTag}`,
    `        <duration>${durationTicks}</duration>`,
    `        <type>${type}</type>${dotTags}`,
    '      </note>',
  ].join('\n');
}

// ── Main Builder ─────────────────────────────────────────────────────────

/**
 * Build a complete MusicXML document from ChordRegion[].
 */
export function buildLeadSheetXml(
  regions: ChordRegion[],
  options: LeadSheetOptions,
): string {
  const {
    title = 'Prism Lead Sheet',
    bpm,
    rootNote,
    mode,
    beatsPerMeasure = 4,
    beatType = 4,
  } = options;

  const ticksPerMeasure = beatsPerMeasure * PPQ;
  const measures = regionToMeasures(regions, ticksPerMeasure);
  const fifths = rootToFifths(rootNote);
  const modeStr = modeToMusicXml(mode);

  const today = new Date().toISOString().slice(0, 10);

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN"',
    '  "http://www.musicxml.org/dtds/partwise.dtd">',
    '<score-partwise version="4.0">',
    '  <work>',
    `    <work-title>${esc(title)}</work-title>`,
    '  </work>',
    '  <identification>',
    '    <encoding>',
    '      <software>Prism DAW</software>',
    `      <encoding-date>${today}</encoding-date>`,
    '    </encoding>',
    '  </identification>',
    '  <part-list>',
    '    <score-part id="P1">',
    '      <part-name>Lead Sheet</part-name>',
    '    </score-part>',
    '  </part-list>',
    '  <part id="P1">',
  ];

  for (const measure of measures) {
    lines.push(`    <measure number="${measure.index + 1}">`);

    // First measure: attributes + tempo
    if (measure.index === 0) {
      lines.push(
        '      <attributes>',
        `        <divisions>${PPQ}</divisions>`,
        '        <key>',
        `          <fifths>${fifths}</fifths>`,
        `          <mode>${modeStr}</mode>`,
        '        </key>',
        '        <time>',
        `          <beats>${beatsPerMeasure}</beats>`,
        `          <beat-type>${beatType}</beat-type>`,
        '        </time>',
        '        <clef>',
        '          <sign>G</sign>',
        '          <line>2</line>',
        '        </clef>',
        '      </attributes>',
        '      <direction placement="above">',
        '        <direction-type>',
        `          <words>\u2669 = ${bpm}</words>`,
        '        </direction-type>',
        `        <sound tempo="${bpm}"/>`,
        '      </direction>',
      );
    }

    const segments = measureSegments(measure, ticksPerMeasure);

    if (segments.length === 1 && !segments[0].chord) {
      // Empty measure — whole rest
      lines.push(xmlRest(ticksPerMeasure, true));
    } else {
      for (const seg of segments) {
        if (seg.chord) {
          const parts = parseChordForXml(seg.chord.noteName);
          lines.push(xmlHarmony(parts));
        }
        // Split duration into valid note values if needed
        const restParts = splitDuration(seg.durationTicks);
        for (const rp of restParts) {
          lines.push(xmlRest(rp, false));
        }
      }
    }

    lines.push('    </measure>');
  }

  lines.push('  </part>', '</score-partwise>');

  return lines.join('\n');
}

// ── Blob + Download ──────────────────────────────────────────────────────

export function exportLeadSheetBlob(
  regions: ChordRegion[],
  options: LeadSheetOptions,
): Blob {
  const xml = buildLeadSheetXml(regions, options);
  return new Blob([xml], {
    type: 'application/vnd.recordare.musicxml+xml',
  });
}

export function downloadLeadSheet(
  regions: ChordRegion[],
  options: LeadSheetOptions,
  filename = 'prism-lead-sheet.musicxml',
): void {
  const blob = exportLeadSheetBlob(regions, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
