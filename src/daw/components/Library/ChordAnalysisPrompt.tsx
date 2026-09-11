import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState, type ReactNode } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { useStore } from '@/daw/store';
import { trackRole, type ChordAnalysis } from '@/daw/utils/chordAnalysis';
import { ChordSymbolChips, KeyLabel } from './ChordSymbolsSection';

const dim = { color: 'var(--color-text-dim)' };
const text = { color: 'var(--color-text)' };
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
// How each role's notes are read. A track left on 'auto' that its name and
// instrument don't place is read as harmony, so it's labeled Chords.
const ROLE_LABEL: Record<string, string> = {
  chords: 'Chords',
  auto: 'Chords',
  bass: 'Bass',
  melody: 'Melody',
};

function PromptButton({
  children,
  onClick,
  primary = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
      style={
        primary
          ? { backgroundColor: 'var(--color-accent)', color: '#0b1216' }
          : { border: '1px solid var(--color-border)', ...dim }
      }
    >
      {children}
    </button>
  );
}

function ScopeChoice({
  checked,
  onSelect,
  title,
  detail,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2">
      <input
        type="radio"
        name="chord-analysis-scope"
        checked={checked}
        onChange={onSelect}
        className="mt-0.5"
      />
      <span className="flex flex-col">
        <span className="text-xs font-medium" style={text}>
          {title}
        </span>
        <span className="text-[11px] leading-snug" style={dim}>
          {detail}
        </span>
      </span>
    </label>
  );
}

/**
 * Asks, when a project opens with notes but no chord symbols, whether to
 * analyze its chords — across every track or chosen ones — then shows what
 * the analysis found and asks whether to use those chord symbols. Declining
 * at either step leaves the chord lane untouched; Insight keeps the analysis.
 */
export function ChordAnalysisPrompt() {
  const open = useStore((s) => s.chordAnalysisPromptOpen);
  const closePrompt = useStore((s) => s.closeChordAnalysisPrompt);
  const tracks = useStore((s) => s.tracks);
  const analyzeChords = useStore((s) => s.analyzeChords);
  const applyChordSymbols = useStore((s) => s.applyChordSymbols);
  const setLibraryOpen = useStore((s) => s.setLibraryOpen);

  const [chooseTracks, setChooseTracks] = useState(false);
  const [chosen, setChosen] = useState<Set<string> | null>(null);
  const [result, setResult] = useState<ChordAnalysis | null>(null);

  // Tracks that can hold chords: MIDI tracks with notes, other than drums.
  const candidates = useMemo(
    () =>
      tracks.filter(
        (t) =>
          t.type === 'midi' &&
          trackRole(t) !== 'drums' &&
          t.midiClips.some((c) => c.events.length > 0),
      ),
    [tracks],
  );
  // Until the user changes it, every candidate but the melody is chosen.
  const picked =
    chosen ??
    new Set(
      candidates.filter((t) => trackRole(t) !== 'melody').map((t) => t.id),
    );

  const finish = () => {
    closePrompt();
    setChooseTracks(false);
    setChosen(null);
    setResult(null);
  };
  const toggleTrack = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChosen(next);
  };
  const analyze = () =>
    setResult(
      analyzeChords(
        chooseTracks
          ? candidates.filter((t) => picked.has(t.id)).map((t) => t.id)
          : null,
      ),
    );
  const useChords = () => {
    applyChordSymbols();
    finish();
  };
  const notNow = () => {
    // Keep what was found in view: Insight holds the analysis.
    if (result) setLibraryOpen(true);
    finish();
  };

  const found = result?.regions.length ?? 0;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && notNow()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          data-testid="chord-analysis-prompt"
          className="fixed left-1/2 top-1/2 z-50 flex w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl p-5 outline-none"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {!result ? (
            <>
              <Dialog.Title className="text-sm font-semibold" style={text}>
                Analyze this project’s chords?
              </Dialog.Title>
              <Dialog.Description
                className="mt-1.5 text-xs leading-relaxed"
                style={dim}
              >
                This project has notes but no chord symbols yet. Music Atlas can
                read the music and suggest chord symbols for the chord lane —
                you’ll see them before anything is added.
              </Dialog.Description>
              <div className="mt-4 flex flex-col gap-2.5">
                <ScopeChoice
                  checked={!chooseTracks}
                  onSelect={() => setChooseTracks(false)}
                  title="All tracks"
                  detail="Reads the chords from each track’s role: chords over the bass, with melody and drums left out."
                />
                <ScopeChoice
                  checked={chooseTracks}
                  onSelect={() => setChooseTracks(true)}
                  title="Choose tracks"
                  detail="Pick the tracks that play the harmony."
                />
                {chooseTracks && (
                  <div className="ml-6 flex flex-col gap-1.5">
                    {candidates.map((t) => (
                      <label
                        key={t.id}
                        className="flex cursor-pointer items-center gap-2 text-xs"
                        style={text}
                      >
                        <input
                          type="checkbox"
                          checked={picked.has(t.id)}
                          onChange={() => toggleTrack(t.id)}
                        />
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        {t.name}
                        <span className="text-[10px]" style={dim}>
                          {ROLE_LABEL[trackRole(t)] ?? ''}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-4 text-[11px]" style={dim}>
                You can analyze any time from Insight → Chord Symbols.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <PromptButton onClick={notNow}>Not now</PromptButton>
                <PromptButton
                  primary
                  disabled={chooseTracks && picked.size === 0}
                  onClick={analyze}
                >
                  <Sparkles size={12} strokeWidth={2} />
                  Analyze
                </PromptButton>
              </div>
            </>
          ) : found === 0 ? (
            <>
              <Dialog.Title className="text-sm font-semibold" style={text}>
                No chords found
              </Dialog.Title>
              <Dialog.Description
                className="mt-1.5 text-xs leading-relaxed"
                style={dim}
              >
                Music Atlas couldn’t read chords from those tracks. Try
                including the tracks that play the harmony.
              </Dialog.Description>
              <div className="mt-5 flex justify-end gap-2">
                <PromptButton onClick={() => setResult(null)}>
                  Back
                </PromptButton>
                <PromptButton primary onClick={finish}>
                  Close
                </PromptButton>
              </div>
            </>
          ) : (
            <>
              <Dialog.Title className="text-sm font-semibold" style={text}>
                Use these chord symbols?
              </Dialog.Title>
              <Dialog.Description
                className="mt-1.5 text-xs leading-relaxed"
                style={dim}
              >
                Music Atlas found {plural(found, 'chord')} in{' '}
                <KeyLabel rootNote={result.rootNote} mode={result.mode} />
                {result.keyDetected && ' (detected from the notes)'}. Use them
                and they’ll appear in the chord lane and lead sheet.
              </Dialog.Description>
              <div className="mt-3">
                <ChordSymbolChips regions={result.regions} />
              </div>
              <p className="mt-4 text-[11px]" style={dim}>
                Not now keeps this analysis in Insight, where you can use it or
                re-analyze later.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <PromptButton onClick={notNow}>Not now</PromptButton>
                <PromptButton primary onClick={useChords}>
                  <Check size={12} strokeWidth={2} />
                  Use Chord Symbols
                </PromptButton>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
