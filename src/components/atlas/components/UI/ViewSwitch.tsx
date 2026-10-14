import { Earth, Waves } from 'lucide-react';
import { ATLAS_FOCUS } from '@/components/atlas/components/UI/primitives';
import type { AtlasView } from '@/components/atlas/navigation/atlasFrame';
import {
  useAtlasFrame,
  useAtlasNavigate,
} from '@/components/atlas/navigation/useAtlasNavigate';
import { cn } from '@/lib/utils';

/** Loads the timeline's code before it is asked for (atlas.tsx). */
export const prefetchRiver = () =>
  void import('@/components/atlas/components/River/TimeRiver');

const VIEWS: { view: AtlasView; label: string; Icon: typeof Earth }[] = [
  { view: 'map', label: 'Globe', Icon: Earth },
  { view: 'timeline', label: 'Timeline', Icon: Waves },
];

/**
 * Globe or timeline, after Dorot's map / axis switch: the same section seen
 * on the map or as a river through time. Keeps the lens, the years and the
 * stop; adds no step to Back.
 */
export function ViewSwitch() {
  const view = useAtlasFrame((frame) => frame.view);
  const navigate = useAtlasNavigate();
  return (
    <div
      aria-label="View"
      className="flex shrink-0 items-center rounded-full border border-white/15 bg-white/[0.04] p-0.5"
      role="group"
    >
      {VIEWS.map(({ view: v, label, Icon }) => (
        <button
          key={v}
          aria-label={label}
          aria-pressed={view === v}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition-colors',
            view === v
              ? 'bg-white text-atlas-page'
              : 'text-atlas-text-2 hover:text-atlas-text',
            ATLAS_FOCUS,
          )}
          title={`See it as a ${label.toLowerCase()}`}
          type="button"
          onClick={() => navigate.setFrame({ view: v })}
          onFocus={v === 'timeline' ? prefetchRiver : undefined}
          onPointerEnter={v === 'timeline' ? prefetchRiver : undefined}
        >
          <Icon aria-hidden className="size-4" />
          <span aria-hidden className="hidden xl:inline">
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
