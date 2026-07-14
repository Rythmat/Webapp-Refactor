import {
  AudioWaveform,
  Flame,
  LayoutTemplate,
  Music,
  Plus,
  Sparkles,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';
import { PROJECT_TEMPLATES } from '@/daw/data/projectTemplates';

interface StudioTemplatesProps {
  /** When set, show a "View All Templates +" pill linking here (dashboard use). */
  viewAllTo?: string;
}

// The templates carry a lucide icon name; map the known set (fallback: Music).
const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Flame,
  Music,
  Sparkles,
  AudioWaveform,
};

/**
 * Project Templates section — genre starting points from `PROJECT_TEMPLATES`
 * (Rock/R&B/Pop/Indie). A tile opens the DAW editor preloaded with that
 * template's tracks + BPM (`/studio/editor?template=<id>`).
 */
export const StudioTemplates = ({ viewAllTo }: StudioTemplatesProps = {}) => {
  const navigate = useNavigate();

  return (
    <section
      aria-label="Project Templates"
      className="flex flex-col gap-4 md:gap-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <LayoutTemplate className="h-7 w-7 text-white/85 md:h-8 md:w-8" />
          <h2 className="text-xl font-medium text-white md:text-2xl">
            Project Templates
          </h2>
        </div>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white md:text-base"
          >
            <span>View All Templates</span>
            <Plus className="h-5 w-5" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
        {PROJECT_TEMPLATES.map((t) => {
          const Icon = ICONS[t.icon] ?? Music;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                navigate(`${StudioRoutes.editor.definition}?template=${t.id}`)
              }
              className="group flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:border-white/25 hover:bg-white/[0.07]"
            >
              <div
                className="flex size-12 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${t.color}22`, color: t.color }}
              >
                <Icon className="size-6" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-medium text-white">
                  {t.label}
                </div>
                <div className="truncate text-xs text-white/55">
                  {t.genre} · {t.bpm} BPM
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
