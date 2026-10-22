import { modeWord } from '@/daw/shell/song/keyPopover';
import { useStore } from '@/daw/store';
import type { UnisonDocument } from '@/unison/types/schema';
import { rgbString } from './insightConstants';

// ── The song's key, in Insight (2026-10-21) ────────────────────────────────
//
// The key the student set is the key: Insight states it, with no percentage
// and no list of other keys (it used to show the detector's doubt, '43%',
// beside the student's own choice). Only when the notes clearly say another
// key (the detector is sure, and it isn't this one) does a line say so,
// with a button to take it.

/** How sure the notes must be before Insight says they disagree. */
const DISAGREE_AT = 0.85;

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
  const heard = unisonDoc?.analysis.key.fromNotes;
  const disagrees =
    heard &&
    heard.confidence >= DISAGREE_AT &&
    (heard.rootPc !== rootNote || heard.mode !== mode);

  return (
    <div
      data-testid="insight-key"
      className="flex flex-col gap-1.5 border-b px-3 py-2"
      style={{ borderColor: 'var(--daw-hairline)' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: rgbString(kr, kg, kb) }}
        />
        <span
          className="text-[12px] font-semibold"
          style={{ color: 'var(--daw-text)' }}
        >
          Key of {keyLetter} {modeWord(mode)}
        </span>
      </div>

      {disagrees && heard ? (
        <div
          data-testid="insight-key-heard"
          className="flex items-center justify-between gap-2"
        >
          <span className="text-[12px]" style={{ color: 'var(--daw-text-3)' }}>
            The notes sound like {heard.rootName} {modeWord(heard.mode)}
          </span>
          <button
            type="button"
            onClick={() => {
              const s = useStore.getState();
              const wasLocked = s.rootLocked;
              if (wasLocked) s.toggleRootLock();
              s.setRootNote(heard.rootPc);
              s.setMode(heard.mode);
              if (wasLocked) s.toggleRootLock();
            }}
            className="shrink-0 rounded px-1.5 py-0.5 text-[12px] font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--daw-surface-2)',
              color: 'var(--daw-text)',
            }}
          >
            Use it
          </button>
        </div>
      ) : null}
    </div>
  );
}
