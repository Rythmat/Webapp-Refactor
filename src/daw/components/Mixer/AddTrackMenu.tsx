/* eslint-disable tailwindcss/classnames-order */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useStore, type InstrumentType, type TrackType } from '@/daw/store';
import {
  AnimatedTrackIcon,
  type AnimationId,
} from '@/components/ui/circle-animations-collection-3';
import { cn } from '@/components/utilities';
import { addInstrumentTrack } from '@/daw/commands/trackCommands';
import { pickerFamilies } from '@/daw/instruments/simpleInstruments';
import { InstrumentPicker } from '@/daw/components/TrackControls/InstrumentPicker';
import { FOCUS_RING, TYPE_CLASS } from '@/daw/ui/styles';

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
    label: 'Sampler',
    animationId: 'pulseWaveBreathingGrid',
    color: '#9FD8D8',
    borderGradient:
      'linear-gradient(45deg, #28A69A, #62B4F7, #7885CB, #9D7FCE, #C785D3, #F8A8C5, #D2404A, #FF7348, #FEA92A, #FFCB30, #AED580, #7FC783, #28A69A)',
    trackType: 'midi',
    instrument: 'sampler',
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
// The track types as cards. Instruments, the beginner's way in, opens the
// simple instrument picker in place of the cards (the track header's own),
// so a new track starts on the instrument chosen; Back returns to the cards.
// Every other card adds its track at once, as before, and keeps its lesson
// anchor (add-track-<instrument>).

interface AddTrackMenuProps {
  onClose: () => void;
}

/** The card that opens the instrument picker instead of adding a track. */
const PICKS_INSTRUMENT: InstrumentType = 'soundfont';

export function AddTrackMenu({ onClose }: AddTrackMenuProps) {
  const addTrack = useStore((s) => s.addTrack);
  const setSelectedTrackId = useStore((s) => s.setSelectedTrackId);
  const rootTrackColor = useStore((s) => s.rootTrackColor);
  const [picking, setPicking] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const instrumentsCardRef = useRef<HTMLButtonElement>(null);
  const returnToCard = useRef(false);

  const keyGradient = useMemo(
    () => (rootTrackColor ? buildMonoGradient(rootTrackColor) : null),
    [rootTrackColor],
  );

  // Focus follows the step: the families as the picker opens, the
  // Instruments card on the way back.
  useEffect(() => {
    if (picking) {
      pickerRef.current
        ?.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
        ?.focus();
    } else if (returnToCard.current) {
      returnToCard.current = false;
      instrumentsCardRef.current?.focus();
    }
  }, [picking]);

  const handleSelect = useCallback(
    (t: TrackTemplate) => {
      if (t.instrument === PICKS_INSTRUMENT) {
        setPicking(true);
        return;
      }
      // addTrack returns '' (and toasts) when a track limit is hit.
      const id = addTrack(t.trackType, t.instrument, t.label, t.color);
      if (!id) return;
      setSelectedTrackId(id);
      onClose();
    },
    [addTrack, setSelectedTrackId, onClose],
  );

  if (picking) {
    return (
      <div
        ref={pickerRef}
        data-tutorial-id="add-track-instrument-picker"
        className="mx-auto flex w-[440px] max-w-[calc(100vw-32px)] flex-col gap-2 rounded-2xl border border-daw-hairline bg-daw-popover p-3 shadow-xl"
      >
        <button
          type="button"
          data-tutorial-id="add-track-back"
          onClick={() => {
            returnToCard.current = true;
            setPicking(false);
          }}
          className={cn(
            'flex h-7 w-fit items-center gap-1 rounded-[var(--daw-radius-sm)] px-2 text-daw-text-2 hover:bg-daw-hover hover:text-daw-text',
            TYPE_CLASS.label,
            FOCUS_RING,
          )}
        >
          <ChevronLeft aria-hidden className="size-4" />
          All Track Types
        </button>
        <InstrumentPicker
          families={pickerFamilies(null)}
          onPick={(item) => {
            // '' (and a toast) when a track limit is hit: stay open.
            if (addInstrumentTrack(item.id)) onClose();
          }}
          title="Choose an Instrument"
          description="Your new track plays it. You can change it later from the track's instrument button."
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 rounded-2xl px-4 py-3 mx-auto"
      style={{
        backgroundColor: 'var(--daw-popover)',
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
          {/* Tutorial anchor per card; oracle-synth keeps its original
              'add-track-synth' id (existing lesson data targets it). */}
          <button
            ref={
              t.instrument === PICKS_INSTRUMENT ? instrumentsCardRef : undefined
            }
            data-tutorial-id={
              t.instrument === 'oracle-synth'
                ? 'add-track-synth'
                : `add-track-${t.instrument}`
            }
            aria-haspopup={t.instrument === PICKS_INSTRUMENT || undefined}
            onClick={() => handleSelect(t)}
            className="flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.06] active:scale-95 cursor-pointer"
            style={{ minWidth: 100 }}
          >
            <span style={{ color: '#fff' }}>
              <AnimatedTrackIcon animationId={t.animationId} size={ANIM_SIZE} />
            </span>
            <span
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: 'var(--daw-text)' }}
            >
              {t.label}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
