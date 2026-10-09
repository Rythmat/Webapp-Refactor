import { DevProfiler } from '@/daw/dev/DevProfiler';
import { SaveStatusChip } from './SaveStatusChip';

// ── The practice screen's header (milestone 1.4) ───────────────────────────
//
// Back to lesson · the track's name · the save chip and 'Take it to the
// Studio'. Lifted from PracticeTrackView unchanged in look; the chip is the
// one addition. No Undo/Redo: the practice screen has no undo (Cmd+Z is off
// there). The teal 'Take it to the Studio' pill is today's practice accent
// (--color-accent); Stage B restyles it with the rest of Practice. Its text
// is var(--color-bg) (#101012 in the editor) where it was #191919: the
// shell's lint allows no hex literal, and the step is not visible.
//
// Three columns, so the title stays centred now that the right-hand group
// (chip and pill) is wider than the back button; it wraps below md, as before.

export interface PracticeHeaderProps {
  /** Shown as given (the caller formats accidentals). */
  projectName: string;
  onBack(): void;
  onTakeToStudio(): void;
}

export function PracticeHeader({
  projectName,
  onBack,
  onTakeToStudio,
}: PracticeHeaderProps) {
  return (
    <header
      data-testid="practice-header"
      className="flex flex-wrap items-center justify-between gap-3 md:grid md:grid-cols-[1fr_auto_1fr]"
    >
      <button
        type="button"
        onClick={onBack}
        className="justify-self-start rounded-full px-4 py-1.5 text-sm transition-colors hover:bg-white/5"
        style={{ border: '1px solid var(--color-border)' }}
      >
        &larr; Back to lesson
      </button>
      <h1
        className="min-w-0 truncate text-center text-sm font-medium"
        style={{ color: 'var(--color-text-dim)' }}
      >
        {projectName}
      </h1>
      <div className="flex items-center gap-3 justify-self-end">
        <DevProfiler id="PracticeHeaderChip">
          <SaveStatusChip />
        </DevProfiler>
        <button
          type="button"
          onClick={onTakeToStudio}
          className="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
          }}
        >
          Take it to the Studio &rarr;
        </button>
      </div>
    </header>
  );
}
