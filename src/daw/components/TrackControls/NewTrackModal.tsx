import { useCallback, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useStore, type InstrumentType, type TrackType } from '@/daw/store';
import {
  AnimatedTrackIcon,
  type AnimationId,
} from '@/components/ui/circle-animations-collection-3';

// ── Gradient helpers ─────────────────────────────────────────────────────

function buildMonoGradient(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const light = `rgb(${Math.min(r + 80, 255)}, ${Math.min(g + 80, 255)}, ${Math.min(b + 80, 255)})`;
  const dark = `rgb(${Math.max(r - 60, 0)}, ${Math.max(g - 60, 0)}, ${Math.max(b - 60, 0)})`;
  return `linear-gradient(45deg, ${light}, ${hex}, ${dark}, ${hex}, ${light})`;
}

// ── Props ────────────────────────────────────────────────────────────────
interface NewTrackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Track Templates ──────────────────────────────────────────────────────
interface TrackTemplate {
  label: string;
  description: string;
  animationId: AnimationId;
  color: string;
  borderGradient: string;
  trackType: TrackType;
  instrument: InstrumentType;
}

const ANIM_SIZE = 52;

const TRACK_TEMPLATES: TrackTemplate[] = [
  {
    label: 'Vocal',
    description: 'Record voice or sound',
    animationId: 'pulseWave',
    color: '#F0A0C0',
    borderGradient:
      'linear-gradient(45deg, #D2404A, #FF7348, #FEA92A, #FFCB30, #AED580, #7FC783, #28A69A, #62B4F7, #7885CB, #9D7FCE, #C785D3, #F8A8C5, #D2404A)',
    trackType: 'audio',
    instrument: 'vocal-fx',
  },
  {
    label: 'Instruments',
    description: 'Play via MIDI keyboard',
    animationId: 'pulseWaveSpiral',
    color: '#F4A0A0',
    borderGradient:
      'linear-gradient(45deg, #FF7348, #FEA92A, #FFCB30, #AED580, #7FC783, #28A69A, #62B4F7, #7885CB, #9D7FCE, #C785D3, #F8A8C5, #D2404A, #FF7348)',
    trackType: 'midi',
    instrument: 'soundfont',
  },
  {
    label: 'Synth',
    description: 'Oracle Synth',
    animationId: 'interwovenRingPulses',
    color: '#F7C0A3',
    borderGradient:
      'linear-gradient(45deg, #FFCB30, #AED580, #7FC783, #28A69A, #62B4F7, #7885CB, #9D7FCE, #C785D3, #F8A8C5, #D2404A, #FF7348, #FEA92A, #FFCB30)',
    trackType: 'midi',
    instrument: 'oracle-synth',
  },
  {
    label: 'Tonewheel Organ',
    description: 'Hammond B3 organ',
    animationId: 'flowingEnergyBands',
    color: '#F5E6A3',
    borderGradient:
      'linear-gradient(45deg, #AED580, #7FC783, #28A69A, #62B4F7, #7885CB, #9D7FCE, #C785D3, #F8A8C5, #D2404A, #FF7348, #FEA92A, #FFCB30, #AED580)',
    trackType: 'midi',
    instrument: 'tonewheel-organ',
  },
  {
    label: 'Drum Machine',
    description: 'Beat sequencing',
    animationId: 'pulseWaveShockwave',
    color: '#A8D8B9',
    borderGradient:
      'linear-gradient(45deg, #7FC783, #28A69A, #62B4F7, #7885CB, #9D7FCE, #C785D3, #F8A8C5, #D2404A, #FF7348, #FEA92A, #FFCB30, #AED580, #7FC783)',
    trackType: 'midi',
    instrument: 'drum-machine',
  },
  {
    label: 'Guitar',
    description: 'Audio via interface',
    animationId: 'pulseWaveStretched',
    color: '#A3C9F7',
    borderGradient:
      'linear-gradient(45deg, #62B4F7, #7885CB, #9D7FCE, #C785D3, #F8A8C5, #D2404A, #FF7348, #FEA92A, #FFCB30, #AED580, #7FC783, #28A69A, #62B4F7)',
    trackType: 'audio',
    instrument: 'guitar-fx',
  },
  {
    label: 'Bass',
    description: 'Audio via interface',
    animationId: 'spiralRadiatingPulse',
    color: '#C4B5E0',
    borderGradient:
      'linear-gradient(45deg, #9D7FCE, #C785D3, #F8A8C5, #D2404A, #FF7348, #FEA92A, #FFCB30, #AED580, #7FC783, #28A69A, #62B4F7, #7885CB, #9D7FCE)',
    trackType: 'audio',
    instrument: 'bass-fx',
  },
  {
    label: 'Import Audio/MIDI',
    description: 'Drag in files',
    animationId: 'radiatingLineScan',
    color: '#B8C4D0',
    borderGradient:
      'linear-gradient(45deg, #C785D3, #F8A8C5, #D2404A, #FF7348, #FEA92A, #FFCB30, #AED580, #7FC783, #28A69A, #62B4F7, #7885CB, #9D7FCE, #C785D3)',
    trackType: 'midi',
    instrument: 'none',
  },
];

// ── Component ────────────────────────────────────────────────────────────

export function NewTrackModal({ open, onOpenChange }: NewTrackModalProps) {
  const addTrack = useStore((s) => s.addTrack);
  const rootTrackColor = useStore((s) => s.rootTrackColor);

  const keyGradient = useMemo(
    () => (rootTrackColor ? buildMonoGradient(rootTrackColor) : null),
    [rootTrackColor],
  );

  const handleSelect = useCallback(
    (template: TrackTemplate) => {
      addTrack(
        template.trackType,
        template.instrument,
        template.label,
        template.color,
      );
      onOpenChange(false);
    },
    [addTrack, onOpenChange],
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />

        {/* Content */}
        <Dialog.Content
          className="glass-panel fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 outline-none"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            boxShadow:
              '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Header */}
          <Dialog.Title
            className="mb-4 text-lg font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            Add Track
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Choose a track type to add to your project.
          </Dialog.Description>

          {/* Card Grid */}
          <div className="grid grid-cols-2 gap-3">
            {TRACK_TEMPLATES.map((template) => (
              <div
                key={template.label}
                className="gradient-border-hover"
                style={
                  {
                    '--border-gradient': keyGradient ?? template.borderGradient,
                  } as React.CSSProperties
                }
              >
                <button
                  onClick={() => handleSelect(template)}
                  className="flex min-h-24 w-full cursor-pointer flex-col items-start rounded-xl p-4 text-left transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: `${template.color}26`, // ~15% opacity
                    border: `1px solid ${template.color}4D`, // ~30% opacity
                  }}
                >
                  <span className="mb-2" style={{ color: 'var(--color-text)' }}>
                    <AnimatedTrackIcon
                      animationId={template.animationId}
                      size={ANIM_SIZE}
                    />
                  </span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {template.label}
                  </span>
                  <span
                    className="mt-0.5 text-xs"
                    style={{ color: 'var(--color-text-dim)' }}
                  >
                    {template.description}
                  </span>
                </button>
              </div>
            ))}
          </div>

          {/* Close button (X) */}
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
              style={{ color: 'var(--color-text-dim)' }}
              aria-label="Close"
            >
              &#x2715;
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
