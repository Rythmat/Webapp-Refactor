import { ChevronDown } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/components/utilities';
import { MidiMappingModal } from '../MidiMappingModal';
import {
  ACCOUNT_PILL,
  AccountSlider,
  SettingsGroup,
  SettingsRow,
} from '../ui/accountKit';
import { useSettingsStore } from '../useSettingsStore';

/** A choice as a pill with its chevron, as the Account area's selects. */
const SELECT_PILL = cn(
  ACCOUNT_PILL,
  'max-w-[14rem] appearance-none truncate pr-[2rem] text-left',
);

/**
 * MIDI, in the Account area's look (owner, 2026-11-10): one card of rows
 * (the instrument, its key mapping, how hard a hit has to be), grey pills
 * and a white slider; no teal.
 */
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
      <SettingsGroup>
        <SettingsRow
          plain
          title="Instrument"
          description={
            midiInputs.length > 0
              ? 'The MIDI device Music Atlas listens to.'
              : 'No device connected'
          }
          action={
            midiInputs.length > 0 ? (
              <span className="relative">
                <select
                  aria-label="MIDI input"
                  value={midiDeviceId}
                  onChange={handleDeviceChange}
                  className={SELECT_PILL}
                >
                  {midiInputs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden
                  className="pointer-events-none absolute right-[0.682rem] top-1/2 size-[0.909rem] -translate-y-1/2 text-white/70"
                />
              </span>
            ) : undefined
          }
        />
        <SettingsRow
          plain
          title="Key mapping"
          description={
            mapping ? `Mapped: ${mapping.keyCount} keys` : 'Not mapped yet'
          }
          action={
            <span className="flex shrink-0 items-center gap-[0.455rem]">
              <button
                type="button"
                className={ACCOUNT_PILL}
                onClick={() => setMapping(null)}
              >
                Revert all
              </button>
              <button
                type="button"
                className={ACCOUNT_PILL}
                onClick={() => setMappingOpen(true)}
              >
                Map instrument
              </button>
            </span>
          }
        />
        <SettingsRow
          plain
          title="Hit sensitivity"
          action={
            <span className="min-w-14 text-right text-[0.795rem] text-white/70">
              {sensitivity}
            </span>
          }
        >
          <AccountSlider
            aria-label="Hit sensitivity"
            value={[sensitivity]}
            onValueChange={([v]) => setSensitivity(v)}
            min={0}
            max={127}
            step={1}
          />
        </SettingsRow>
      </SettingsGroup>

      <MidiMappingModal
        open={mappingOpen}
        onOpenChange={setMappingOpen}
        deviceName={deviceDisplayName}
        onSave={setMapping}
      />
    </>
  );
};
