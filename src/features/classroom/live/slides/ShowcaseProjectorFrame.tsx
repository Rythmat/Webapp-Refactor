/**
 * The projector "Now presenting" frame for the teacher-featured project
 * (`state.showcase`). Fed into the showcase slide's `showcaseFrame` slot by
 * ProjectorDeckView. Only the first name + project name show — a deliberate,
 * teacher-approved share. The "Open in Studio" link joins the live collab room
 * so the teacher can play it on the projector machine.
 */
import { PlayCircle } from 'lucide-react';
import type { SessionShowcase } from '../sessionsStore';

const firstName = (name: string): string =>
  name.trim().split(/\s+/)[0] || name;

export const ShowcaseProjectorFrame = ({
  showcase,
}: {
  showcase: SessionShowcase;
}) => {
  const href = showcase.artifact.roomId
    ? `/studio/editor?collab=${encodeURIComponent(showcase.artifact.roomId)}`
    : null;

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <span className="text-xl uppercase tracking-[0.3em] text-[#7ecfcf]">
        Now presenting
      </span>
      <span className="text-6xl font-semibold text-white">
        {firstName(showcase.displayName)}
      </span>
      <span className="text-3xl text-white/70">{showcase.artifact.name}</span>
      {href && (
        <a
          href={href}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#7ecfcf] px-6 py-3 text-lg font-medium text-black transition-colors hover:bg-[#7ecfcf]/85"
        >
          <PlayCircle className="h-6 w-6" />
          Open in Studio
        </a>
      )}
    </div>
  );
};
