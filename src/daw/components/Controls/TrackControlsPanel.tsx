import React, { useState, useCallback } from 'react';
import { Maximize2 } from 'lucide-react';
import { useStore } from '@/daw/store';
import { PopOutOverlay } from '@/daw/components/ChannelStrip/PopOutOverlay';
import { useSessionGeneration } from '@/daw/session/useSessionGeneration';
import {
  DrumMachineViewPart,
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

// ── Instrument label for overlay title ───────────────────────────────────

function instrumentTitle(instrument: string): string {
  switch (instrument) {
    case 'oracle-synth':
      return 'Oracle Synth';
    case 'piano-sampler':
      return 'Piano Sampler';
    case 'electric-piano':
      return 'Electric Piano';
    case 'bass-electric':
      return 'Electric Bass';
    case 'guitar-acoustic':
      return 'Acoustic Guitar';
    case 'cello':
      return 'Cello';
    case 'organ':
      return 'Organ';
    case 'tonewheel-organ':
      return 'Tonewheel Organ';
    case 'soundfont':
      return 'SoundFont (GM)';
    case 'drum-machine':
      return 'Drum Machine';
    case 'sampler':
      return 'Sampler';
    case 'guitar-fx':
      return 'Guitar FX';
    case 'bass-fx':
      return 'Bass FX';
    case 'vocal-fx':
      return 'Vocal FX';
    default:
      return 'Controls';
  }
}

// Instruments that show a Maximize2 pop-out button
const POP_OUT_BUTTON_INSTRUMENTS = new Set([
  'oracle-synth',
  'piano-sampler',
  'electric-piano',
  'bass-electric',
  'guitar-acoustic',
  'cello',
  'organ',
  'tonewheel-organ',
  'soundfont',
]);

// ── TrackControlsPanel ──────────────────────────────────────────────────

export function TrackControlsPanel() {
  // The selected track only: an edit to another track re-renders nothing.
  const track = useStore((s) =>
    s.tracks.find((t) => t.id === s.selectedTrackId),
  );
  const generation = useSessionGeneration();
  const [popOut, setPopOut] = useState(false);
  const openPopOut = useCallback(() => setPopOut(true), []);
  const closePopOut = useCallback(() => setPopOut(false), []);

  const showPopOutButton =
    track && POP_OUT_BUTTON_INSTRUMENTS.has(track.instrument);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {track ? (
        // The views below, the pop-out's included, copy some of the track
        // into their own state as they mount: the guitar and vocal pedal
        // chains, the drum grid's note selection, the organ's preset. So
        // they mount again for every track, and for every project loaded
        // over this one (useSessionGeneration): a project that reuses the
        // track's id must not get the last one's chain played and saved
        // into it.
        <React.Fragment key={`${track.id}:${generation}`}>
          {/* Guitar/Bass-to-MIDI binding — MIDI/synth tracks only */}
          {track.type === 'midi' && <AudioMidiSourcePanel trackId={track.id} />}

          <div className="relative min-h-0 flex-1">
            {renderView(track)}

            {/* Pop-out button for oversized instruments */}
            {showPopOutButton && (
              <button
                onClick={openPopOut}
                className="absolute right-2 top-2 flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors"
                style={{
                  color: 'var(--daw-text-3)',
                  border: 'none',
                  background: 'rgba(0,0,0,0.3)',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    'rgba(255,255,255,0.12)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.3)')
                }
                title="Open in full screen"
              >
                <Maximize2 size={13} strokeWidth={1.8} />
              </button>
            )}
          </div>

          {/* Full-screen overlay */}
          <PopOutOverlay
            isOpen={popOut}
            onClose={closePopOut}
            title={instrumentTitle(track.instrument)}
            trackColor={track.color}
            fullScreen={track.instrument === 'oracle-synth'}
          >
            {track.instrument === 'oracle-synth' ? (
              <OracleSynthViewPart />
            ) : (
              renderView(track)
            )}
          </PopOutOverlay>
        </React.Fragment>
      ) : (
        <DefaultView message="Select a track to see controls" />
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
      return <DrumMachineViewPart trackId={track.id} />;
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
