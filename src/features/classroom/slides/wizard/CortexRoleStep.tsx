import { Globe2, Music, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { MICRO_LABEL } from '@/components/kit';
import { Select } from '@/daw/ui/Select';
import { OFFICE_CARD } from '@/features/office/ui/styles';
import { roleAvailable } from '../cortex/buildDeck';
import type { CortexLessonPlan, GroupRole } from '../cortex/types';

/**
 * Step 2 — the Group Project. The teacher picks one role and the whole class
 * does it together. Each card says what this focus gives the role, and a role
 * the focus cannot support is shown with the reason, not hidden.
 */

interface RoleCardProps {
  role: GroupRole;
  selected: boolean;
  disabled: boolean;
  icon: ReactNode;
  title: string;
  summary: string;
  detail: ReactNode;
  onSelect: (role: GroupRole) => void;
}

const RoleCard = ({
  role,
  selected,
  disabled,
  icon,
  title,
  summary,
  detail,
  onSelect,
}: RoleCardProps) => (
  <div
    className={`${OFFICE_CARD} flex flex-col gap-3 p-4 transition-colors ${
      selected ? 'border-white/50 bg-white/[0.06]' : ''
    } ${disabled ? 'opacity-50' : ''}`}
  >
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={() => onSelect(role)}
      className="flex flex-col gap-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed"
    >
      <span className="inline-flex items-center gap-2 text-base font-bold">
        {icon}
        {title}
      </span>
      <span className="text-sm text-white/55">{summary}</span>
    </button>
    <div className="text-sm">{detail}</div>
  </div>
);

export interface CortexRoleStepProps {
  plan: CortexLessonPlan;
  role: GroupRole | null;
  tutorialId: string | undefined;
  performerRef: string | undefined;
  onRole: (role: GroupRole) => void;
  onTutorial: (id: string) => void;
  onPerformer: (ref: string) => void;
}

export const CortexRoleStep = ({
  plan,
  role,
  tutorialId,
  performerRef,
  onRole,
  onTutorial,
  onPerformer,
}: CortexRoleStepProps) => {
  const { focus, promoter, producer, performer } = plan;
  const tutorial =
    producer.find((o) => o.tutorial.id === tutorialId) ?? producer[0];
  const lesson =
    performer.find((o) => o.activityRef === performerRef) ?? performer[0];

  return (
    <div className="flex flex-col gap-3">
      <span className={MICRO_LABEL}>The whole class does one</span>
      <div
        role="radiogroup"
        aria-label="Group Project"
        className="grid gap-3 md:grid-cols-3"
      >
        <RoleCard
          role="promoter"
          selected={role === 'promoter'}
          disabled={!roleAvailable(plan, 'promoter')}
          icon={<Globe2 className="h-4 w-4" />}
          title="Promoter"
          summary="Find connections on the Globe and build a mind map."
          onSelect={onRole}
          detail={
            promoter ? (
              <span>
                Find {promoter.goal} connections to {focus.label}.{' '}
                <span className="text-white/55">
                  {promoter.nodes.length - 1} things to find.
                </span>
              </span>
            ) : (
              <span className="text-white/55">
                Too few confirmed connections for a mind map.
              </span>
            )
          }
        />
        <RoleCard
          role="producer"
          selected={role === 'producer'}
          disabled={!roleAvailable(plan, 'producer')}
          icon={<SlidersHorizontal className="h-4 w-4" />}
          title="Producer"
          summary="Follow a production tutorial in the Studio."
          onSelect={onRole}
          detail={
            tutorial ? (
              <div className="flex flex-col gap-2">
                <Select
                  label="Studio tutorial"
                  value={tutorial.tutorial.id}
                  onValueChange={onTutorial}
                  options={producer.map((o) => ({
                    value: o.tutorial.id,
                    label: o.tutorial.title,
                  }))}
                />
                <span className="inline-flex flex-wrap items-center gap-2 text-white/55">
                  {tutorial.tutorial.estMinutes} min
                  {tutorial.genre ? ` · picked for ${tutorial.genre}` : ''}
                </span>
              </div>
            ) : (
              <span className="text-white/55">No Studio tutorials.</span>
            )
          }
        />
        <RoleCard
          role="performer"
          selected={role === 'performer'}
          disabled={!roleAvailable(plan, 'performer')}
          icon={<Music className="h-4 w-4" />}
          title="Performer"
          summary="Work through a Learn lesson together as a class."
          onSelect={onRole}
          detail={
            lesson ? (
              <div className="flex flex-col gap-2">
                <Select
                  label="Learn lesson"
                  value={lesson.activityRef}
                  onValueChange={onPerformer}
                  options={performer.map((o) => ({
                    value: o.activityRef,
                    label: o.label.en,
                  }))}
                />
              </div>
            ) : (
              <span className="text-white/55">
                No Learn lesson connects to {focus.label}.
              </span>
            )
          }
        />
      </div>
    </div>
  );
};
