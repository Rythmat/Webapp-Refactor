/**
 * Pure selector that groups per-interaction response payloads into a
 * discriminated aggregate. All bucketing / percent math / dedup / size limits
 * live here; the dashboard component is a dumb switch on aggregate.kind.
 */
import type {
  Interaction,
  InteractionResponsePayload,
  LocalizedText,
} from '../types';

export interface DisplayNameLookup {
  (enrollmentId: string): string | undefined;
}

export interface ResponseAggregateInput {
  responsesByEnrollment: Record<
    string,
    Record<string, InteractionResponsePayload>
  >;
  interactions: Interaction[];
  getDisplayName?: DisplayNameLookup;
}

export interface AggregateBase {
  interactionId: string;
  question: LocalizedText;
  totalRespondents: number;
  mismatched: number;
}

export interface ChoiceAggregate extends AggregateBase {
  kind: 'choice';
  multi: boolean;
  options: Array<{
    index: number;
    label: LocalizedText;
    count: number;
    percent: number;
  }>;
}

export interface TextAggregate extends AggregateBase {
  kind: 'text';
  answers: string[];
}

export interface NumberAggregate extends AggregateBase {
  kind: 'number';
  bucketSize: 1 | 10;
  buckets: Array<{ from: number; to: number; count: number }>;
  min: number;
  max: number;
}

export interface DrawThumbnailRow {
  enrollmentId: string;
  displayName: string;
  strokes: Array<Record<string, unknown>>;
}

export interface DrawAggregate extends AggregateBase {
  kind: 'draw';
  thumbnails: DrawThumbnailRow[];
  skipped: 'none' | 'too_many_strokes' | 'too_large' | 'thumbnail_cap';
}

export interface CheckInAggregate extends AggregateBase {
  kind: 'check-in';
  rows: Array<{ enrollmentId: string; displayName: string; value: string }>;
}

export interface AtlasAggregate extends AggregateBase {
  kind: 'atlas';
  results: Array<{
    enrollmentId: string;
    displayName: string;
    result: Record<string, unknown>;
  }>;
}

export interface ShowcaseAggregate extends AggregateBase {
  kind: 'showcase';
  offers: Array<{
    enrollmentId: string;
    displayName: string;
    artifact: { projectId: string; roomId?: string; name: string };
  }>;
}

export type ResponseAggregate =
  | ChoiceAggregate
  | TextAggregate
  | NumberAggregate
  | DrawAggregate
  | CheckInAggregate
  | AtlasAggregate
  | ShowcaseAggregate;

const MAX_DRAW_STROKES = 500;
const MAX_DRAW_BYTES = 200 * 1024;
const MAX_DRAW_THUMBNAILS = 60;

/** Short-circuit byte estimate — avoids materializing a large JSON just to measure it. */
const exceedsByteBudget = (
  strokes: Array<Record<string, unknown>>,
): boolean => {
  let accum = 2;
  for (const stroke of strokes) {
    accum += JSON.stringify(stroke).length + 1;
    if (accum > MAX_DRAW_BYTES) return true;
  }
  return false;
};

const resolveName = (
  getDisplayName: DisplayNameLookup | undefined,
  enrollmentId: string,
): string => getDisplayName?.(enrollmentId) ?? enrollmentId;

