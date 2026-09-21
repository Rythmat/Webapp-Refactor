/* eslint-disable react/jsx-sort-props */
/* eslint-disable tailwindcss/classnames-order */
import { Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { MAX_OUTPUT_LATENCY_MS } from '../latencyCalibration';
import { useSettingsStore } from '../useSettingsStore';
import { LatencyCalibration } from './LatencyCalibration';

const HEADING: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: 'var(--color-text)',
};

const PANEL: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--color-border)',
  borderRadius: '0.75rem',
  padding: '1.5rem',
};

const LABEL: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-text-dim)',
};

const VALUE: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-text)',
  minWidth: '3.5rem',
  textAlign: 'right',
};

const HINT: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-text-dim)',
};

const DROPDOWN: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  color: 'var(--color-text)',
  height: '2.25rem',
};

export const AudioSettings = () => {
  const outputDevice = useSettingsStore((s) => s.outputDevice);
  const outputChannel = useSettingsStore((s) => s.outputChannel);
  const outputLatencyMs = useSettingsStore((s) => s.outputLatencyMs);
  const volume = useSettingsStore((s) => s.volume);
  const setOutputLatencyMs = useSettingsStore((s) => s.setOutputLatencyMs);
  const setVolume = useSettingsStore((s) => s.setVolume);

  return (
    <>
      <h2 style={HEADING}>Audio</h2>
      <div className="glass-panel-sm space-y-5" style={PANEL}>
        {/* Output device */}
        <div className="flex items-center justify-between gap-4">
          <span style={LABEL}>Output</span>
          <div className="flex-1 max-w-sm">
            <div
              className="flex w-full items-center justify-between"
              style={DROPDOWN}
            >
              {outputDevice}
              <span
                style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem' }}
              >
                &#9662;
              </span>
            </div>
          </div>
        </div>

        {/* Output channel */}
        <div className="flex items-center justify-between gap-4">
          <span style={LABEL}>Output Channel</span>
          <div className="flex-1 max-w-sm">
            <div
              className="flex w-full items-center justify-between"
              style={DROPDOWN}
            >
              {outputChannel}
              <span
                style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem' }}
              >
                &#9662;
              </span>
            </div>
          </div>
        </div>

        {/* Output latency */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <span style={LABEL}>Output Latency</span>
            <div className="flex flex-1 max-w-sm items-center gap-3">
              <div className="flex-1">
                <Slider
                  value={[outputLatencyMs]}
                  onValueChange={([v]) => setOutputLatencyMs(v)}
                  min={0}
                  max={MAX_OUTPUT_LATENCY_MS}
                  step={5}
                  trackClassName="bg-white/10"
                  rangeClassName="bg-[#7ecfcf]"
                />
              </div>
              <span style={VALUE}>{outputLatencyMs} ms</span>
            </div>
          </div>
          <p style={HINT}>
            Extra delay from Bluetooth headphones or speakers. Lesson playheads
            and scoring shift by this much so they match what you hear. Built-in
            speakers and wired headphones usually need 0.
          </p>
          <LatencyCalibration />
        </div>

        {/* Main Volume */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span style={LABEL}>Main Volume</span>
            <Volume2
              className="size-4"
              style={{ color: 'var(--color-text-dim)' }}
            />
          </div>
          <div className="flex-1 max-w-sm">
            <Slider
              value={[volume]}
              onValueChange={([v]) => setVolume(v)}
              min={0}
              max={100}
              step={1}
              trackClassName="bg-white/10"
              rangeClassName="bg-[#7ecfcf]"
            />
          </div>
        </div>
      </div>
    </>
  );
};
