/**
 * Collapsing the passages the parser wrote out longhand.
 *
 * The library was read out of prop-book PDFs by something that kept the chords
 * and threw the roadmap away, so 10,674 bars — 28.7% of the corpus — repeat an
 * earlier section verbatim. Writing a repeat barline over them instead is
 * mechanical where, and only where, the same run of sections comes back
 * immediately afterwards.
 *
 * The unit is a SPAN of adjacent sections, not one section. That distinction is
 * what makes the script worth having: almost nothing in the corpus is one
 * section written twice in a row, because the parser cut every chart into
 * four-bar blocks and named them Verse / Pre-Chorus / Chorus in turn. What does
 * occur is a run of those blocks coming back in the same order — Get Lucky's
 * Verse 1 · Pre-Chorus 1 · Chorus 1, then Verse 2 · Pre-Chorus 2 · Chorus 2 with
 * the same eight bars under each name. A repeat over the whole span keeps all
 * three names and deletes the copy.
 *
 * Two things make it safe rather than merely plausible:
 *
 * 1. The span has to repeat IMMEDIATELY. A verse that comes back after the
 *    chorus is a D.S. or a repeat with endings, and which one it is depends on
 *    what the record does — that needs an ear, not a script.
 * 2. `performedBars` is the gate. The chart is rewritten only when the song
 *    plays back bar for bar, chord for chord, key for key exactly as it did
 *    before. A new repeat barline can change how an unrelated repeat further
 *    down the chart reads — `repeatStartFor` walks backwards and stops at the
 *    first start repeat it meets — and that is not visible by inspection.
 *
 * Repeats are written as barlines on the bars: `repeatStart` on the span's first
 * bar, `repeatEnd` and `repeatTimes` on its last. Not `SongSection.repeatCount`,
 * which is the legacy spelling, cannot span two sections, and is what the back
 * office already offers. Close To You, the library's one complete worked chart,
 * is barlines throughout.
 *
 * Section numbers are redrawn afterwards, because they count written sections
 * and there are now fewer of them. A family that was never numbered is left
 * alone — an author who wrote four bare "Verse" labels meant them.
 *
 * Nothing else in the file moves. The edits are printed the way prettier would
 * print them rather than by running prettier, because most of the corpus is not
 * prettier-clean and reformatting it would drown the collapse in churn.
 *
 * Development-only; nothing in the app imports this. Run it through the vitest
 * runner beside it: `getSong()` is empty outside the app, so the corpus has to
 * be loaded by glob.
 */

import ts from 'typescript';
import {
  performedBars,
  writtenBarKeys,
  writtenBars,
} from '@/curriculum/songLibrary/performance';
import { parseSectionLabel } from '@/curriculum/songLibrary/sectionNames';
import type {
  ChordBar,
  Song,
  SongSection,
} from '@/curriculum/types/songLibrary';

/* ── Canonical keys ─────────────────────────────────────────────────── */

const canon = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canon);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canon(v)]),
    );
  return value;
};

/** A bar's whole content, key order normalised. Two bars are the same bar when
 *  these match. */
export const barKey = (bar: ChordBar): string => JSON.stringify(canon(bar));

/** What a player hears and reads off the bar, minus how the chart routes to it.
 *  This is what has to survive a collapse; the barlines are what change. */
const soundingKey = (bar: ChordBar): string =>
  JSON.stringify(
    canon({
      chords: bar.chords,
      restBars: bar.restBars,
      fermata: bar.fermata,
      cue: bar.cue,
    }),
  );

/** Marks that decide the order of play. A passage already carrying one is left
 *  alone: its repeat structure was authored, and this script has no business
 *  guessing how a second one nests inside it. */
const FLOW_MARKS = [
  'repeatStart',
  'repeatEnd',
  'repeatTimes',
  'ending',
  'segno',
  'coda',
  'toCoda',
  'jump',
  'fine',
  'keyChange',
] as const;

const flowMarksOf = (bar: ChordBar): string[] =>
  FLOW_MARKS.filter((k) => bar[k] !== undefined);

/** 'Verse 2' → 'Verse'. Null when the label is not a section name. */
const family = (label: string): string | null =>
  parseSectionLabel(label)?.name ?? null;

const barsIn = (sections: SongSection[]): number =>
  sections.reduce((n, s) => n + s.bars.length, 0);

/* ── Finding the repeats ────────────────────────────────────────────── */

