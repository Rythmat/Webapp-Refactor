import { describeFeeling } from '@/features/classroom/feelings/feelings';
import type {
  Interaction,
  InteractionResponsePayload,
} from '@/features/classroom/types';

/**
 * A student's answer in words, for the teacher reading their work: the
 * choices they picked by name, what they wrote, their number, and a plain
 * line for the kinds that aren't words (a drawing, an Echo run).
 */
export const describeResponse = (
  payload: InteractionResponsePayload,
  interaction?: Interaction,
): string => {
  switch (payload.kind) {
    case 'choice': {
      const options = interaction?.choice?.options ?? [];
      const picked = payload.choices.map(
        (i) => options[i]?.en?.trim() || `Option ${i + 1}`,
      );
      return picked.length ? picked.join(', ') : 'No choice';
    }
    case 'text':
      return payload.text.trim() || '(left blank)';
    case 'number':
      return String(payload.value);
    case 'draw':
      return `A drawing (${payload.strokes.length} ${payload.strokes.length === 1 ? 'stroke' : 'strokes'})`;
    case 'check-in': {
      const feeling = describeFeeling(payload.value);
      if (!feeling) return payload.value;
      return feeling.detail
        ? `Feeling ${feeling.label} (${feeling.detail})`
        : `Feeling ${feeling.label}`;
    }
    case 'atlas':
      return `Finished ${payload.activityRef}`;
    case 'showcase':
      return `Offered their project “${payload.artifact.name}”`;
    case 'echo': {
      const good = payload.rounds.filter((r) => r.passed).length;
      return `${good} of ${payload.rounds.length} echoes good · best streak ${payload.bestStreak}`;
    }
  }
};
