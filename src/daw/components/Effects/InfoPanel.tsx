import { Triangle } from 'lucide-react';
import { useStore } from '@/daw/store';

// ── Instrument Artwork ────────────────────────────────────────────────────

const INSTRUMENT_ART: Record<string, { src: string; alt: string; label: string; description: string }> = {
  'oracle-synth': {
    src: '/daw-assets/artwork/hexagons-synth.svg',
    alt: 'Oracle Synth hexagon artwork',
    label: 'Oracle Synth',
    description: 'Polyphonic subtractive synthesizer with dual oscillators',
  },
  'piano-sampler': {
    src: '/daw-assets/artwork/hexagons-piano.svg',
    alt: 'Piano hexagon artwork',
    label: 'Piano',
    description: 'Acoustic piano sampler with velocity layers',
  },
  'electric-piano': {
    src: '/daw-assets/artwork/hexagons-piano.svg',
    alt: 'Electric Piano hexagon artwork',
    label: 'Electric Piano',
    description: 'Sample-based electric piano with velocity response',
  },
  cello: {
    src: '/daw-assets/artwork/hexagons-synth.svg',
    alt: 'Cello hexagon artwork',
    label: 'Cello',
    description: 'Expressive cello sampler with natural tone',
  },
  organ: {
    src: '/daw-assets/artwork/hexagons-synth.svg',
    alt: 'Organ hexagon artwork',
    label: 'Organ',
    description: 'Classic organ sampler with rich harmonics',
  },
  soundfont: {
    src: '/daw-assets/artwork/hexagons-synth.svg',
    alt: 'SoundFont hexagon artwork',
    label: 'SoundFont (GM)',
    description: 'General MIDI instruments via SoundFont2 synthesis',
  },
  'drum-machine': {
    src: '/daw-assets/artwork/hexagons-drums.png',
    alt: 'Drum Machine hexagon artwork',
    label: 'Drum Machine',
    description: 'Sample-based drum machine with swappable kits',
  },
};

const DEFAULT_ART = {
  src: '/daw-assets/artwork/hexagons-synth.svg',
  alt: 'Instrument hexagon artwork',
  label: 'Instrument',
  description: 'Select a track to view instrument controls',
};

// ── InfoPanel ─────────────────────────────────────────────────────────────

export function InfoPanel() {
  const selectedTrackId = useStore((s) => s.selectedTrackId);
  const tracks = useStore((s) => s.tracks);
  const track = tracks.find((t) => t.id === selectedTrackId);

  return (
    <div
      className="w-72 shrink-0 flex flex-col overflow-hidden glass-panel rounded-2xl"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center px-3 shrink-0 border-b"
        style={{ borderColor: 'var(--color-border)', height: 40 }}
      >
        <Triangle
          size={14}
          strokeWidth={1.8}
          className="shrink-0 mr-2"
          style={{ color: 'var(--color-accent)' }}
        />
        <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
          Info
        </span>
        <div className="flex-1" />
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
          style={{ background: 'var(--gradient-brand)', color: '#fff' }}
        >
          P
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        <InstrumentContent track={track} />
      </div>
    </div>
  );
}

// ── Instrument Content ────────────────────────────────────────────────────

function InstrumentContent({ track }: { track?: { name: string; instrument: string; color: string } }) {
  const art = track ? (INSTRUMENT_ART[track.instrument] ?? DEFAULT_ART) : DEFAULT_ART;

  return (
    <div className="flex flex-col p-4 gap-4">
      <div
        className="w-full aspect-square rounded-xl overflow-hidden"
        style={{ boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)' }}
      >
        <img
          src={art.src}
          alt={art.alt}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          {art.label}
        </h3>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
          {art.description}
        </p>
      </div>

      {track && (
        <div
          className="rounded-lg p-3"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: track.color }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
              {track.name}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>
              {art.label}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>
              Prism Studio
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