export interface CollapseRun {
  /** First section of the span that survives. */
  startIdx: number;
  /** Sections in one pass of the span. */
  span: number;
  /** Passes in all. */
  times: number;
  /** The sections deleted: startIdx+span … startIdx+span×times-1. */
  dropIdxs: number[];
  /** The span's labels, as they read before renumbering. */
  labels: string[];
  /** Bars the chart loses. */
  barsRemoved: number;
}

export interface SkippedRun {
  labels: string[];
  times: number;
  bars: number;
  reason: string;
}

export interface CollapsePlan {
  songId: string;
  runs: CollapseRun[];
  skipped: SkippedRun[];
  /** Bars the chart loses across every run. */
  barsRemoved: number;
}

/** True when two sections are the same passage written twice: the same bars,
 *  and the same everything else a reader sees except the id and the number. */
function samePassage(a: SongSection, b: SongSection): boolean {
  if (a.bars.length !== b.bars.length) return false;
  if (a.bars.some((bar, i) => barKey(bar) !== barKey(b.bars[i]))) return false;
  return (
    a.instrumental === b.instrumental &&
    a.notes === b.notes &&
    a.measuresPerRow === b.measuresPerRow &&
    a.repeatCount === b.repeatCount
  );
}

/** Times the span at `start` of length `span` comes back immediately, itself
 *  included. One means it does not repeat. */
function passesAt(
  sections: SongSection[],
  start: number,
  span: number,
): number {
  let times = 1;
  while (start + span * (times + 1) <= sections.length) {
    const next = start + span * times;
    let same = true;
    for (let k = 0; k < span && same; k++)
      same = samePassage(sections[start + k], sections[next + k]);
    if (!same) break;
    times++;
  }
  return times;
}

/** Why this span cannot be written as a repeat, or null when it can. */
function blockedReason(
  sections: SongSection[],
  start: number,
  span: number,
  times: number,
): string | null {
  const covered = sections.slice(start, start + span * times);
  if (barsIn(sections.slice(start, start + span)) === 0)
    return 'the span holds no bars';
  if (sections[start].bars.length === 0)
    return `the span opens on an empty section (${sections[start].label})`;
  if (sections[start + span - 1].bars.length === 0)
    return `the span closes on an empty section (${sections[start + span - 1].label})`;
  if (covered.some((s) => s.repeatCount !== undefined))
    return 'a section already carries a legacy repeatCount';
  const marks = new Set(covered.flatMap((s) => s.bars.flatMap(flowMarksOf)));
  if (marks.size > 0)
    return `bars already carry roadmap marks (${[...marks].join(', ')})`;
  for (let k = 0; k < span; k++) {
    const names = new Set(
      Array.from({ length: times }, (_, t) =>
        family(sections[start + span * t + k].label),
      ),
    );
    if (names.size !== 1 || names.has(null))
      return `the repeat lands under a different name (${Array.from(
        { length: times },
        (_, t) => sections[start + span * t + k].label,
      ).join(' / ')})`;
  }
  return null;
}

/**
 * Every immediately-repeated span in a song, left to right.
 *
 * At each position the longest-saving span wins, and the search resumes after
 * the whole repeated region. Greedy, not optimal — but a chart has thirty
 * sections at most and the greedy answer has been the obvious one every time.
 */
export function planCollapses(song: Song): CollapsePlan {
  const sections = song.sections;
  const runs: CollapseRun[] = [];
  const skipped: SkippedRun[] = [];
  let i = 0;
  while (i < sections.length) {
    let best: { span: number; times: number; bars: number } | null = null;
    let blocked: {
      span: number;
      times: number;
      bars: number;
      reason: string;
    } | null = null;
    for (let span = 1; i + span * 2 <= sections.length; span++) {
      const times = passesAt(sections, i, span);
      if (times < 2) continue;
      const bars = barsIn(sections.slice(i, i + span)) * (times - 1);
      const reason = blockedReason(sections, i, span, times);
      if (reason) {
        if (!blocked || bars > blocked.bars)
          blocked = { span, times, bars, reason };
      } else if (!best || bars > best.bars) best = { span, times, bars };
    }
    if (best) {
      const { span, times, bars } = best;
      runs.push({
        startIdx: i,
        span,
        times,
        dropIdxs: Array.from(
          { length: span * (times - 1) },
          (_, k) => i + span + k,
        ),
        labels: sections.slice(i, i + span).map((s) => s.label),
        barsRemoved: bars,
      });
      i += span * times;
      continue;
    }
    if (blocked)
      skipped.push({
        labels: sections
          .slice(i, i + blocked.span * blocked.times)
          .map((s) => s.label),
        times: blocked.times,
        bars: blocked.bars,
        reason: blocked.reason,
      });
    i++;
  }
  return {
    songId: song.id,
    runs,
    skipped,
    barsRemoved: runs.reduce((n, r) => n + r.barsRemoved, 0),
  };
}

