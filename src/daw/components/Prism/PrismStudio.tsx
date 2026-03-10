import { useCallback, useMemo } from 'react';
import { Scissors, Lock, Unlock } from 'lucide-react';
import { useStore } from '@/daw/store';
import {
  getChordColor,
  abbreviateSequence,
  ionianToModeLabel,
  getModeOffset,
} from '@prism/engine';
import { CircleOfFifths } from './CircleOfFifths';
import { ColorSpectrum } from './ColorSpectrum';
import { ChordSelection, RhythmExpression } from './ChordBuilder';

// ── Constants ────────────────────────────────────────────────────────────

const STUDIO_GENRES = [
  'Pop',
  'Rock',
  'Jazz',
  'Funk',
  'Folk',
  'EDM',
  'Hip Hop',
  'R&B',
  'Reggae',
  'Latin',
  'Indie',
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────

const moduleCard = (w: number | 'flex-1'): React.CSSProperties => ({
  ...(w === 'flex-1'
    ? { flex: 1, minWidth: 200 }
    : { width: w, minWidth: w, maxWidth: w, flexShrink: 0 }),
  background: '#242424',
  border: '1px solid #333',
  borderRadius: 4,
  padding: 8,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 8,
});

const titleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: 'var(--color-text-dim)',
};

// ── Component ────────────────────────────────────────────────────────────

export function PrismStudio() {
  // ── State ──
  const stringSeq = useStore((s) => s.stringSeq);
  const rootNote = useStore((s) => s.rootNote);
  const chordSeq = useStore((s) => s.chordSeq);
  const genre = useStore((s) => s.genre);
  const availableFirstChords = useStore((s) => s.availableFirstChords);
  const availableNextChords = useStore((s) => s.availableNextChords);
  const mode = useStore((s) => s.mode);

  // ── Actions ──
  const rootLocked = useStore((s) => s.rootLocked);
  const addChord = useStore((s) => s.addChord);
  const undoChord = useStore((s) => s.undoChord);
  const toggleRootLock = useStore((s) => s.toggleRootLock);
  const selectGenre = useStore((s) => s.selectGenre);
  const generateToTracks = useStore((s) => s.generateToTracks);

  // ── Track validation ──
  const selectedTrackId = useStore((s) => s.selectedTrackId);
  const tracks = useStore((s) => s.tracks);
  const selectedTrack = useMemo(
    () => tracks.find((t) => t.id === selectedTrackId),
    [tracks, selectedTrackId],
  );
  const isMidiTrack = selectedTrack?.type === 'midi';

  // ── Derived ──
  const chordOptions =
    stringSeq.length === 0 ? availableFirstChords : availableNextChords;
  const canGenerate = chordSeq.length > 0 && isMidiTrack;
  const rootMidi = (rootNote ?? 0) + 48;
  const parentRoot = rootMidi - getModeOffset(mode);

  // ── Handlers ──
  const handleGenreClick = useCallback(
    (g: string) => () => selectGenre(g),
    [selectGenre],
  );

  const handleGenerate = useCallback(() => {
    generateToTracks();
  }, [generateToTracks]);

  return (
    <div
      className="flex h-full overflow-x-auto"
      style={{
        gap: 6,
        padding: 6,
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.15) transparent',
      }}
    >
      {/* ── Key (Circle of Fifths) ──────────────────────────── */}
      <div style={moduleCard(160)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span style={titleStyle}>Key</span>
            {rootNote !== null && (
              <button
                onClick={toggleRootLock}
                className="cursor-pointer rounded p-0.5 transition-colors hover:bg-white/10"
                style={{
                  color: rootLocked
                    ? 'var(--color-accent)'
                    : 'var(--color-text-dim)',
                  border: 'none',
                  background: 'none',
                }}
                aria-label={rootLocked ? 'Unlock root note' : 'Lock root note'}
              >
                {rootLocked ? <Lock size={10} /> : <Unlock size={10} />}
              </button>
            )}
          </div>
          {stringSeq.length > 0 && (
            <button
              onClick={undoChord}
              className="cursor-pointer rounded p-1 transition-colors hover:bg-white/10"
              style={{
                color: 'var(--color-text-dim)',
                border: 'none',
                background: 'none',
              }}
              aria-label="Undo last chord"
            >
              <Scissors size={12} />
            </button>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center">
          <CircleOfFifths size={130} />
        </div>
      </div>

      {/* ── Chord Selection ────────────────────────────────── */}
      <div
        style={{
          ...moduleCard(220),
          overflowY: 'auto',
          scrollbarWidth: 'thin',
        }}
      >
        <span style={titleStyle}>Chord Selection</span>

        {stringSeq.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {stringSeq.map((name, i) => {
              const [r, g, b] = getChordColor(name, parentRoot);
              return (
                <div
                  key={`${name}-${i}`}
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
                  title={abbreviateSequence(ionianToModeLabel(name, mode))}
                />
              );
            })}
          </div>
        )}

        <ChordSelection />
      </div>

      {/* ── Harmony (Color Spectrum) ───────────────────────── */}
      <div style={moduleCard('flex-1')}>
        <span style={titleStyle}>Harmony</span>

        <div className="flex flex-1">
          <ColorSpectrum
            chordOptions={chordOptions}
            rootMidi={rootMidi}
            mode={mode}
            onSelectChord={addChord}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="h-8 rounded-lg text-xs font-semibold transition-colors"
          style={{
            width: '100%',
            backgroundColor: canGenerate
              ? 'var(--color-accent)'
              : 'var(--color-surface-2)',
            color: canGenerate ? '#fff' : 'var(--color-text-dim)',
            border: 'none',
            opacity: canGenerate ? 1 : 0.5,
            cursor: canGenerate ? 'pointer' : 'not-allowed',
          }}
        >
          {!isMidiTrack ? 'Select a MIDI track' : 'Create'}
        </button>
      </div>

      {/* ── Rhythm & Expression ────────────────────────────── */}
      <div
        style={{
          ...moduleCard(200),
          overflowY: 'auto',
          scrollbarWidth: 'thin',
        }}
      >
        <span style={titleStyle}>Rhythm & Expression</span>
        <RhythmExpression />
      </div>

      {/* ── Style (Genre) ──────────────────────────────────── */}
      <div style={moduleCard(180)}>
        <span style={titleStyle}>Style</span>

        <div className="flex flex-wrap gap-1">
          {STUDIO_GENRES.map((g) => {
            const isActive = genre === g;
            return (
              <button
                key={g}
                onClick={handleGenreClick(g)}
                className="flex h-6 cursor-pointer items-center gap-0.5 rounded-full px-2 text-[10px] font-medium transition-colors"
                style={{
                  backgroundColor: isActive
                    ? 'var(--color-accent)'
                    : 'rgba(255, 255, 255, 0.06)',
                  color: isActive ? '#fff' : 'var(--color-text-dim)',
                  border: 'none',
                }}
              >
                <span style={{ fontSize: 9 }}>&#9834;</span>
                {g}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
