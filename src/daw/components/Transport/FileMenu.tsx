import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useRef, useCallback } from 'react';
import { FileDown, FileUp, ChevronDown } from 'lucide-react';
import { useStore } from '@/daw/store';
import {
  importMidiFile,
  exportMidiFile,
  downloadMidiBlob,
} from '@/daw/midi/MidiFileIO';
import type { MidiNoteEvent } from '@prism/engine';

// ── Helpers ─────────────────────────────────────────────────────────────────

const OUR_PPQ = 480;

/** Scale ticks if the imported file uses a different PPQ. */
function rescaleTick(tick: number, sourcePpq: number): number {
  if (sourcePpq === OUR_PPQ) return tick;
  return Math.round((tick * OUR_PPQ) / sourcePpq);
}

// ── Component ───────────────────────────────────────────────────────────────

export function FileMenu() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const arrayBuffer = await file.arrayBuffer();
      const sequences = importMidiFile(arrayBuffer);

      const state = useStore.getState();
      const COLORS = [
        '#8b5cf6',
        '#a855f7',
        '#f59e0b',
        '#f97316',
        '#22c55e',
        '#3b82f6',
        '#ef4444',
        '#06b6d4',
      ];

      for (let i = 0; i < sequences.length; i++) {
        const seq = sequences[i];
        const ppq = seq.ticksPerQuarterNote;
        const color = COLORS[i % COLORS.length];

        const trackId = state.addTrack(
          'midi',
          'oracle-synth',
          seq.trackName,
          color,
        );

        const events: MidiNoteEvent[] = seq.events.map((ev: MidiNoteEvent) => ({
          ...ev,
          startTick: rescaleTick(ev.startTick, ppq),
          durationTicks: rescaleTick(ev.durationTicks, ppq),
        }));

        state.addMidiClip(trackId, {
          id: `clip-import-${crypto.randomUUID().slice(0, 8)}`,
          name: seq.trackName,
          startTick: 0,
          events,
        });
      }

      // Reset input so the same file can be re-imported
      e.target.value = '';
    },
    [],
  );

  const handleExport = useCallback(() => {
    const state = useStore.getState();
    const sequences = new Map<
      number,
      {
        ticksPerQuarterNote: number;
        trackName: string;
        events: MidiNoteEvent[];
      }
    >();

    for (let i = 0; i < state.tracks.length; i++) {
      const track = state.tracks[i];
      if (track.midiClips.length === 0) continue;

      const allEvents = track.midiClips.flatMap((clip) => clip.events);
      if (allEvents.length === 0) continue;

      sequences.set(i + 1, {
        ticksPerQuarterNote: OUR_PPQ,
        trackName: track.name,
        events: allEvents,
      });
    }

    if (sequences.size === 0) return;

    const blob = exportMidiFile(sequences, state.bpm);
    downloadMidiBlob(blob, 'prism-session.mid');
  }, []);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mid,.midi"
        className="hidden"
        onChange={handleFileChange}
      />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors hover:bg-white/5"
            style={{
              color: 'var(--color-text)',
              background: 'none',
              border: 'none',
            }}
          >
            File
            <ChevronDown size={10} strokeWidth={2} />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 min-w-[160px] rounded-lg p-1 shadow-lg"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
            sideOffset={4}
          >
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs outline-none transition-colors hover:bg-white/5"
              style={{ color: 'var(--color-text)' }}
              onSelect={handleImport}
            >
              <FileUp size={13} strokeWidth={2} />
              Import MIDI
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs outline-none transition-colors hover:bg-white/5"
              style={{ color: 'var(--color-text)' }}
              onSelect={handleExport}
            >
              <FileDown size={13} strokeWidth={2} />
              Export MIDI
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}