/* ── Writing the repeat in ──────────────────────────────────────────── */

/**
 * Section numbers count written sections, so collapsing changes them. A family
 * that carried no number before carries none after: bare "Verse" four times
 * over is a style, and it is the one Close To You uses.
 */
export function relabel(
  original: SongSection[],
  survivors: SongSection[],
): SongSection[] {
  const numbered = new Set<string>();
  for (const section of original) {
    const parsed = parseSectionLabel(section.label);
    if (parsed?.number != null) numbered.add(parsed.name);
  }
  const total = new Map<string, number>();
  for (const section of survivors) {
    const name = family(section.label);
    if (name) total.set(name, (total.get(name) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  return survivors.map((section) => {
    const name = family(section.label);
    if (!name || !numbered.has(name)) return section;
    const nth = (seen.get(name) ?? 0) + 1;
    seen.set(name, nth);
    const label = (total.get(name) ?? 0) > 1 ? `${name} ${nth}` : name;
    return label === section.label ? section : { ...section, label };
  });
}

const droppedIn = (plan: CollapsePlan): Set<number> =>
  new Set(plan.runs.flatMap((r) => r.dropIdxs));

/** The song as the plan would leave it. Used to prove the collapse before any
 *  file is touched. */
export function applyPlan(song: Song, plan: CollapsePlan): Song {
  const dropped = droppedIn(plan);
  const opens = new Map(plan.runs.map((r) => [r.startIdx, r]));
  const closes = new Map(plan.runs.map((r) => [r.startIdx + r.span - 1, r]));
  const marked = song.sections.map((section, idx) => {
    const open = opens.get(idx);
    const close = closes.get(idx);
    if (!open && !close) return section;
    const bars = [...section.bars];
    if (open) bars[0] = { ...bars[0], repeatStart: true };
    if (close)
      bars[bars.length - 1] = {
        ...bars[bars.length - 1],
        repeatEnd: true,
        ...(close.times > 2 ? { repeatTimes: close.times } : {}),
      };
    return { ...section, bars };
  });
  const survivors = marked.filter((_, idx) => !dropped.has(idx));
  return { ...song, sections: relabel(song.sections, survivors) };
}

/** The labels the plan changes, keyed by the section's index in the original
 *  chart. Shared with `applyPlan` so the file and the proof agree. */
export function labelChanges(
  song: Song,
  plan: CollapsePlan,
): Map<number, string> {
  const dropped = droppedIn(plan);
  const kept = song.sections
    .map((_, idx) => idx)
    .filter((idx) => !dropped.has(idx));
  const survivors = kept.map((idx) => song.sections[idx]);
  const out = new Map<number, string>();
  relabel(song.sections, survivors).forEach((section, k) => {
    if (section.label !== survivors[k].label) out.set(kept[k], section.label);
  });
  return out;
}

/* ── The safety gate ────────────────────────────────────────────────── */

/** Every performed bar as the key it is in and the sound it makes, in order. */
export function performanceSignature(song: Song): string {
  const keys = writtenBarKeys(song);
  return performedBars(song)
    .map((p) => `${keys[p.writtenIdx].key}|${soundingKey(p.bar)}`)
    .join('\n');
}

export interface GateResult {
  ok: boolean;
  reason?: string;
}

/**
 * The property that makes the whole exercise safe: the collapsed chart plays
 * back identically. Also re-checks the invariants the library's own form test
 * enforces — a stray barline can break any of them.
 */
export function gate(before: Song, after: Song): GateResult {
  const played = performedBars(after);
  if (played.length >= 4000) return { ok: false, reason: 'roadmap never ends' };
  const written = writtenBars(after).length;
  const seen = new Set(played.map((p) => p.writtenIdx)).size;
  if (seen !== written)
    return { ok: false, reason: `${written - seen} written bars never played` };

  const bad = after.sections.filter((s) => !parseSectionLabel(s.label));
  if (bad.length)
    return { ok: false, reason: `unusable label '${bad[0].label}'` };
  const families = (song: Song) => {
    const counts = new Map<string, number>();
    for (const section of song.sections) {
      const name = family(section.label) ?? section.label;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return counts;
  };
  const wantFamilies = families(before);
  for (const [name, count] of families(after))
    if (count > (wantFamilies.get(name) ?? 0))
      return { ok: false, reason: `invented a ${name} section` };

  const want = performanceSignature(before).split('\n');
  const got = performanceSignature(after).split('\n');
  if (want.length !== got.length)
    return {
      ok: false,
      reason: `performance is ${got.length} bars, was ${want.length}`,
    };
  const at = want.findIndex((line, i) => line !== got[i]);
  if (at >= 0)
    return {
      ok: false,
      reason: `performed bar ${at + 1} changed: ${want[at]} → ${got[at]}`,
    };
  return { ok: true };
}

/* ── Rewriting the file ─────────────────────────────────────────────── */

interface Edit {
  start: number;
  end: number;
  text: string;
}

const unwrap = (node: ts.Expression): ts.Expression =>
  ts.isAsExpression(node) ||
  ts.isSatisfiesExpression(node) ||
  ts.isParenthesizedExpression(node)
    ? unwrap(node.expression)
    : node;

/** The object literal of the exported Song whose `id` is `songId`. */
function findSongLiteral(
  sf: ts.SourceFile,
  songId: string,
): ts.ObjectLiteralExpression | null {
  for (const statement of sf.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const decl of statement.declarationList.declarations) {
      if (!decl.initializer) continue;
      const literal = unwrap(decl.initializer);
      if (!ts.isObjectLiteralExpression(literal)) continue;
      const id = property(literal, 'id');
      if (
        id &&
        ts.isStringLiteralLike(id.initializer) &&
        id.initializer.text === songId
      )
        return literal;
    }
  }
  return null;
}

function property(
  literal: ts.ObjectLiteralExpression,
  name: string,
): ts.PropertyAssignment | null {
  const found = literal.properties.find(
    (p) =>
      ts.isPropertyAssignment(p) &&
      ts.isIdentifier(p.name) &&
      p.name.text === name,
  );
  return found && ts.isPropertyAssignment(found) ? found : null;
}

function arrayProperty(
  literal: ts.ObjectLiteralExpression,
  name: string,
): ts.ArrayLiteralExpression | null {
  const prop = property(literal, name);
  if (!prop) return null;
  const value = unwrap(prop.initializer);
  return ts.isArrayLiteralExpression(value) ? value : null;
}

/** Start of the line a position sits on. */
const lineStart = (src: string, pos: number): number =>
  src.lastIndexOf('\n', pos - 1) + 1;

/** Just past an array element: its trailing comma, and the newline after it
 *  when nothing else shares the line. */
function afterElement(src: string, end: number): number {
  let i = end;
  while (i < src.length && (src[i] === ' ' || src[i] === '\t')) i++;
  if (src[i] === ',') i++;
  let j = i;
  while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++;
  return src[j] === '\n' ? j + 1 : i;
}

const PRINT_WIDTH = 80;

/**
 * Add properties to the end of a bar literal, printed the way prettier would
 * print them — because the file is not reformatted afterwards.
 *
 * Only 316 of the 642 files in the songs directory are prettier-clean as
 * committed: the parser left a great many bar lines one character over the print
 * width. Running the formatter over the 149 files this script touches added
 * 19,000 lines of churn on top of the collapse and buried the one thing a reader
 * needs to check. So every edit here is exact, and a file that was clean before
 * stays clean.
 *
 * Prettier keeps an object literal expanded when the original had a newline
 * after its brace, and collapses it when it fits. Both rules are followed.
 */
function addProperties(
  source: string,
  sf: ts.SourceFile,
  obj: ts.ObjectLiteralExpression,
  props: string[],
): Edit {
  const last = obj.properties[obj.properties.length - 1];
  if (!last) throw new Error('bar literal has no properties');
  const start = obj.getStart(sf);
  const indent = start - lineStart(source, start);
  const inner = ' '.repeat(indent + 2);

  if (source.slice(start, obj.end).includes('\n')) {
    let at = last.end;
    while (source[at] === ' ' || source[at] === '\t') at++;
    const comma = source[at] === ',';
    return {
      start: comma ? at + 1 : last.end,
      end: comma ? at + 1 : last.end,
      text: props.map((p) => `\n${inner}${p},`).join(''),
    };
  }

  const existing = obj.properties.map((p) =>
    source.slice(p.getStart(sf), p.end),
  );
  const all = [...existing, ...props];
  const oneLine = `{ ${all.join(', ')} }`;
  // The trailing comma after the bar counts against the width.
  const text =
    indent + oneLine.length + 1 <= PRINT_WIDTH
      ? oneLine
      : `{\n${all.map((p) => `${inner}${p},`).join('\n')}\n${' '.repeat(indent)}}`;
  return { start, end: obj.end, text };
}

function sectionLiteral(
  sections: ts.ArrayLiteralExpression,
  idx: number,
): ts.ObjectLiteralExpression {
  const node = unwrap(sections.elements[idx]);
  if (!ts.isObjectLiteralExpression(node))
    throw new Error(`section ${idx} is not an object literal`);
  return node;
}

/** The first and last bar literals of a section. */
function barEdges(
  sections: ts.ArrayLiteralExpression,
  idx: number,
): [ts.ObjectLiteralExpression, ts.ObjectLiteralExpression] {
  const bars = arrayProperty(sectionLiteral(sections, idx), 'bars');
  if (!bars || bars.elements.length === 0)
    throw new Error(`section ${idx} has no bars array literal`);
  const first = unwrap(bars.elements[0]);
  const last = unwrap(bars.elements[bars.elements.length - 1]);
  if (
    !ts.isObjectLiteralExpression(first) ||
    !ts.isObjectLiteralExpression(last)
  )
    throw new Error(`section ${idx} has a bar that is not an object literal`);
  return [first, last];
}

/**
 * The file's text with the plan written into it: repeat barlines around the
 * surviving span, the duplicate sections deleted, the numbers redrawn.
 *
 * Throws when the file does not have the shape the plan assumes, which is the
 * right outcome — a chart assembled by a helper rather than written out as a
 * literal must not be edited by string surgery.
 */
export function rewriteSource(
  source: string,
  plan: CollapsePlan,
  song: Song,
): string {
  const sf = ts.createSourceFile(
    `${plan.songId}.ts`,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const literal = findSongLiteral(sf, plan.songId);
  if (!literal)
    throw new Error(`no exported Song literal with id '${plan.songId}'`);
  const sections = arrayProperty(literal, 'sections');
  if (!sections) throw new Error('`sections` is not an array literal');
  if (sections.elements.length !== song.sections.length)
    throw new Error(
      `file has ${sections.elements.length} section literals, song has ${song.sections.length}`,
    );

  const edits: Edit[] = [];

  for (const [idx, label] of labelChanges(song, plan)) {
    const prop = property(sectionLiteral(sections, idx), 'label');
    if (!prop || !ts.isStringLiteralLike(prop.initializer))
      throw new Error(`section ${idx} has no literal label`);
    edits.push({
      start: prop.initializer.getStart(sf),
      end: prop.initializer.end,
      text: `'${label}'`,
    });
  }

  for (const run of plan.runs) {
    const closing = ['repeatEnd: true'];
    if (run.times > 2) closing.push(`repeatTimes: ${run.times}`);
    const [first] = barEdges(sections, run.startIdx);
    const [, last] = barEdges(sections, run.startIdx + run.span - 1);
    // A one-bar span opens and closes on the same bar, so both marks go in one
    // edit — two edits over the same range would not survive sorting.
    const both = first === last;
    edits.push(
      addProperties(
        source,
        sf,
        first,
        both ? ['repeatStart: true', ...closing] : ['repeatStart: true'],
      ),
    );
    if (!both) edits.push(addProperties(source, sf, last, closing));

    const from = sections.elements[run.dropIdxs[0]];
    const to = sections.elements[run.dropIdxs[run.dropIdxs.length - 1]];
    edits.push({
      start: lineStart(source, from.getStart(sf)),
      end: afterElement(source, to.end),
      text: '',
    });
  }

  edits.sort((a, b) => b.start - a.start);
  for (let i = 1; i < edits.length; i++)
    if (edits[i].end > edits[i - 1].start)
      throw new Error('overlapping edits — the plan is malformed');

  let out = source;
  for (const edit of edits)
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  return out;
}
