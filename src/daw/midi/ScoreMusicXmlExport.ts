import type {
  Accidental,
  NotationItem,
  NotationKey,
  NotationScore,
  NoteValue,
  StaffId,
} from '@/lib/notation/types';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { LeadSheetRepeat, LeadSheetSection } from '@/daw/store/uiSlice';
import { harmonyXml } from './MusicXmlExport';

/**
 * The Studio Score as MusicXML: every part, written from the same engine
 * score the page is drawn from — both staves of a grand staff, second voices,
 * ties, triplets, dots and accidentals, drum notation — plus what the Score
 * lays over the notes: chord symbols, articulations, slurs, rehearsal marks,
 * repeats and system breaks.
 */
export interface ScoreXmlPart {
  id: string;
  name: string;
  score: NotationScore;
  drums: boolean;
}

export interface ScoreXmlOptions {
  title: string;
  composer?: string;
  bpm: number;
  /** Chord symbols, placed on `chordPartIds` (the top part when empty). */
  chordRegions?: readonly ChordRegion[];
  chordPartIds?: ReadonlySet<string>;
  /** Articulation kinds by note id, as the Score stores them. */
  articulations?: ReadonlyMap<string, readonly string[]>;
  /** Slurs as [first note id, last note id]. */
  slurs?: readonly (readonly [string, string])[];
  sections?: readonly LeadSheetSection[];
  repeats?: readonly LeadSheetRepeat[];
  /** Measure indexes (0-based) that start a new system. */
  systemStarts?: ReadonlySet<number>;
}

const TYPE: Record<NoteValue, string> = {
  w: 'whole',
  h: 'half',
  q: 'quarter',
  '8': 'eighth',
  '16': '16th',
  '32': '32nd',
};

const ACCIDENTAL: Record<Accidental, string> = {
  bb: 'flat-flat',
  b: 'flat',
  n: 'natural',
  '#': 'sharp',
  '##': 'double-sharp',
};

const CLEF: Record<StaffId, string> = {
  treble: '<sign>G</sign><line>2</line>',
  bass: '<sign>F</sign><line>4</line>',
  percussion: '<sign>percussion</sign>',
};

