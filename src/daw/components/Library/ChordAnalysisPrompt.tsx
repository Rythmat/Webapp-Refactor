import { useMemo, useState } from 'react';
import { useTrackColorOf } from '@/daw/harmony/trackColor';
import { Check, Sparkles } from 'lucide-react';
import { useStore } from '@/daw/store';
import { trackRole, type ChordAnalysis } from '@/daw/utils/chordAnalysis';
import { ChordSymbolChips, KeyLabel } from './ChordSymbolsSection';
import { plural } from './insightNotation';
import { Button } from '@/daw/ui/Button';
import { DawDialog } from '@/daw/ui/DawDialog';
import { TYPE_CLASS } from '@/daw/ui/styles';

const dim = { color: 'var(--daw-text-3)' };
const text = { color: 'var(--daw-text)' };
// How each role's notes are read. A track left on 'auto' that its name and
// instrument don't place is read as harmony, so it's labeled Chords.
const ROLE_LABEL: Record<string, string> = {
  chords: 'Chords',
  auto: 'Chords',
  bass: 'Bass',
  melody: 'Melody',
};

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
        className="mt-0.5 size-4 accent-[var(--daw-primary)]"
      />
      <span className="flex flex-col">
        <span className={TYPE_CLASS.body} style={text}>
          {title}
        </span>
        <span className={TYPE_CLASS.label} style={dim}>
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
  // Harmony Color: tracks in the key centre's colour, else their own.
  const colorOf = useTrackColorOf();
  const open = useStore((s) => s.chordAnalysisPromptOpen);
  const closePrompt = useStore((s) => s.closeChordAnalysisPrompt);
  const tracks = useStore((s) => s.tracks);
  const analyzeChords = useStore((s) => s.analyzeChords);
  const applyChordSymbols = useStore((s) => s.applyChordSymbols);
  const showInspectorPanel = useStore((s) => s.showInspectorPanel);

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
    if (result) showInspectorPanel('insight');
    finish();
  };

  const found = result?.regions.length ?? 0;

  // One dialog, three steps: which tracks, nothing found, or the chords.
  const step = !result ? 'ask' : found === 0 ? 'none' : 'found';

  return (
    <DawDialog
      open={open}
      onOpenChange={(o) => !o && notNow()}
      size="sm"
      data={{ 'data-testid': 'chord-analysis-prompt' }}
      title={
        step === 'ask'
          ? 'Analyze this project’s chords?'
          : step === 'none'
            ? 'No chords found'
            : 'Use these chord symbols?'
      }
      description={
        step === 'ask' ? (
          'This project has notes but no chord symbols yet. Music Atlas can read the music and suggest chord symbols for the chord lane. You’ll see them before anything is added.'
        ) : step === 'none' ? (
          'Music Atlas couldn’t read chords from those tracks. Try including the tracks that play the harmony.'
        ) : result ? (
          <>
            Music Atlas found {plural(found, 'chord')} in{' '}
            <KeyLabel rootNote={result.rootNote} mode={result.mode} />
            {result.keyDetected && ' (detected from the notes)'}. Use them and
            they’ll appear in the chord lane and lead sheet.
          </>
        ) : null
      }
      footer={
        step === 'ask' ? (
          <>
            <Button onClick={notNow}>Not now</Button>
            <Button
              variant="primary"
              disabled={chooseTracks && picked.size === 0}
              onClick={analyze}
            >
              <Sparkles strokeWidth={2} />
              Analyze
            </Button>
          </>
        ) : step === 'none' ? (
          <>
            <Button onClick={() => setResult(null)}>Back</Button>
            <Button variant="primary" onClick={finish}>
              Close
            </Button>
          </>
        ) : (
          <>
            <Button onClick={notNow}>Not now</Button>
            <Button variant="primary" onClick={useChords}>
              <Check strokeWidth={2} />
              Use Chord Symbols
            </Button>
          </>
        )
      }
    >
      {step === 'ask' && (
        <>
          <div className="flex flex-col gap-2.5">
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
                    className={`flex min-h-6 cursor-pointer items-center gap-2 ${TYPE_CLASS.body}`}
                    style={text}
                  >
                    <input
                      type="checkbox"
                      checked={picked.has(t.id)}
                      onChange={() => toggleTrack(t.id)}
                      className="size-4 accent-[var(--daw-primary)]"
                    />
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: colorOf(t.color) }}
                    />
                    {t.name}
                    <span className={TYPE_CLASS.label} style={dim}>
                      {ROLE_LABEL[trackRole(t)] ?? ''}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <p className={`mt-4 ${TYPE_CLASS.label}`} style={dim}>
            You can analyze any time from Insight → Chord Symbols.
          </p>
        </>
      )}
      {step === 'found' && result && (
        <>
          <ChordSymbolChips
            regions={result.regions}
            rootNote={result.rootNote}
            mode={result.mode}
          />
          <p className={`mt-4 ${TYPE_CLASS.label}`} style={dim}>
            Not now keeps this analysis in Insight, where you can use it or
            re-analyze later.
          </p>
        </>
      )}
    </DawDialog>
  );
}
