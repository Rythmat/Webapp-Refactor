import type {
  Interaction,
  InteractionResponsePayload,
  StudentLanguage,
} from '../../types';

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
}
