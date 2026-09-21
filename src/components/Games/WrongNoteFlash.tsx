import { useCallback, useEffect, useRef, useState } from 'react';
import { noteLabel, WRONG_NOTE_FLASH_MS } from './liveFeedback';

interface Flash {
  midi: number;
  /** Bumped on every wrong press so a repeat of the same pitch re-flashes. */
  seq: number;
}

/** The latest wrong note, cleared after a moment. */
export function useWrongNoteFlash() {
  const [flash, setFlash] = useState<Flash | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const seqRef = useRef(0);

  const flashWrong = useCallback((midi: number) => {
    seqRef.current += 1;
    setFlash({ midi, seq: seqRef.current });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setFlash(null), WRONG_NOTE_FLASH_MS);
  }, []);

  const clearFlash = useCallback(() => {
    clearTimeout(timerRef.current);
    setFlash(null);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { flash, flashWrong, clearFlash };
}

interface WrongNoteFlashProps {
  flash: Flash | null;
  noteSpelling?: ReadonlyMap<number, string>;
}

/** "✕ F♯4" over the keyboard, naming the pitch that wasn't wanted. */
export const WrongNoteFlash = ({ flash, noteSpelling }: WrongNoteFlashProps) =>
  flash ? (
    <div
      key={flash.seq}
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-full rounded-full px-3 py-1 text-sm font-semibold animate-in fade-in"
      style={{
        background: 'rgba(24,24,27,0.92)',
        border: '1px solid #71717a',
        color: 'var(--color-text)',
      }}
    >
      ✕ {noteLabel(flash.midi, noteSpelling)}
    </div>
  ) : null;
