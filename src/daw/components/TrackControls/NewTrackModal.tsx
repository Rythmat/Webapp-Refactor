import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useCallback } from 'react';
import { Mic, Music, KeyboardMusic, Drum, FileUp, Piano } from 'lucide-react';
import { useStore } from '@/daw/store';
import type { TrackType, InstrumentType } from '@/daw/store';

// ── Guitar Pick Icon (SVGRepo — fill style) ────────────────────────────

function GuitarPickIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.448,26.655c0.001,-0.001 0.001,-0.001 0.001,-0.002c2.407,-3.406 6.792,-9.888 8.717,-14.401c0.535,-1.252 0.882,-2.367 0.983,-3.246c0.088,-0.778 -0.016,-1.414 -0.263,-1.881c-0.359,-0.676 -1.158,-1.309 -2.339,-1.783c-2.201,-0.881 -5.872,-1.342 -9.545,-1.342c-3.673,-0 -7.344,0.461 -9.545,1.342c-1.181,0.474 -1.98,1.107 -2.338,1.783c-0.248,0.467 -0.352,1.103 -0.263,1.881c0.1,0.879 0.447,1.994 0.982,3.246c1.925,4.513 6.31,10.995 8.716,14.402c0.001,0 0.001,0.001 0.001,0.002c0.563,0.792 1.475,1.263 2.447,1.263c0.972,-0 1.884,-0.471 2.446,-1.264Zm-1.631,-1.157c-0.188,0.264 -0.491,0.421 -0.815,0.421c-0.324,0 -0.628,-0.157 -0.815,-0.421c-2.346,-3.321 -6.633,-9.632 -8.51,-14.03c-0.375,-0.88 -0.652,-1.675 -0.781,-2.345c-0.086,-0.449 -0.142,-0.813 -0.01,-1.061c0.109,-0.207 0.339,-0.37 0.627,-0.536c0.422,-0.242 0.961,-0.45 1.585,-0.632c2.061,-0.601 4.983,-0.894 7.904,-0.894c2.921,-0 5.843,0.293 7.904,0.894c0.624,0.182 1.163,0.39 1.585,0.632c0.288,0.166 0.518,0.329 0.628,0.536c0.131,0.248 0.075,0.612 -0.011,1.061c-0.129,0.67 -0.406,1.465 -0.781,2.345c-1.877,4.398 -6.164,10.709 -8.51,14.03l-0,-0Z" />
      <path d="M15.993,8.956l0,0.001c-0.001,0.018 -0.001,0.036 -0.001,0.054l-0,4.601c-0.236,-0.066 -0.485,-0.101 -0.742,-0.101c-1.518,-0 -2.75,1.232 -2.75,2.75c0,1.517 1.232,2.75 2.75,2.75c1.518,-0 2.75,-1.233 2.75,-2.75c0,-0.073 -0.008,-4.835 -0.008,-4.835l1.301,1.301c0.39,0.39 1.024,0.39 1.414,-0c0.39,-0.391 0.39,-1.024 0,-1.414l-3.008,-3.009c-0.39,-0.39 -1.024,-0.39 -1.414,0c-0.182,0.181 -0.279,0.415 -0.292,0.652Zm-0.743,6.555c0.414,-0 0.75,0.336 0.75,0.75c0,0.414 -0.336,0.75 -0.75,0.75c-0.414,-0 -0.75,-0.336 -0.75,-0.75c0,-0.414 0.336,-0.75 0.75,-0.75Z" />
    </svg>
  );
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
  icon: React.ReactNode;
  color: string;
  trackType: TrackType;
  instrument: InstrumentType;
}

const ICON_SIZE = 24;

const TRACK_TEMPLATES: TrackTemplate[] = [
  {
    label: 'Vocal',
    description: 'Record voice or sound',
    icon: <Mic size={ICON_SIZE} strokeWidth={2} />,
    color: '#ef4444',
    trackType: 'audio',
    instrument: 'vocal-fx',
  },
  {
    label: 'Instruments',
    description: 'Play via MIDI keyboard',
    icon: <Music size={ICON_SIZE} strokeWidth={2} />,
    color: '#22c55e',
    trackType: 'midi',
    instrument: 'soundfont',
  },
  {
    label: 'Synth',
    description: 'Oracle Synth',
    icon: <KeyboardMusic size={ICON_SIZE} strokeWidth={2} />,
    color: '#8b5cf6',
    trackType: 'midi',
    instrument: 'oracle-synth',
  },
  {
    label: 'Tonewheel Organ',
    description: 'Hammond B3 organ',
    icon: <Piano size={ICON_SIZE} strokeWidth={2} />,
    color: '#FFB347',
    trackType: 'midi',
    instrument: 'tonewheel-organ',
  },
  {
    label: 'Drum Machine',
    description: 'Beat sequencing',
    icon: <Drum size={ICON_SIZE} strokeWidth={2} />,
    color: '#f59e0b',
    trackType: 'midi',
    instrument: 'drum-machine',
  },
  {
    label: 'Guitar',
    description: 'Audio via interface',
    icon: <GuitarPickIcon size={ICON_SIZE} />,
    color: '#3b82f6',
    trackType: 'audio',
    instrument: 'guitar-fx',
  },
  {
    label: 'Bass',
    description: 'Audio via interface',
    icon: <GuitarPickIcon size={ICON_SIZE} />,
    color: '#8b5cf6',
    trackType: 'audio',
    instrument: 'bass-fx',
  },
  {
    label: 'Import Audio/MIDI',
    description: 'Drag in files',
    icon: <FileUp size={ICON_SIZE} strokeWidth={2} />,
    color: '#6b7280',
    trackType: 'midi',
    instrument: 'none',
  },
];

// ── Component ────────────────────────────────────────────────────────────

export function NewTrackModal({ open, onOpenChange }: NewTrackModalProps) {
  const addTrack = useStore((s) => s.addTrack);

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
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />

        {/* Content */}
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg p-6 rounded-2xl z-50 outline-none glass-panel"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Header */}
          <Dialog.Title
            className="text-lg font-semibold mb-4"
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
              <button
                key={template.label}
                onClick={() => handleSelect(template)}
                className="flex flex-col items-start rounded-xl p-4 min-h-24 text-left transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{
                  backgroundColor: `${template.color}26`, // ~15% opacity
                  border: `1px solid ${template.color}4D`, // ~30% opacity
                }}
              >
                <span className="mb-2" style={{ color: 'var(--color-text)' }}>{template.icon}</span>
                <span
                  className="text-sm font-bold"
                  style={{ color: 'var(--color-text)' }}
                >
                  {template.label}
                </span>
                <span
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  {template.description}
                </span>
              </button>
            ))}
          </div>

          {/* Close button (X) */}
          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
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