export const buildResponseAggregate = (
  input: ResponseAggregateInput,
): ResponseAggregate[] => {
  const { responsesByEnrollment, interactions, getDisplayName } = input;

  const enrollmentsList = Object.keys(responsesByEnrollment);

  return interactions.map<ResponseAggregate>((interaction) => {
    const respondents = new Set<string>();
    const matched: Array<{
      enrollmentId: string;
      payload: InteractionResponsePayload;
    }> = [];
    let mismatched = 0;

    for (const enrollmentId of enrollmentsList) {
      const payload = responsesByEnrollment[enrollmentId]?.[interaction.id];
      if (!payload) continue;
      if (payload.kind !== interaction.type) {
        mismatched += 1;
        continue;
      }
      respondents.add(enrollmentId);
      matched.push({ enrollmentId, payload });
    }

    const totalRespondents = respondents.size;
    const base: AggregateBase = {
      interactionId: interaction.id,
      question: interaction.question,
      totalRespondents,
      mismatched,
    };

    switch (interaction.type) {
      case 'choice': {
        const options = interaction.choice?.options ?? [];
        const multi = interaction.choice?.multi ?? false;
        const counts = options.map(() => 0);
        for (const { payload } of matched) {
          if (payload.kind !== 'choice') continue;
          for (const idx of payload.choices) {
            if (idx >= 0 && idx < counts.length) counts[idx] += 1;
          }
        }
        return {
          ...base,
          kind: 'choice',
          multi,
          options: options.map((label, index) => ({
            index,
            label,
            count: counts[index],
            percent:
              totalRespondents === 0
                ? 0
                : (counts[index] / totalRespondents) * 100,
          })),
        };
      }

      case 'text': {
        const rows = matched
          .map(({ enrollmentId, payload }) =>
            payload.kind === 'text'
              ? { enrollmentId, text: payload.text }
              : null,
          )
          .filter((r): r is { enrollmentId: string; text: string } =>
            Boolean(r && r.text.trim()),
          )
          .sort((a, b) => a.enrollmentId.localeCompare(b.enrollmentId));
        return { ...base, kind: 'text', answers: rows.map((r) => r.text) };
      }

      case 'number': {
        if (totalRespondents === 0) {
          return {
            ...base,
            kind: 'number',
            bucketSize: 1,
            buckets: [],
            min: 0,
            max: 0,
          };
        }
        const values: number[] = [];
        for (const { payload } of matched) {
          if (payload.kind === 'number') values.push(payload.value);
        }
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        const bucketSize: 1 | 10 = range <= 20 ? 1 : 10;
        const start = Math.floor(min / bucketSize) * bucketSize;
        const end = Math.ceil((max + 1) / bucketSize) * bucketSize;
        const buckets: Array<{ from: number; to: number; count: number }> = [];
        for (let b = start; b < end; b += bucketSize) {
          buckets.push({ from: b, to: b + bucketSize, count: 0 });
        }
        for (const v of values) {
          const idx = Math.floor((v - start) / bucketSize);
          if (idx >= 0 && idx < buckets.length) buckets[idx].count += 1;
        }
        return { ...base, kind: 'number', bucketSize, buckets, min, max };
      }

      case 'draw': {
        let skipped: DrawAggregate['skipped'] = 'none';
        const thumbnails: DrawThumbnailRow[] = [];
        for (const { enrollmentId, payload } of matched) {
          if (payload.kind !== 'draw') continue;
          if (payload.strokes.length > MAX_DRAW_STROKES) {
            skipped = 'too_many_strokes';
            break;
          }
          if (exceedsByteBudget(payload.strokes)) {
            skipped = 'too_large';
            break;
          }
          if (thumbnails.length >= MAX_DRAW_THUMBNAILS) {
            skipped = 'thumbnail_cap';
            break;
          }
          thumbnails.push({
            enrollmentId,
            displayName: resolveName(getDisplayName, enrollmentId),
            strokes: payload.strokes,
          });
        }
        return { ...base, kind: 'draw', thumbnails, skipped };
      }

      case 'check-in': {
        const rows = matched
          .map(({ enrollmentId, payload }) =>
            payload.kind === 'check-in'
              ? {
                  enrollmentId,
                  displayName: resolveName(getDisplayName, enrollmentId),
                  value: payload.value,
                }
              : null,
          )
          .filter(
            (
              r,
            ): r is {
              enrollmentId: string;
              displayName: string;
              value: string;
            } => Boolean(r),
          );
        return { ...base, kind: 'check-in', rows };
      }

      case 'atlas': {
        const results = matched
          .map(({ enrollmentId, payload }) =>
            payload.kind === 'atlas'
              ? {
                  enrollmentId,
                  displayName: resolveName(getDisplayName, enrollmentId),
                  result: payload.result,
                }
              : null,
          )
          .filter(
            (
              r,
            ): r is {
              enrollmentId: string;
              displayName: string;
              result: Record<string, unknown>;
            } => Boolean(r),
          );
        return { ...base, kind: 'atlas', results };
      }

      case 'showcase': {
        const offers = matched
          .map(({ enrollmentId, payload }) =>
            payload.kind === 'showcase'
              ? {
                  enrollmentId,
                  displayName: resolveName(getDisplayName, enrollmentId),
                  artifact: payload.artifact,
                }
              : null,
          )
          .filter(
            (
              r,
            ): r is {
              enrollmentId: string;
              displayName: string;
              artifact: { projectId: string; roomId?: string; name: string };
            } => Boolean(r),
          );
        return { ...base, kind: 'showcase', offers };
      }
    }
  });
};