/** Articulation kinds as MusicXML writes them; fermata is its own element. */
const ARTICULATION: Record<string, string> = {
  staccato: '<staccato/>',
  accent: '<accent/>',
  marcato: '<strong-accent type="up"/>',
  tenuto: '<tenuto/>',
};

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function buildScoreXml(
  parts: readonly ScoreXmlPart[],
  options: ScoreXmlOptions,
): string {
  const {
    title,
    composer,
    bpm,
    chordRegions = [],
    articulations = new Map(),
    slurs = [],
    sections = [],
    repeats = [],
    systemStarts = new Set(),
  } = options;
  const chordParts =
    options.chordPartIds && options.chordPartIds.size > 0
      ? options.chordPartIds
      : new Set(parts.slice(0, 1).map((p) => p.id));
  const slurStarts = new Map(slurs.map(([from], i) => [from, i + 1]));
  const slurEnds = new Map(slurs.map(([, to], i) => [to, i + 1]));
  const repeatStarts = new Set(repeats.map((r) => r.startMeasure));
  const repeatEnds = new Set(repeats.map((r) => r.endMeasure));
  const sectionAt = new Map(sections.map((s) => [s.measureIdx, s.label]));

  const out: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
    '<score-partwise version="4.0">',
    `  <work><work-title>${esc(title)}</work-title></work>`,
    '  <identification>',
    composer ? `    <creator type="composer">${esc(composer)}</creator>` : '',
    `    <encoding><software>Music Atlas</software><encoding-date>${new Date().toISOString().slice(0, 10)}</encoding-date></encoding>`,
    '  </identification>',
    '  <part-list>',
    ...parts.map(
      (part, i) =>
        `    <score-part id="P${i + 1}"><part-name>${esc(part.name)}</part-name></score-part>`,
    ),
    '  </part-list>',
  ].filter(Boolean);

  parts.forEach((part, partIndex) => {
    const { score } = part;
    const top = partIndex === 0;
    out.push(`  <part id="P${partIndex + 1}">`);
    score.measures.forEach((measure, m) => {
      out.push(`    <measure number="${measure.number}">`);
      if (top && m > 0 && systemStarts.has(m)) {
        out.push('      <print new-system="yes"/>');
      }
      if (repeatStarts.has(m)) {
        out.push(
          '      <barline location="left"><bar-style>heavy-light</bar-style><repeat direction="forward"/></barline>',
        );
      }
      if (m === 0) out.push(attributes(score, part.drums));
      if (top && m === 0) {
        out.push(
          `      <direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${Math.round(bpm)}</per-minute></metronome></direction-type><sound tempo="${Math.round(bpm)}"/></direction>`,
        );
      }
      const section = top ? sectionAt.get(m) : undefined;
      if (section) {
        out.push(
          `      <direction placement="above"><direction-type><rehearsal>${esc(section)}</rehearsal></direction-type></direction>`,
        );
      }
      if (chordParts.has(part.id)) {
        for (const region of chordRegions) {
          if (
            region.startTick >= measure.startTick &&
            region.startTick < measure.endTick
          ) {
            out.push(
              harmonyXml(region.noteName, region.startTick - measure.startTick),
            );
          }
        }
      }

      // Each voice fills the bar; the next one backs up to its start.
      const measureTicks = measure.endTick - measure.startTick;
      let wroteVoice = false;
      score.staves.forEach((staff, staffIndex) => {
        for (const voice of measure.staves[staff] ?? []) {
          if (wroteVoice) {
            out.push(
              `      <backup><duration>${measureTicks}</duration></backup>`,
            );
          }
          wroteVoice = true;
          const voiceNumber = staffIndex * 2 + voice.index + 1;
          const staffNumber = score.staves.length > 1 ? staffIndex + 1 : null;
          let written = 0;
          voice.items.forEach((item, i) => {
            written += item.durationTicks;
            out.push(
              itemXml(item, {
                voice: voiceNumber,
                staff: staffNumber,
                drums: part.drums,
                measureTicks,
                tupletStart:
                  item.tupletStart !== undefined &&
                  voice.items[i - 1]?.tupletStart !== item.tupletStart,
                tupletStop:
                  item.tupletStart !== undefined &&
                  voice.items[i + 1]?.tupletStart !== item.tupletStart,
                articulations,
                slurStarts,
                slurEnds,
              }),
            );
          });
          if (written < measureTicks) {
            out.push(
              `      <forward><duration>${measureTicks - written}</duration></forward>`,
            );
          }
        }
      });
      if (!wroteVoice) {
        out.push(
          `      <note><rest measure="yes"/><duration>${measureTicks}</duration></note>`,
        );
      }

      const last = m === score.measures.length - 1;
      if (repeatEnds.has(m)) {
        out.push(
          '      <barline location="right"><bar-style>light-heavy</bar-style><repeat direction="backward"/></barline>',
        );
      } else if (last) {
        out.push(
          '      <barline location="right"><bar-style>light-heavy</bar-style></barline>',
        );
      }
      out.push('    </measure>');
    });
    out.push('  </part>');
  });

  out.push('</score-partwise>');
  return out.join('\n');
}

function attributes(score: NotationScore, drums: boolean): string {
  const [beats, beatType] = score.timeSignature;
  const clefs = score.staves
    .map((staff, i) =>
      score.staves.length > 1
        ? `<clef number="${i + 1}">${CLEF[staff]}</clef>`
        : `<clef>${CLEF[staff]}</clef>`,
    )
    .join('');
  return [
    '      <attributes>',
    `        <divisions>${score.ticksPerQuarter}</divisions>`,
    drums ? '' : `        <key><fifths>${score.keyFifths}</fifths></key>`,
    `        <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>`,
    score.staves.length > 1
      ? `        <staves>${score.staves.length}</staves>`
      : '',
    `        ${clefs}`,
    '      </attributes>',
  ]
    .filter(Boolean)
    .join('\n');
}

interface ItemContext {
  voice: number;
  staff: number | null;
  drums: boolean;
  measureTicks: number;
  tupletStart: boolean;
  tupletStop: boolean;
  articulations: ReadonlyMap<string, readonly string[]>;
  slurStarts: ReadonlyMap<string, number>;
  slurEnds: ReadonlyMap<string, number>;
}

