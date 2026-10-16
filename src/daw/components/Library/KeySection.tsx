import { useStore } from '@/daw/store';
import { rgbString } from './insightConstants';
import type { UnisonDocument } from '@/unison/types/schema';

interface KeySectionProps {
  keyLetter: string | null;
  keyColor: [number, number, number];
  rootNote: number | null;
  mode: string;
  unisonDoc: UnisonDocument | null;
}

export function KeySection({
  keyLetter,
  keyColor,
  rootNote,
  mode,
  unisonDoc,
}: KeySectionProps) {
  const [kr, kg, kb] = keyColor;
  const unisonKey = unisonDoc?.analysis.key;

  return (
    <div
      className="flex flex-col gap-1.5 px-3 py-2 border-b"
      style={{ borderColor: 'var(--daw-hairline)' }}
    >
      {/* Key label + confidence */}
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: rgbString(kr, kg, kb) }}
        />
        <span
          className="text-[11px] font-semibold"
          style={{ color: 'var(--daw-text)' }}
        >
          Key of {keyLetter}
        </span>
        {unisonKey && (
          <span
            className="text-[9px] tabular-nums"
            style={{ color: 'var(--daw-text-3)' }}
          >
            {Math.round(unisonKey.confidence * 100)}%
          </span>
        )}
      </div>

      {/* Alternate keys from UNISON */}
      {unisonKey && unisonKey.alternateKeys.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {unisonKey.alternateKeys.map((alt, i) => {
            const isActive = alt.rootPc === rootNote && alt.mode === mode;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const s = useStore.getState();
                  const wasLocked = s.rootLocked;
                  if (wasLocked) s.toggleRootLock();
                  s.setRootNote(alt.rootPc);
                  s.setMode(alt.mode);
                  if (wasLocked) s.toggleRootLock();
                }}
                className="rounded px-1.5 py-0.5 text-[9px] transition-colors cursor-pointer"
                style={{
                  backgroundColor: isActive
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'var(--daw-surface-2)',
                  color: isActive ? 'var(--daw-accent)' : 'var(--daw-text-3)',
                  border: isActive
                    ? '1px solid rgba(255, 255, 255, 0.3)'
                    : '1px solid transparent',
                }}
              >
                {alt.rootName} {alt.modeDisplay}
                <span
                  className="ml-1 text-[8px] tabular-nums"
                  style={{ opacity: 0.6 }}
                >
                  {Math.round(alt.confidence * 100)}%
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
