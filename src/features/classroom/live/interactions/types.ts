import type {
  Interaction,
  InteractionResponsePayload,
  StudentLanguage,
} from '../../types';
import type { SessionState } from '../sessionsStore';
import type { SessionClock } from '../useServerClock';

/**
 * What a live session gives an interaction that plays along with the class
 * (Echo): the session's state, the server's clock and the slide it's on.
 * Absent outside a live session (a preview, an assignment).
 */
export interface InteractionLive {
  state: SessionState;
  clock: SessionClock;
  slideId: string;
}

/**
 * Shared prop shape for every interaction input component. Each variant
 * (ChoiceInput / TextInput / NumberInput / DrawInput / CheckInInput /
 * AtlasInput) accepts the same shape and dispatches its typed payload
 * through `onSubmit`.
 *
 * `submittedPayload` is the last-committed answer (null while unanswered).
 * Reruns can display "You answered X" without re-fetching from the server.
 */
export interface InteractionInputProps<T extends Interaction = Interaction> {
  interaction: T;
  language: StudentLanguage;
  onSubmit: (payload: InteractionResponsePayload) => void;
  submittedPayload?: InteractionResponsePayload | null;
  disabled?: boolean;
  enrollmentId?: string;
  sessionId?: string;
  assignmentId?: string;
  /** In a live session: what a class-wide interaction (Echo) follows. */
  live?: InteractionLive;
}
