import { SkipBack, Play, SkipForward } from 'lucide-react';
import { useStore } from '@/daw/store';

export function StatusBar() {
  const isPlaying = useStore((s) => s.isPlaying);

  return (
    <div
      className="flex items-center justify-between h-7 px-3 shrink-0 select-none"
      style={{
        backgroundColor: 'rgba(9, 9, 11, 0.9)',
        borderTop: 'var(--glass-border)',
      }}
    >
      {/* Left — project name */}
      <span
        className="text-[10px]"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Galaxy Beats
      </span>

      {/* Center — mini transport indicators */}
      <div className="flex items-center gap-2" style={{ color: 'var(--color-text-dim)' }}>
        <SkipBack size={10} fill="currentColor" strokeWidth={0} />
        <Play
          size={10}
          fill="currentColor"
          strokeWidth={0}
          style={{ color: isPlaying ? 'var(--color-play)' : 'var(--color-text-dim)' }}
        />
        <SkipForward size={10} fill="currentColor" strokeWidth={0} />
      </div>

      {/* Right — File + Studio */}
      <div className="flex items-center gap-3">
        <span
          className="text-[10px]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          File
        </span>
        <span
          className="text-[10px]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Studio
        </span>
      </div>
    </div>
  );
}
