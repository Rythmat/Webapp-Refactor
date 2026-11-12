/**
 * The projector "Now presenting" frame for the teacher-featured project
 * (`state.showcase`). Fed into the showcase slide's `showcaseFrame` slot by
 * ProjectorDeckView. Only the first name + project name show — a deliberate,
 * teacher-approved share. The "Open in Studio" link joins the live collab room
 * so the teacher can play it on the projector machine.
 *
 * Work from another of the lesson's places (owner, 2026-11-11) shows over a
 * still of that place, with a link that opens it on the room's machine.
 */
import { ArrowUpRight, PlayCircle } from 'lucide-react';
import { PROJECT_PLACES } from '../../slides/projectPlaces';
import type { SessionShowcase } from '../sessionsStore';

const firstName = (name: string): string => name.trim().split(/\s+/)[0] || name;

export const ShowcaseProjectorFrame = ({
  showcase,
}: {
  showcase: SessionShowcase;
}) => {
  const { artifact } = showcase;
  const studio = !artifact.place || artifact.place === 'studio';
  const href = artifact.roomId
    ? `/studio?collab=${encodeURIComponent(artifact.roomId)}`
    : null;
  const place = PROJECT_PLACES.find((p) => p.id === artifact.place);

  if (!studio && place) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="text-xl font-bold uppercase tracking-[0.08em] text-white/60">
          Now presenting
        </span>
        <span className="text-6xl font-semibold text-white">
          {firstName(showcase.displayName)}
        </span>
        <div className="relative h-48 w-80 overflow-hidden rounded-2xl">
          <img
            src={place.clip.poster}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-80"
          />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-10 text-left text-xl text-white">
            {place.label.en}
          </span>
        </div>
        <span className="text-3xl text-white/70">{artifact.name}</span>
        {artifact.deepLink && (
          <a
            href={artifact.deepLink}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-lg font-medium text-black transition-colors hover:bg-white/85"
          >
            Open
            <ArrowUpRight className="h-6 w-6" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <span className="text-xl font-bold uppercase tracking-[0.08em] text-white/60">
        Now presenting
      </span>
      <span className="text-6xl font-semibold text-white">
        {firstName(showcase.displayName)}
      </span>
      <span className="text-3xl text-white/70">{artifact.name}</span>
      {href && (
        <a
          href={href}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-lg font-medium text-black transition-colors hover:bg-white/85"
        >
          <PlayCircle className="h-6 w-6" />
          Open in Studio
        </a>
      )}
    </div>
  );
};
