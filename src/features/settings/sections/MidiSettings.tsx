/* eslint-disable react/jsx-sort-props */
/* eslint-disable tailwindcss/classnames-order */
import { useState, useEffect, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { MidiMappingModal } from '../MidiMappingModal';
import { useSettingsStore } from '../useSettingsStore';

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

const DROPDOWN: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  color: 'var(--color-text)',
  height: '2.25rem',
};

const BTN_ACCENT: React.CSSProperties = {
  background: 'var(--color-accent)',
  color: '#111',
  border: 'none',
  borderRadius: '9999px',
  padding: '0.375rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
};

const BTN_DESTRUCTIVE: React.CSSProperties = {
  background: '#ef4444',
  color: '#fff',
  border: 'none',
  borderRadius: '9999px',
  padding: '0.375rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
};

export const MidiSettings = () => {
  const sensitivity = useSettingsStore((s) => s.hitSensitivity);
  const setSensitivity = useSettingsStore((s) => s.setHitSensitivity);
  const mapping = useSettingsStore((s) => s.midiMapping);
  const setMapping = useSettingsStore((s) => s.setMidiMapping);
  const midiDeviceId = useSettingsStore((s) => s.midiDeviceId);
  const setMidiDeviceId = useSettingsStore((s) => s.setMidiDeviceId);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [midiInputs, setMidiInputs] = useState<MIDIInput[]>([]);

  // Detect MIDI devices via Web MIDI API
  useEffect(() => {
    if (!navigator.requestMIDIAccess) return;

    let midiAccess: MIDIAccess | null = null;

    const syncInputs = (ma: MIDIAccess) => {
      const inputs = Array.from(ma.inputs.values());
      setMidiInputs(inputs);
      // Auto-select first device if none selected
      if (inputs.length > 0 && !midiDeviceId) {
        setMidiDeviceId(inputs[0].id);
      }
      // Clear selection if selected device is gone
      if (midiDeviceId && !inputs.find((d) => d.id === midiDeviceId)) {
        setMidiDeviceId(inputs.length > 0 ? inputs[0].id : '');
      }
    };

    navigator.requestMIDIAccess().then((ma) => {
      midiAccess = ma;
      syncInputs(ma);
      ma.onstatechange = () => syncInputs(ma);
    });

    return () => {
      if (midiAccess) midiAccess.onstatechange = null;
    };
  }, [midiDeviceId, setMidiDeviceId]);

  const selectedDevice = midiInputs.find((d) => d.id === midiDeviceId);
  const deviceDisplayName = selectedDevice?.name ?? 'No device connected';

  const handleDeviceChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setMidiDeviceId(e.target.value);
    },
    [setMidiDeviceId],
  );

  return (
    <>
      <h2 style={HEADING}>Connected Instruments</h2>
      <div className="glass-panel-sm space-y-5" style={PANEL}>
        {/* Input device */}
        <div className="flex items-center justify-between gap-4">
          <span style={LABEL}>Input</span>
          <div className="flex-1 max-w-sm">
            {midiInputs.length > 0 ? (
              <select
                value={midiDeviceId}
                onChange={handleDeviceChange}
                style={DROPDOWN}
                className="w-full"
              >
                {midiInputs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            ) : (
              <div
                className="flex w-full items-center justify-between"
                style={DROPDOWN}
              >
                No device connected
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            style={BTN_ACCENT}
            onClick={() => setMappingOpen(true)}
          >
            Map MIDI Instrument
          </button>
          <button
            type="button"
            style={BTN_DESTRUCTIVE}
            onClick={() => setMapping(null)}
          >
            Revert All Mappings
          </button>
          {mapping && (
            <span
              style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}
            >
              Mapped: {mapping.keyCount} keys
            </span>
          )}
        </div>

        {/* Hit sensitivity */}
        <div className="flex items-center justify-between gap-4">
          <span style={LABEL}>Hit Sensitivity</span>
          <div className="flex-1 max-w-sm">
            <Slider
              value={[sensitivity]}
              onValueChange={([v]) => setSensitivity(v)}
              min={0}
              max={127}
              step={1}
              trackClassName="bg-white/10"
              rangeClassName="bg-[#7ecfcf]"
            />
          </div>
        </div>
      </div>

      <MidiMappingModal
        open={mappingOpen}
        onOpenChange={setMappingOpen}
        deviceName={deviceDisplayName}
        onSave={setMapping}
      />
    </>
  );
};
