import { Triangle } from 'lucide-react';
import { useStore } from '@/daw/store';

// ── Instrument Artwork ────────────────────────────────────────────────────

const INSTRUMENT_ART: Record<
  string,
  { src: string; alt: string; label: string; description: string }
> = {
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
      className="glass-panel flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center border-b px-3"
        style={{ borderColor: 'var(--color-border)', height: 40 }}
      >
        <Triangle
          size={14}
          strokeWidth={1.8}
          className="mr-2 shrink-0"
          style={{ color: 'var(--color-accent)' }}
        />
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--color-text)' }}
        >
          Info
        </span>
        <div className="flex-1" />
        <div
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
          style={{ background: 'var(--gradient-brand)', color: '#fff' }}
        >
          P
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <InstrumentContent track={track} />
      </div>
    </div>
  );
}

// ── Instrument Content ────────────────────────────────────────────────────

function InstrumentContent({
  track,
}: {
  track?: { name: string; instrument: string; color: string };
}) {
  const art = track
    ? (INSTRUMENT_ART[track.instrument] ?? DEFAULT_ART)
    : DEFAULT_ART;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div
        className="aspect-square w-full overflow-hidden rounded-xl"
        style={{ boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)' }}
      >
        <img
          src={art.src}
          alt={art.alt}
          className="size-full object-cover"
          draggable={false}
        />
      </div>

      <div>
        <h3
          className="text-lg font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          {art.label}
        </h3>
        <p
          className="mt-1 text-xs leading-relaxed"
          style={{ color: 'var(--color-text-dim)' }}
        >
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
          <div className="mb-2 flex items-center gap-2">
            <div
              className="size-2 rounded-full"
              style={{ backgroundColor: track.color }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--color-text)' }}
            >
              {track.name}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span
              className="text-[10px]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {art.label}
            </span>
            <span
              className="text-[10px]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Prism Studio
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
