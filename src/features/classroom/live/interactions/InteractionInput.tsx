/**
 * Type-switch wrapper that picks the correct input component per Interaction.
 * Used by the DayEditor preview page + LiveSessionPage + AssignmentDayRunner.
 *
 * `echo` plays along with the class, so it needs the live session (`live`);
 * its screen, engine and sounds load on their own, only when one is shown.
 */
import { lazy, Suspense } from 'react';
import { AtlasInput } from './AtlasInput';
import { CheckInInput } from './CheckInInput';
import { ChoiceInput } from './ChoiceInput';
import { DrawInput } from './DrawInput';
import { NumberInput } from './NumberInput';
import { ShowcaseInput } from './ShowcaseInput';
import { TextInput } from './TextInput';
import type { InteractionInputProps } from './types';

const EchoClassStudent = lazy(() =>
  import('../../echo/EchoClassStudent').then(({ EchoClassStudent }) => ({
    default: EchoClassStudent,
  })),
);

export const InteractionInput = ({
  interaction,
  language,
  onSubmit,
  submittedPayload,
  disabled,
  enrollmentId,
  sessionId,
  assignmentId,
  live,
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
    case 'showcase':
      return (
        <ShowcaseInput
          interaction={interaction}
          language={language}
          onSubmit={onSubmit}
          submittedPayload={submittedPayload}
          disabled={disabled}
        />
      );
    case 'echo':
      return live ? (
        <Suspense
          fallback={
            <p className="text-sm text-white/55">Loading Echo… · Cargando…</p>
          }
        >
          <EchoClassStudent
            interaction={interaction}
            echo={live.state.echo}
            slideId={live.slideId}
            clock={live.clock}
            submittedPayload={submittedPayload}
            onSubmit={onSubmit}
            disabled={disabled}
          />
        </Suspense>
      ) : (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/60">
          Echo is played together in a live class. · Echo se juega en una clase
          en vivo.
        </p>
      );
    default:
      return null;
  }
};
