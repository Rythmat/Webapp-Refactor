/* eslint-disable tailwindcss/classnames-order */
import { useCallback, useMemo } from 'react';
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

// ── Track Templates ──────────────────────────────────────────────────────

interface TrackTemplate {
  label: string;
  animationId: AnimationId;
  color: string;
  borderGradient: string;
  trackType: TrackType;
  instrument: InstrumentType;
}

const ANIM_SIZE = 80;

const TRACK_TEMPLATES: TrackTemplate[] = [
  {
    label: 'Vocal',
    animationId: 'pulseWave',
    color: '#F0A0C0',
    borderGradient:
      'linear-gradient(45deg, #D2404A, #FF7348, #FEA92A, #FFCB30, #AED580, #7FC783, #28A69A, #62B4F7, #7885CB, #9D7FCE, #C785D3, #F8A8C5, #D2404A)',
    trackType: 'audio',
    instrument: 'vocal-fx',
  },
  {
    label: 'Instruments',
    animationId: 'pulseWaveSpiral',
    color: '#F4A0A0',
    borderGradient:
      'linear-gradient(45deg, #FF7348, #FEA92A, #FFCB30, #AED580, #7FC783, #28A69A, #62B4F7, #7885CB, #9D7FCE, #C785D3, #F8A8C5, #D2404A, #FF7348)',
    trackType: 'midi',
    instrument: 'soundfont',
  },
  {
    label: 'Synth',
    animationId: 'interwovenRingPulses',
    color: '#F7C0A3',
    borderGradient:
      'linear-gradient(45deg, #FFCB30, #AED580, #7FC783, #28A69A, #62B4F7, #7885CB, #9D7FCE, #C785D3, #F8A8C5, #D2404A, #FF7348, #FEA92A, #FFCB30)',
    trackType: 'midi',
    instrument: 'oracle-synth',
  },
  {
    label: 'Organ',
    animationId: 'flowingEnergyBands',
    color: '#F5E6A3',
    borderGradient:
      'linear-gradient(45deg, #AED580, #7FC783, #28A69A, #62B4F7, #7885CB, #9D7FCE, #C785D3, #F8A8C5, #D2404A, #FF7348, #FEA92A, #FFCB30, #AED580)',
    trackType: 'midi',
    instrument: 'tonewheel-organ',
  },
  {
    label: 'Drums',
    animationId: 'pulseWaveShockwave',
    color: '#A8D8B9',
    borderGradient:
      'linear-gradient(45deg, #7FC783, #28A69A, #62B4F7, #7885CB, #9D7FCE, #C785D3, #F8A8C5, #D2404A, #FF7348, #FEA92A, #FFCB30, #AED580, #7FC783)',
    trackType: 'midi',
    instrument: 'drum-machine',
  },
  {
    label: 'Guitar',
    animationId: 'pulseWaveStretched',
    color: '#A3C9F7',
    borderGradient:
      'linear-gradient(45deg, #62B4F7, #7885CB, #9D7FCE, #C785D3, #F8A8C5, #D2404A, #FF7348, #FEA92A, #FFCB30, #AED580, #7FC783, #28A69A, #62B4F7)',
    trackType: 'audio',
    instrument: 'guitar-fx',
  },
  {
    label: 'Bass',
    animationId: 'spiralRadiatingPulse',
    color: '#C4B5E0',
    borderGradient:
      'linear-gradient(45deg, #9D7FCE, #C785D3, #F8A8C5, #D2404A, #FF7348, #FEA92A, #FFCB30, #AED580, #7FC783, #28A69A, #62B4F7, #7885CB, #9D7FCE)',
    trackType: 'audio',
    instrument: 'bass-fx',
  },
  {
    label: 'Import',
    animationId: 'radiatingLineScan',
    color: '#B8C4D0',
    borderGradient:
      'linear-gradient(45deg, #C785D3, #F8A8C5, #D2404A, #FF7348, #FEA92A, #FFCB30, #AED580, #7FC783, #28A69A, #62B4F7, #7885CB, #9D7FCE, #C785D3)',
    trackType: 'midi',
    instrument: 'none',
  },
];

// ── AddTrackMenu ─────────────────────────────────────────────────────────

interface AddTrackMenuProps {
  onClose: () => void;
}

export function AddTrackMenu({ onClose }: AddTrackMenuProps) {
  const addTrack = useStore((s) => s.addTrack);
  const setSelectedTrackId = useStore((s) => s.setSelectedTrackId);
  const rootTrackColor = useStore((s) => s.rootTrackColor);

  const keyGradient = useMemo(
    () => (rootTrackColor ? buildMonoGradient(rootTrackColor) : null),
    [rootTrackColor],
  );

  const handleSelect = useCallback(
    (t: TrackTemplate) => {
      const id = addTrack(t.trackType, t.instrument, t.label, t.color);
      setSelectedTrackId(id);
      onClose();
    },
    [addTrack, setSelectedTrackId, onClose],
  );

  return (
    <div
      className="flex items-center gap-2 rounded-2xl px-4 py-3 mx-auto glass-panel"
      style={{
        backgroundColor: 'var(--color-surface-2)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.2)',
      }}
    >
      {TRACK_TEMPLATES.map((t) => (
        <div
          key={t.label}
          className="gradient-border-hover"
          style={
            {
              '--border-gradient': keyGradient ?? t.borderGradient,
            } as React.CSSProperties
          }
        >
          <button
            onClick={() => handleSelect(t)}
            className="flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.06] active:scale-95 cursor-pointer"
            style={{ minWidth: 100 }}
          >
            <span style={{ color: '#fff' }}>
              <AnimatedTrackIcon animationId={t.animationId} size={ANIM_SIZE} />
            </span>
            <span
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: 'var(--color-text)' }}
            >
              {t.label}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