function itemXml(item: NotationItem, ctx: ItemContext): string {
  const staffTag = ctx.staff ? `<staff>${ctx.staff}</staff>` : '';
  const voiceTag = `<voice>${ctx.voice}</voice>`;
  if (item.hidden) {
    return `      <forward><duration>${item.durationTicks}</duration>${voiceTag}${staffTag}</forward>`;
  }
  const typeTag = `<type>${TYPE[item.value]}</type>${item.dots ? '<dot/>' : ''}`;
  const timeMod =
    item.tupletStart !== undefined
      ? '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>'
      : '';
  if (item.kind === 'rest') {
    const rest = item.wholeMeasure ? '<rest measure="yes"/>' : '<rest/>';
    return `      <note>${rest}<duration>${item.durationTicks}</duration>${voiceTag}${item.wholeMeasure ? '' : typeTag}${timeMod}${staffTag}${tupletNotations(ctx)}</note>`;
  }

  // One mark per chord, as the Score draws it: gathered onto the first note.
  const kinds = [
    ...new Set(
      item.keys.flatMap((key) => ctx.articulations.get(key.noteId) ?? []),
    ),
  ];
  return item.keys
    .map((key, i) => {
      const ties =
        (item.tieFromPrev ? '<tie type="stop"/>' : '') +
        (item.tieToNext ? '<tie type="start"/>' : '');
      const notations = [
        item.tieFromPrev ? '<tied type="stop"/>' : '',
        item.tieToNext ? '<tied type="start"/>' : '',
        i === 0 ? tupletNotations(ctx) : '',
        slurTags(key, ctx),
        i === 0 ? marksXml(kinds) : '',
      ].join('');
      return [
        '      <note>',
        i > 0 ? '<chord/>' : '',
        pitchXml(key, ctx.drums),
        `<duration>${item.durationTicks}</duration>`,
        ties,
        voiceTag,
        typeTag,
        key.accidental
          ? `<accidental>${ACCIDENTAL[key.accidental]}</accidental>`
          : '',
        timeMod,
        noteheadXml(key),
        staffTag,
        notations ? `<notations>${notations}</notations>` : '',
        '</note>',
      ].join('');
    })
    .join('\n');
}

function pitchXml(key: NotationKey, drums: boolean): string {
  const step = key.letter.toUpperCase();
  if (drums) {
    return `<unpitched><display-step>${step}</display-step><display-octave>${key.octave}</display-octave></unpitched>`;
  }
  const alter = key.alteration ? `<alter>${key.alteration}</alter>` : '';
  return `<pitch><step>${step}</step>${alter}<octave>${key.octave}</octave></pitch>`;
}

function noteheadXml(key: NotationKey): string {
  if (key.slash) return '<notehead>slash</notehead>';
  if (key.notehead === 'x2') return '<notehead>x</notehead>';
  if (key.notehead === 'x3') return '<notehead>circle-x</notehead>';
  return '';
}

function tupletNotations(ctx: ItemContext): string {
  return (
    (ctx.tupletStart ? '<tuplet type="start" bracket="yes"/>' : '') +
    (ctx.tupletStop ? '<tuplet type="stop"/>' : '')
  );
}

function slurTags(key: NotationKey, ctx: ItemContext): string {
  const start = ctx.slurStarts.get(key.noteId);
  const stop = ctx.slurEnds.get(key.noteId);
  return (
    (start ? `<slur type="start" number="${start}"/>` : '') +
    (stop ? `<slur type="stop" number="${stop}"/>` : '')
  );
}

function marksXml(kinds: readonly string[]): string {
  const articulations = kinds.map((k) => ARTICULATION[k] ?? '').join('');
  return (
    (articulations ? `<articulations>${articulations}</articulations>` : '') +
    (kinds.includes('fermata') ? '<fermata type="upright"/>' : '')
  );
}

/** Save the Score as a .musicxml file. */
export function downloadScoreXml(
  parts: readonly ScoreXmlPart[],
  options: ScoreXmlOptions,
): void {
  const blob = new Blob([buildScoreXml(parts, options)], {
    type: 'application/vnd.recordare.musicxml+xml',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(options.title || 'score').replace(/[^\w\- ]+/g, '').trim() || 'score'}.musicxml`;
  link.click();
  URL.revokeObjectURL(url);
}
