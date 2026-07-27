/**
 * Pure viz-aggregate constructors — the ONLY doorway from response data into
 * the `slides/viz` components. No React. Two entry paths, one per surface:
 *
 *   - `fromResponseAggregate` (teacher panel): consumes the identified
 *     `ResponseAggregate` union from `buildResponseAggregate` and emits a
 *     shape that carries NO identities — resolved labels, counts, percents,
 *     and bare answer strings only.
 *   - `fromProjectorView` (projector): the input type is `ProjectorView`, the
 *     Rule 2b-firewalled shape from `buildProjectorView`, so handing this
 *     constructor identified rows is a COMPILE-TIME impossibility.
 *
 * Kinds we don't visualize (number / draw / check-in / atlas) return null.
 * `check-in` is additionally hard-refused on the projector path even if a
 * buggy upstream emits data for it — belt on top of buildProjectorView.
 */
import type { ResponseAggregate } from '../../assignments/buildResponseAggregate';
import type {
  ProjectorAnonymizedResponse,
  ProjectorView,
} from '../../live/buildProjectorView';
import { pickLocalized } from '../../presentation/localized';
import type { Interaction, StudentLanguage } from '../../types';

export interface VizChoiceAggregate {
  kind: 'choice';
  options: Array<{ label: string; count: number; percent: number }>;
  total: number;
}

export interface VizTextAggregate {
  kind: 'text';
  answers: string[];
  total: number;
}

/** Phase 4 — frequency word cloud, derived from text answers. Identity-free. */
export interface VizWordCloudAggregate {
  kind: 'wordcloud';
  words: Array<{ text: string; count: number }>;
  total: number;
}

/** Phase 4 — a Likert / scale distribution over integer values. Identity-free. */
export interface VizScaleAggregate {
  kind: 'scale';
  points: Array<{ value: number; count: number; percent: number }>;
  min: number;
  max: number;
  total: number;
}

export type VizAggregate =
  | VizChoiceAggregate
  | VizTextAggregate
  | VizWordCloudAggregate
  | VizScaleAggregate;

/** Integer percent; 0 when nobody has responded yet. */
const toPercent = (count: number, total: number): number =>
  total === 0 ? 0 : Math.round((count / total) * 100);

const WORD_CLOUD_CAP = 50;
const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'is',
  'it',
  'in',
  'on',
  'i',
  'my',
  'me',
  'we',
  'el',
  'la',
  'los',
  'las',
  'de',
  'y',
  'o',
  'un',
  'una',
  'es',
  'mi',
  'yo',
]);

/**
 * Pure text → word-frequency tally. Lowercases, strips punctuation, drops
 * stop-words + empties, sorts desc by count, caps the list. Never carries
 * identity — the input is bare answer strings.
 */
export const toWordCloud = (
  answers: string[],
): Array<{ text: string; count: number }> => {
  const counts = new Map<string, number>();
  for (const answer of answers) {
    const words = answer
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
    .slice(0, WORD_CLOUD_CAP);
};

/**
 * Teacher path — projects the identified aggregate down to an identity-free
 * viz shape (labels resolved per language, en fallback).
 */
export const fromResponseAggregate = (
  aggregate: ResponseAggregate,
  language: StudentLanguage,
): VizAggregate | null => {
  switch (aggregate.kind) {
    case 'choice':
      return {
        kind: 'choice',
        options: aggregate.options.map((option) => ({
          label: pickLocalized(option.label, language),
          count: option.count,
          percent: toPercent(option.count, aggregate.totalRespondents),
        })),
        total: aggregate.totalRespondents,
      };
    case 'text':
      return {
        kind: 'text',
        answers: [...aggregate.answers],
        total: aggregate.totalRespondents,
      };
    case 'number': {
      const total = aggregate.totalRespondents;
      const points = aggregate.buckets.map((b) => ({
        value: b.from,
        count: b.count,
        percent: toPercent(b.count, total),
      }));
      return {
        kind: 'scale',
        points,
        min: aggregate.min,
        max: aggregate.max,
        total,
      };
    }
    default:
      // draw / check-in / atlas / showcase have no projector-grade viz.
      return null;
  }
};

/**
 * Projector path — tallies the anonymized payloads in a `ProjectorView`
 * against the interaction's own options. Dedupes to the latest response per
 * anon respondent, mirroring the per-enrollment record the teacher aggregate
 * consumes.
 */
export const fromProjectorView = (
  interaction: Interaction,
  view: ProjectorView,
  language: StudentLanguage,
): VizAggregate | null => {
  // Belt on Rule 2b: check-in never visualizes on the projector, even if a
  // buggy upstream handed us an emitting view with payloads.
  if (interaction.type === 'check-in') return null;
  if (!view.emit) return null;
  if (view.interactionId !== interaction.id) return null;

  const latestByAnon = new Map<string, ProjectorAnonymizedResponse>();
  for (const response of view.responses) {
    const prev = latestByAnon.get(response.anon);
    if (!prev || response.createdAt >= prev.createdAt) {
      latestByAnon.set(response.anon, response);
    }
  }
  const rows = [...latestByAnon.values()].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.anon.localeCompare(b.anon),
  );

  switch (interaction.type) {
    case 'choice': {
      const options = interaction.choice?.options ?? [];
      const counts = options.map(() => 0);
      let total = 0;
      for (const row of rows) {
        if (row.payload.kind !== 'choice') continue;
        total += 1;
        for (const idx of row.payload.choices) {
          if (idx >= 0 && idx < counts.length) counts[idx] += 1;
        }
      }
      return {
        kind: 'choice',
        options: options.map((label, index) => ({
          label: pickLocalized(label, language),
          count: counts[index],
          percent: toPercent(counts[index], total),
        })),
        total,
      };
    }

    case 'text': {
      const answers: string[] = [];
      let total = 0;
      for (const row of rows) {
        if (row.payload.kind !== 'text') continue;
        total += 1;
        const trimmed = row.payload.text.trim();
        if (trimmed) answers.push(trimmed);
      }
      return { kind: 'text', answers, total };
    }

    case 'number': {
      const values: number[] = [];
      for (const row of rows) {
        if (row.payload.kind !== 'number') continue;
        values.push(row.payload.value);
      }
      const total = values.length;
      const min = interaction.number?.min ?? (total ? Math.min(...values) : 0);
      const max = interaction.number?.max ?? (total ? Math.max(...values) : 0);
      const counts = new Map<number, number>();
      for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
      const points: VizScaleAggregate['points'] = [];
      for (let v = min; v <= max; v += 1) {
        const count = counts.get(v) ?? 0;
        points.push({ value: v, count, percent: toPercent(count, total) });
      }
      return { kind: 'scale', points, min, max, total };
    }

    default:
      return null;
  }
};
