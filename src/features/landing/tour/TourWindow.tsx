import { Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';

/**
 * Faux app window for a module demo: traffic lights, an
 * `app.musicatlas.io/<module>` URL pill and a sound toggle around the scene.
 */
export const TourWindow = ({
  path,
  soundOn,
  onToggleSound,
  children,
}: {
  path: string;
  soundOn: boolean;
  onToggleSound: () => void;
  children: ReactNode;
}) => {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#101012] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#141416] px-4">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
        </span>
        <span className="mx-auto flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-black/30 px-3 py-0.5 text-[11px] text-white/45">
          app.musicatlas.io/
          <span className="text-white/75">{path}</span>
        </span>
        <button
          type="button"
          onClick={onToggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? 'Mute demo sound' : 'Turn on demo sound'}
          className={cn(
            'flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] transition-colors',
            soundOn
              ? 'bg-white/10 text-white'
              : 'text-white/50 hover:bg-white/5 hover:text-white',
          )}
        >
          {soundOn ? (
            <Volume2 className="size-3.5" />
          ) : (
            <VolumeX className="size-3.5" />
          )}
          Sound
        </button>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
};
