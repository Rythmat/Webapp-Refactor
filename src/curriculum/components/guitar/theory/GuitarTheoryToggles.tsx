import { memo } from 'react';
import { theoryString } from '@/curriculum/data/guitar/theoryNotes';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';

// ── GuitarTheoryToggles ────────────────────────────────────────────────────
// The optional theory layers, as switches: chord-job badges over Music Map
// bars, shared-note badges between chords, and the teacher/classroom
// setting for Roman numerals. Per device (useGuitarDisplaySettings).

export interface GuitarTheoryTogglesProps {
  /** "Show chord jobs" (Music Map steps). */
  jobs?: boolean;
  /** "Show shared notes" (steps that change chords). */
  shared?: boolean;
  /** "Show Roman numerals": a teacher/classroom setting. */
  roman?: boolean;
  keyColor?: string;
}

function Switch({
  label,
  checked,
  onChange,
  keyColor,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  keyColor: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] motion-safe:transition-colors hover:bg-white/10"
      style={{
        border: `1px solid ${checked ? keyColor : 'var(--color-border, rgba(255,255,255,0.12))'}`,
        color: checked
          ? 'var(--color-text, #e8e8f0)'
          : 'var(--color-text-dim, #9a9aab)',
      }}
    >
      {/* The knob's side says on or off without colour. */}
      <span
        aria-hidden
        className="relative inline-block h-2.5 w-5 rounded-full"
        style={{ border: '1px solid currentColor' }}
      >
        <span
          className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full motion-safe:transition-[left]"
          style={{
            left: checked ? 'calc(100% - 0.5rem)' : '0.125rem',
            background: checked ? keyColor : 'currentColor',
          }}
        />
      </span>
      {label}
    </button>
  );
}

export const GuitarTheoryToggles = memo(function GuitarTheoryToggles({
  jobs = false,
  shared = false,
  roman = false,
  keyColor = 'var(--color-text, #e8e8f0)',
}: GuitarTheoryTogglesProps) {
  const showChordJobs = useGuitarDisplaySettings((s) => s.showChordJobs);
  const setShowChordJobs = useGuitarDisplaySettings((s) => s.setShowChordJobs);
  const showSharedNotes = useGuitarDisplaySettings((s) => s.showSharedNotes);
  const setShowSharedNotes = useGuitarDisplaySettings(
    (s) => s.setShowSharedNotes,
  );
  const showRomanNumerals = useGuitarDisplaySettings(
    (s) => s.showRomanNumerals,
  );
  const setShowRomanNumerals = useGuitarDisplaySettings(
    (s) => s.setShowRomanNumerals,
  );
  if (!jobs && !shared && !roman) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {jobs && (
        <Switch
          label={theoryString('toggle.showJobs')}
          checked={showChordJobs}
          onChange={setShowChordJobs}
          keyColor={keyColor}
        />
      )}
      {shared && (
        <Switch
          label="Show shared notes"
          checked={showSharedNotes}
          onChange={setShowSharedNotes}
          keyColor={keyColor}
        />
      )}
      {roman && (
        <Switch
          label={theoryString('toggle.roman')}
          checked={showRomanNumerals}
          onChange={setShowRomanNumerals}
          keyColor={keyColor}
        />
      )}
    </div>
  );
});
