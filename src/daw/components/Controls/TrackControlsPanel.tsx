import React from 'react';
import { useStore } from '@/daw/store';
import { useSessionGeneration } from '@/daw/session/useSessionGeneration';
import {
  DrumPadsViewPart,
  GuitarBassViewPart,
  KeyboardViewPart,
  OracleSynthInlinePart,
  OracleSynthViewPart,
  OrganViewPart,
  SamplerChopsViewPart,
  SoundFontViewPart,
  VocalViewPart,
} from '@/daw/shell/lazyParts';
import { AudioMidiSourcePanel } from './AudioMidiSourcePanel';

// ── TrackControlsPanel ──────────────────────────────────────────────────
//
// The dock's Instrument tab: the selected track's instrument view. In a
// maximized dock (milestone 2.9) the Oracle synth shows its full panel, as
// its pop-out window did; the pop-outs are gone, so no instrument mounts a
// second copy of itself (dock-instruments-15).

export function TrackControlsPanel({ roomy = false }: { roomy?: boolean }) {
  // The selected track only: an edit to another track re-renders nothing.
  const track = useStore((s) =>
    s.tracks.find((t) => t.id === s.selectedTrackId),
  );
  const generation = useSessionGeneration();

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {track ? (
        // The views below copy some of the track into their own state as
        // they mount: the guitar and vocal pedal chains, the drum grid's note
        // selection, the organ's preset. So they mount again for every
        // track, and for every project loaded over this one
        // (useSessionGeneration): a project that reuses the track's id must
        // not get the last one's chain played and saved into it.
        <React.Fragment key={`${track.id}:${generation}`}>
          {/* Guitar/Bass-to-MIDI binding — MIDI/synth tracks only */}
          {track.type === 'midi' && <AudioMidiSourcePanel trackId={track.id} />}

          <div className="relative min-h-0 flex-1">
            {roomy && track.instrument === 'oracle-synth' ? (
              <OracleSynthViewPart />
            ) : (
              renderView(track)
            )}
          </div>
        </React.Fragment>
      ) : (
        <DefaultView message="Select a track to see its instrument" />
      )}
    </div>
  );
}

// ── View Router ─────────────────────────────────────────────────────────
// Each instrument's view is its own chunk (lazyParts, milestone 1.12a).

function renderView(track: { id: string; instrument: string }) {
  switch (track.instrument) {
    case 'piano-sampler':
    case 'electric-piano':
    case 'bass-electric':
    case 'guitar-acoustic':
    case 'cello':
    case 'organ':
      return <KeyboardViewPart trackId={track.id} />;
    case 'tonewheel-organ':
      return <OrganViewPart trackId={track.id} />;
    case 'guitar-fx':
    case 'bass-fx':
      return (
        <GuitarBassViewPart
          trackId={track.id}
          instrument={track.instrument as 'guitar-fx' | 'bass-fx'}
        />
      );
    case 'oracle-synth':
      return <OracleSynthInlinePart />;
    case 'soundfont':
      return <SoundFontViewPart trackId={track.id} />;
    case 'drum-machine':
      return <DrumPadsViewPart trackId={track.id} />;
    case 'sampler':
      return <SamplerChopsViewPart trackId={track.id} />;
    case 'vocal-fx':
      return <VocalViewPart trackId={track.id} />;
    default:
      return (
        <DefaultView message="No controls available for this track type" />
      );
  }
}

// ── Default View ────────────────────────────────────────────────────────

function DefaultView({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <span className="text-xs" style={{ color: 'var(--daw-text-3)' }}>
        {message}
      </span>
    </div>
  );
}
