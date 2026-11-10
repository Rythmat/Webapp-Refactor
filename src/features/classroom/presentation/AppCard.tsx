import { ArrowUpRight, Settings } from 'lucide-react';
import { IdCover } from '@/features/office/ui/ClassCover';
import { useTeacherConfig } from '../settings/useTeacherConfig';
import type { SlideSurface } from '../slides/types';
import type { LaunchTile as LaunchTileData, StudentLanguage } from '../types';
import { pickLocalized } from './localized';
import { resolveModuleUrl } from './resolveModuleUrl';

// ── A slide's link into the app (owner, 2026-11-09) ─────────────────────────
// What used to be a white pill is a card, as Learn's are: a cover, the
// module in small caps (LEARN · STUDIO · GLOBE · ARCADE), the title. It is
// drawn on the slide canvas, so it sizes from the slide's own type tokens
// (canvas px on the stage, rem in a phone's reflow), never from the page.
//
// The room's screen cannot be tapped by a student, so the projector card is
// not a link; it says where the activity opens instead. Every other surface
// (the student's device, Present, the teacher's preview) opens it, in a new
// tab so the lesson stays where it was.

const MODULE_LABEL: Record<LaunchTileData['module'], string> = {
  learn: 'Learn',
  studio: 'Studio',
  globe: 'Globe',
  arcade: 'Arcade',
};

const ON_YOUR_DEVICE = { en: 'On your device', es: 'En tu dispositivo' };

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

  const body = (
    <>
      <IdCover
        id={tile.activityRef || tile.id}
        className="size-[2.1em] rounded-[0.5em]"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-[0.1em]">
        <span
          className="truncate font-bold uppercase leading-none tracking-[0.08em] text-white/50"
          style={{ fontSize: 'var(--slide-label-fz)' }}
        >
          {module}
          {projected && ` · ${pickLocalized(ON_YOUR_DEVICE, language)}`}
        </span>
        <span className="truncate font-semibold leading-tight">{title}</span>
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
