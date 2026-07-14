/**
 * Type-switch wrapper that picks the correct input component per Interaction.
 * Used by the DayEditor preview page + LiveSessionPage + AssignmentDayRunner.
 */
import { AtlasInput } from './AtlasInput';
import { CheckInInput } from './CheckInInput';
import { ChoiceInput } from './ChoiceInput';
import { DrawInput } from './DrawInput';
import { NumberInput } from './NumberInput';
import { TextInput } from './TextInput';
import type { InteractionInputProps } from './types';

export const InteractionInput = ({
  interaction,
  language,
  onSubmit,
  submittedPayload,
  disabled,
  enrollmentId,
  sessionId,
  assignmentId,
}: InteractionInputProps) => {
  switch (interaction.type) {
    case 'choice':
      return (
        <ChoiceInput
          interaction={interaction}
          language={language}
          onSubmit={onSubmit}
          submittedPayload={submittedPayload}
          disabled={disabled}
        />
      );
    case 'text':
      return (
        <TextInput
          interaction={interaction}
          language={language}
          onSubmit={onSubmit}
          submittedPayload={submittedPayload}
          disabled={disabled}
        />
      );
    case 'number':
      return (
        <NumberInput
          interaction={interaction}
          language={language}
          onSubmit={onSubmit}
          submittedPayload={submittedPayload}
          disabled={disabled}
        />
      );
    case 'draw':
      return (
        <DrawInput
          interaction={interaction}
          language={language}
          onSubmit={onSubmit}
          submittedPayload={submittedPayload}
          disabled={disabled}
        />
      );
    case 'check-in':
      return (
        <CheckInInput
          interaction={interaction}
          language={language}
          onSubmit={onSubmit}
          submittedPayload={submittedPayload}
          disabled={disabled}
        />
      );
    case 'atlas':
      return (
        <AtlasInput
          interaction={interaction}
          language={language}
          onSubmit={onSubmit}
          submittedPayload={submittedPayload}
          disabled={disabled}
          enrollmentId={enrollmentId}
          sessionId={sessionId}
          assignmentId={assignmentId}
        />
      );
    default:
      return null;
  }
};
