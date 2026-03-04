import { useState, useCallback } from 'react';
import { Maximize2 } from 'lucide-react';
import { useStore } from '@/daw/store';
import { PopOutOverlay } from '@/daw/components/ChannelStrip/PopOutOverlay';
import { KeyboardView } from './KeyboardView';
import { GuitarBassView } from './GuitarBassView';
import { OracleSynthView } from './OracleSynthView';
import { OracleSynthInline } from './OracleSynthInline';
import { DrumMachineView } from './DrumMachineView';
import { SoundFontView } from './SoundFontView';
import { VocalView } from './VocalView';
import { OrganView } from './OrganView';

// ── Instrument label for overlay title ───────────────────────────────────

function instrumentTitle(instrument: string): string {
  switch (instrument) {
    case 'oracle-synth': return 'Oracle Synth';
    case 'piano-sampler': return 'Piano Sampler';
    case 'electric-piano': return 'Electric Piano';
    case 'cello': return 'Cello';
    case 'organ': return 'Organ';
    case 'tonewheel-organ': return 'Tonewheel Organ';
    case 'soundfont': return 'SoundFont (GM)';
    case 'drum-machine': return 'Drum Machine';
    case 'guitar-fx': return 'Guitar FX';
    case 'bass-fx': return 'Bass FX';
    case 'vocal-fx': return 'Vocal FX';
    default: return 'Controls';
  }
}

// Instruments that show a Maximize2 pop-out button
const POP_OUT_BUTTON_INSTRUMENTS = new Set(['oracle-synth', 'piano-sampler', 'electric-piano', 'cello', 'organ', 'tonewheel-organ', 'soundfont']);

// ── TrackControlsPanel ──────────────────────────────────────────────────

export function TrackControlsPanel() {
  const selectedTrackId = useStore((s) => s.selectedTrackId);
  const tracks = useStore((s) => s.tracks);
  const track = tracks.find((t) => t.id === selectedTrackId);
  const [popOut, setPopOut] = useState(false);
  const openPopOut = useCallback(() => setPopOut(true), []);
  const closePopOut = useCallback(() => setPopOut(false), []);

  const showPopOutButton = track && POP_OUT_BUTTON_INSTRUMENTS.has(track.instrument);

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {track ? (
        <>
          {renderView(track)}

          {/* Pop-out button for oversized instruments */}
          {showPopOutButton && (
            <button
              onClick={openPopOut}
              className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-md transition-colors cursor-pointer"
              style={{ color: 'var(--color-text-dim)', border: 'none', background: 'rgba(0,0,0,0.3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.3)')}
              title="Open in full screen"
            >
              <Maximize2 size={13} strokeWidth={1.8} />
            </button>
          )}

          {/* Full-screen overlay */}
          <PopOutOverlay
            isOpen={popOut}
            onClose={closePopOut}
            title={instrumentTitle(track.instrument)}
            trackColor={track.color}
          >
            {track.instrument === 'oracle-synth' ? <OracleSynthView /> : renderView(track)}
          </PopOutOverlay>
        </>
      ) : (
        <DefaultView message="Select a track to see controls" />
      )}
    </div>
  );
}

// ── View Router ─────────────────────────────────────────────────────────

function renderView(track: { id: string; instrument: string }) {
  switch (track.instrument) {
    case 'piano-sampler':
    case 'electric-piano':
    case 'cello':
    case 'organ':
      return <KeyboardView trackId={track.id} />;
    case 'tonewheel-organ':
      return <OrganView trackId={track.id} />;
    case 'guitar-fx':
    case 'bass-fx':
      return <GuitarBassView trackId={track.id} instrument={track.instrument as 'guitar-fx' | 'bass-fx'} />;
    case 'oracle-synth':
      return <OracleSynthInline />;
    case 'soundfont':
      return <SoundFontView trackId={track.id} />;
    case 'drum-machine':
      return <DrumMachineView trackId={track.id} />;
    case 'vocal-fx':
      return <VocalView trackId={track.id} />;
    default:
      return <DefaultView message="No controls available for this track type" />;
  }
}

// ── Default View ────────────────────────────────────────────────────────

function DefaultView({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full p-4">
      <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
        {message}
      </span>
    </div>
  );
}
