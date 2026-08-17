import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { getChordColorFromNotes } from '@prism/engine';
import { PianoKeyboard } from '@/components/PianoKeyboard/PianoKeyboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PlaybackEvent } from '@/contexts/PlaybackContext';
import { chordNameToMidi } from '@/curriculum/songLibrary/chordParser';
import type { ChordHit, SongMode } from '@/curriculum/types/songLibrary';
import { normalizeAccidentals } from '../songChart/chartOps';
import { degreeFromChord } from './chordDegree';
import {
  analyzeMidiToChordName,
  CHORD_TYPES,
  composeChordName,
} from './chordTypes';
import { NOTE_NAMES } from './songDefaults';
import { applyVoicingHint, voicingOptions } from './voicing';

const FALLBACK_RGB: [number, number, number] = [126, 207, 207];

const studioMode = (mode: SongMode): string =>
  mode === 'major' ? 'ionian' : mode === 'minor' ? 'aeolian' : mode;

const midiToPlaybackEvents = (midis: number[]): PlaybackEvent[] =>
  midis.map((midi, i) => ({
    id: `chord-${midi}-${i}`,
    type: 'note' as const,
    midi,
    time: 0,
    duration: 1,
    velocity: 0.8,
  }));

const parseRoot = (name: string): string => {
  const m = name.match(/^([A-G][♯♭#b]?)/);
  return m ? m[0] : '';
};

const PC_NAMES = [
  'C',
  'C♯',
  'D',
  'E♭',
  'E',
  'F',
  'F♯',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
];

/**
 * The selected-chord editor — a keyboard diagram (like the published Songs
 * page) plus the controls that set the chord: a name field, root + chord-type
 * dropdowns, a voicing dropdown, and MIDI-note analysis. The scale degree is
 * auto-derived from the key center and shown read-only.
 */
export const ChordEditorPopup = ({
  chord,
  keyRoot,
  mode,
  onChange,
  onRemove,
  onClose,
}: {
  chord: ChordHit;
  keyRoot: number;
  mode: SongMode;
  onChange: (patch: Partial<ChordHit>) => void;
  onRemove: () => void;
  onClose: () => void;
}) => {
  const [midiInput, setMidiInput] = useState('');
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const setName = (next: string) => {
    const name = normalizeAccidentals(next);
    onChange({ chordName: name, degree: degreeFromChord(name, keyRoot, mode) });
  };

  const root = parseRoot(chord.chordName) || 'C';
  const suffix = chord.chordName.slice(parseRoot(chord.chordName).length);
  const currentType = CHORD_TYPES.find((t) => t.suffix === suffix);

  const baseMidi = chordNameToMidi(chord.chordName);
  const options = voicingOptions(baseMidi.length);
  const currentVoicing = options.find(
    (o) => o.resultingOrder === chord.voicingHint,
  );
  const voiced = applyVoicingHint(baseMidi, chord.voicingHint);
  const [r, g, b] = baseMidi.length
    ? getChordColorFromNotes(baseMidi, keyRoot, studioMode(mode))
    : FALLBACK_RGB;
  const keyColor = `rgb(${r}, ${g}, ${b})`;
  const pillBg = `rgba(${r}, ${g}, ${b}, 0.18)`;

  const analyze = () => {
    const notes = midiInput
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 127);
    if (notes.length < 2) {
      setAnalyzeError('Enter at least two MIDI notes (e.g. 60, 64, 67).');
      return;
    }
    const name = analyzeMidiToChordName(notes, keyRoot);
    if (!name) {
      setAnalyzeError('No chord recognized for those notes.');
      return;
    }
    setAnalyzeError(null);
    setName(name);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-5">
          <div>
            <h3 className="font-serif text-xl font-bold text-white">
              {chord.chordName || 'New chord'}
            </h3>
            <p className="font-serif text-sm text-white/40">
              {chord.degree || '—'}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            aria-label="Remove chord"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        {/* Keyboard diagram (read-only, like the Songs page) */}
        <div className="px-3 pt-3" style={{ height: 120 }}>
          <PianoKeyboard
            startC={4}
            endC={6}
            playingNotes={midiToPlaybackEvents(voiced)}
            activeWhiteKeyColor={keyColor}
            activeBlackKeyColor={keyColor}
            enableClick={false}
          />
        </div>
        {voiced.length > 0 && (
          <div className="flex flex-wrap gap-2 px-5 pt-3">
            {voiced.map((m) => (
              <span
                key={m}
                className="rounded-full px-2 py-0.5 text-xs"
                style={{ background: pillBg, color: keyColor }}
              >
                {PC_NAMES[m % 12]}
                {Math.floor(m / 12) - 1}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-3 p-5">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Chord name
            </Label>
            <Input
              value={chord.chordName}
              placeholder="e.g. Cmaj7, F♯m, G/B"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Root
              </Label>
              <Select value={root} onValueChange={(v) => setName(v + suffix)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_NAMES.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Chord type
              </Label>
              <Select
                value={currentType?.id ?? ''}
                onValueChange={(id) => {
                  const t = CHORD_TYPES.find((x) => x.id === id);
                  if (t) setName(composeChordName(root, t));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type…" />
                </SelectTrigger>
                <SelectContent>
                  {CHORD_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {options.length > 0 && (
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Voicing
              </Label>
              <Select
                value={currentVoicing?.id ?? options[0].id}
                onValueChange={(id) => {
                  const v = options.find((x) => x.id === id);
                  onChange({ voicingHint: v?.resultingOrder });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.resultingOrder})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Analyze MIDI notes
            </Label>
            <div className="flex gap-2">
              <Input
                value={midiInput}
                placeholder="60, 64, 67"
                onChange={(e) => setMidiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') analyze();
                }}
              />
              <Button variant="outline" onClick={analyze}>
                Analyze
              </Button>
            </div>
            {analyzeError && (
              <p className="mt-1 text-xs text-amber-400">{analyzeError}</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              Degree:{' '}
              <span className="font-mono text-white/80">
                {chord.degree || '—'}
              </span>
            </span>
            <Button size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
