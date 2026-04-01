// ── InputStatusIndicator ─────────────────────────────────────────────────
// Shows which input source is active (auto-detected) and provides
// audio device settings when in acoustic piano mode.
//
// - MIDI detected → "MIDI: [device name]" with plug icon
// - No MIDI → "Acoustic Piano" with mic icon + level meter

import { Mic, Plug, ChevronDown, ChevronUp } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import type { AudioInputDevice } from '@/daw/midi/AudioInputEnumerator';
import type { InputSource } from '@/hooks/music/useLearnInput';
import { LearnAudioCapture } from '@/learn/audio/LearnAudioCapture';
import { AudioLevelMeter } from './AudioLevelMeter';

// ── Types ────────────────────────────────────────────────────────────────

interface InputStatusIndicatorProps {
  activeSource: InputSource;
  isListening: boolean;
  inputLevel: number;
  midiDeviceName: string | null;
  error: string | null;
  /** Called when user selects a different audio device. */
  onAudioDeviceChange?: (deviceId: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────

export const InputStatusIndicator = memo(function InputStatusIndicator({
  activeSource,
  isListening,
  inputLevel,
  midiDeviceName,
  error,
  onAudioDeviceChange,
}: InputStatusIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioInputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Load audio devices when expanded
  useEffect(() => {
    if (!expanded || activeSource !== 'audio') return;
    let cancelled = false;
    LearnAudioCapture.getDevices().then((devices) => {
      if (!cancelled) setAudioDevices(devices);
    });
    return () => {
      cancelled = true;
    };
  }, [expanded, activeSource]);

  const handleDeviceSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const deviceId = e.target.value;
      setSelectedDeviceId(deviceId);
      onAudioDeviceChange?.(deviceId);
    },
    [onAudioDeviceChange],
  );

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const isMidi = activeSource === 'midi';

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {/* Main indicator bar */}
      <button
        onClick={toggleExpanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 6,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.03)',
          color: 'var(--color-text)',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        {isMidi ? (
          <>
            <Plug size={13} strokeWidth={2} />
            <span>{midiDeviceName ?? 'MIDI Controller'}</span>
          </>
        ) : (
          <>
            <Mic
              size={13}
              strokeWidth={2}
              style={{
                color: isListening ? '#4ade80' : 'var(--color-text)',
                animation: isListening
                  ? 'pulse 2s ease-in-out infinite'
                  : 'none',
              }}
            />
            <span>Acoustic Piano</span>
            {isListening && (
              <AudioLevelMeter level={inputLevel} width={48} height={4} />
            )}
          </>
        )}

        {activeSource === 'audio' &&
          (expanded ? (
            <ChevronUp size={11} strokeWidth={2} />
          ) : (
            <ChevronDown size={11} strokeWidth={2} />
          ))}
      </button>

      {/* Error display */}
      {error && (
        <div
          style={{
            fontSize: 10,
            color: '#f87171',
            paddingLeft: 10,
          }}
        >
          {error}
        </div>
      )}

      {/* Expanded audio settings panel */}
      {expanded && activeSource === 'audio' && (
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {/* Device selector */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 10,
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            Mic:
            <select
              value={selectedDeviceId ?? ''}
              onChange={handleDeviceSelect}
              style={{
                flex: 1,
                fontSize: 10,
                padding: '2px 4px',
                borderRadius: 4,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0, 0, 0, 0.3)',
                color: 'var(--color-text)',
                outline: 'none',
              }}
            >
              {audioDevices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          {/* Level meter (larger) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 10,
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            Level:
            <AudioLevelMeter level={inputLevel} width={100} height={6} />
          </div>
        </div>
      )}
    </div>
  );
});
