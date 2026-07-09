/**
 * Rule 2b firewall: structural early returns before any prop destructure.
 * Belt-and-suspenders on top of buildProjectorView's own check-in refusal —
 * a bug in the projector selector still cannot cause a check-in leak.
 */
import type { Interaction } from '../types';
import type { ProjectorView } from './buildProjectorView';

export interface AnonymousShareOverlayProps {
  projectorView: ProjectorView;
  interaction: Interaction;
}

const ANON_PATTERN = /^anon-[a-z0-9]{6}$/;

export const AnonymousShareOverlay = (props: AnonymousShareOverlayProps) => {
  if (props.interaction.type === 'check-in') return null;
  if (!props.interaction.shareable) return null;
  if (!props.projectorView.emit) return null;
  if (props.projectorView.responses.some((r) => !ANON_PATTERN.test(r.anon))) {
    return null;
  }

  const { projectorView, interaction } = props;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-start gap-6 overflow-y-auto px-8 py-10"
      style={{ backgroundColor: '#F7F1E3', color: '#1a1a1a' }}
    >
      <h1 className="max-w-4xl text-center text-3xl font-medium md:text-5xl">
        {interaction.question.en}
      </h1>
      <div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {projectorView.responses.map((r, i) => (
          <div
            key={`${r.anon}-${i}`}
            className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3"
          >
            <div className="text-xs uppercase tracking-wide text-black/50">
              {r.anon}
            </div>
            <div className="mt-1 text-lg">{renderPayload(r.payload)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const renderPayload = (
  payload: ProjectorView['responses'][number]['payload'],
): string => {
  if (payload.kind === 'text') return payload.text;
  if (payload.kind === 'number') return String(payload.value);
  if (payload.kind === 'choice') return payload.choices.join(', ');
  if (payload.kind === 'atlas') return payload.activityRef;
  return '';
};
