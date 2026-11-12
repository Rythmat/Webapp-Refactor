/**
 * The Group Project keeps to the Showcase (owner, 2026-11-10). On a Group
 * Project slide whose activity is not one of the subject's related ones (the
 * teacher changed the Showcase, or picked the activity by hand), a quiet note
 * says so and offers to match: the role's first related activity, swapped in
 * place, keeping the interaction's id so nothing that points at it breaks.
 */
import { Link2Off, RefreshCw } from 'lucide-react';
import { Button } from '@/daw/ui/Button';
import { cortexGroupActivity } from '../../slides/cortex/buildDeck';
import type { GroupRole } from '../../slides/cortex/types';
import {
  groupActivityOf,
  groupMatchesFocus,
  useLessonPlan,
} from '../../slides/focus/lessonFocus';
import type { Interaction, LocalizedText } from '../../types';

export interface GroupMatch {
  interaction: Interaction;
  title: LocalizedText;
  prompt: LocalizedText;
  role: GroupRole;
}

export const GroupFocusBanner = ({
  focusId,
  interaction,
  onMatch,
}: {
  focusId: string;
  /** The Group Project slide's activity. */
  interaction: Interaction | undefined;
  onMatch: (match: GroupMatch) => void;
}) => {
  const { plan, related } = useLessonPlan(focusId);
  const activity = groupActivityOf(interaction);
  if (!plan || !related || !activity || !interaction) return null;
  if (groupMatchesFocus(activity.ref, related)) return null;

  const match = cortexGroupActivity(
    interaction.id,
    plan,
    activity.role,
    related[activity.role][0]?.ref,
    related[activity.role][0]?.label,
  );
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] px-4 py-2.5"
    >
      <Link2Off aria-hidden className="size-4 shrink-0 text-daw-text-3" />
      <p className="min-w-0 flex-1 text-[0.8125rem] text-daw-text-2">
        This Group Project isn't about the Showcase,{' '}
        <span className="text-daw-text">{plan.focus.label}</span>.
      </p>
      {match && (
        <Button
          variant="secondary"
          onClick={() => onMatch({ ...match, role: activity.role })}
        >
          <RefreshCw aria-hidden />
          Match the Showcase
        </Button>
      )}
    </div>
  );
};
