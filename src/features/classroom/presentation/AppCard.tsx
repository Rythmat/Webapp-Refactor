import { ArrowUpRight, Settings } from 'lucide-react';
import { getSong } from '@/curriculum/data/songs';
import { IdCover } from '@/features/office/ui/ClassCover';
import { useTeacherConfig } from '../settings/useTeacherConfig';
import type { SlideSurface } from '../slides/types';
import type { LaunchTile as LaunchTileData, StudentLanguage } from '../types';
import { pickLocalized } from './localized';
import { resolveModuleUrl } from './resolveModuleUrl';

// ── A slide's link into the app (owner, 2026-11-09) ─────────────────────────
// What used to be a white pill is a card, as Learn's are: a cover and the
// title, nothing else (owner, 2026-11-10: no extra text on slides). It is
// drawn on the slide canvas, so it sizes from the slide's own type tokens
// (canvas px on the stage, rem in a phone's reflow), never from the page.
//
// The room's screen cannot be tapped by a student, so the projector card is
// not a link. Every other surface
// (the student's device, Present, the teacher's preview) opens it, in a new
// tab so the lesson stays where it was.

const MODULE_LABEL: Record<LaunchTileData['module'], string> = {
  learn: 'Learn',
  studio: 'Studio',
  globe: 'Globe',
  arcade: 'Arcade',
};

interface AppCardProps {
  tile: LaunchTileData;
  language: StudentLanguage;
  surface: SlideSurface;
  /** For accessibility — the section this card belongs to. */
  sectionLabel: string;
}

const CARD =
  'flex w-full max-w-[34em] items-center gap-[0.5em] self-start rounded-[0.75em] border border-white/[0.08] bg-white/[0.04] p-[0.375em] pr-[0.75em] text-left text-white';

export const AppCard = ({
  tile,
  language,
  surface,
  sectionLabel,
}: AppCardProps) => {
  const { config } = useTeacherConfig();
  const url = resolveModuleUrl(tile, config.moduleUrls);
  const module = MODULE_LABEL[tile.module];
  const title = tile.label
    ? pickLocalized(tile.label, language)
    : `Open ${module}`;
  const projected = surface === 'projector';

  // A song's link wears its artist; anything else, a pattern from its ref.
  const song = tile.activityRef.startsWith('song:')
    ? getSong(tile.activityRef.split(':')[1] ?? '')
    : undefined;
  const photo =
    song?.artistImageRef && song.artistImageSource !== 'none'
      ? song.artistImageRef
      : null;

  const body = (
    <>
      {photo ? (
        <img
          src={photo}
          alt=""
          draggable={false}
          className="size-[2.1em] shrink-0 rounded-[0.5em] object-cover"
        />
      ) : (
        <IdCover
          id={tile.activityRef || tile.id}
          className="size-[2.1em] rounded-[0.5em]"
        />
      )}
      <span className="min-w-0 flex-1 truncate font-semibold leading-tight">
        {title}
      </span>
    </>
  );

  if (!url) {
    return (
      <span
        className={`${CARD} border-dashed text-white/40`}
        style={{ fontSize: 'var(--slide-body-fz)' }}
        aria-label={`${module}: configure in Settings`}
      >
        <Settings className="size-[1em] shrink-0" aria-hidden />
        <span className="truncate">{module}: configure in Settings</span>
      </span>
    );
  }

  if (projected) {
    return (
      <div className={CARD} style={{ fontSize: 'var(--slide-body-fz)' }}>
        {body}
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label={`${title}, opens ${module} (${sectionLabel})`}
      className={`${CARD} transition-colors hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white`}
      style={{ fontSize: 'var(--slide-body-fz)' }}
    >
      {body}
      <ArrowUpRight className="size-[1em] shrink-0 text-white/60" aria-hidden />
    </a>
  );
};
