import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore, type MidiStatus } from '@/daw/store';
import {
  getAudioOutputs,
  hasMicrophonePermission,
  listAudioInputs,
  probeDeviceChannelCount,
  type AudioInputDevice,
  type AudioOutputDevice,
} from '@/daw/midi/AudioInputEnumerator';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { Chip } from '@/daw/ui/Chip';
import { DawDialog } from '@/daw/ui/DawDialog';
import { Select } from '@/daw/ui/Select';
import { SettingRow } from '@/daw/ui/SettingRow';
import { TYPE_CLASS } from '@/daw/ui/styles';

// ── Audio & MIDI settings (plan 2.3) ───────────────────────────────────────
// The editor's one settings dialog: the input and output devices, the input's
// channel count, what the audio context runs at, and where MIDI stands.
//
// Opening it asks for nothing. Until the page may use the microphone the
// browser hides device names (Chrome lists one unnamed default input), so the
// list shows what it can and says that choosing an input asks for access. The
// microphone is requested only when the student picks one (shell-21).
//
// Every row, the read-only facts too, says what it is in one line under its
// name (SettingRow, milestone 2.11).

/** Each row's one line, for students (2.11). */
export const AUDIO_MIDI_COPY = {
  inputDevice: 'The mic or interface the Studio records from',
  inputChannels: 'How many inputs your device has. Auto usually works',
  outputDevice: 'Where you hear the Studio: speakers or headphones',
  sampleRate: 'Sound snapshots per second, set by your device',
  latency: 'The delay between playing a note and hearing it',
  inputChannelsInUse: 'How many channels the input is sending now',
  midi: 'Plug in a MIDI keyboard to play instruments with it',
} as const;

const CHANNEL_COUNTS = [2, 4, 8, 16, 32];
/** Device names can be long: the pickers stop here and cut them off. */
const PICKER = 'max-w-52';
const AUTO = 'auto';
/** Chrome's unnamed default input, before the page may use the microphone. */
const DEFAULT_INPUT = 'default';

/** What a MIDI status says, in the student's words (engine-hooks-27). */
export function midiStatusText(
  status: MidiStatus,
  inputNames: readonly string[],
): string {
  switch (status) {
    case 'ready':
      return inputNames.length === 1
        ? `MIDI: ${inputNames[0]}`
        : `MIDI: ${inputNames.length} keyboards (${inputNames.join(', ')})`;
    case 'no-device':
      return 'No MIDI keyboard connected';
    case 'unsupported':
      return 'MIDI keyboards need Chrome or Edge';
    case 'denied':
      return 'MIDI is blocked for this site in the browser’s settings';
    case 'idle':
      return 'Looking for MIDI keyboards…';
  }
}

/** The input picker's options: names once allowed, plain ones until then. */
export function inputOptions(
  inputs: readonly AudioInputDevice[],
): { value: string; label: string }[] {
  const named = inputs.filter((d) => d.id !== '');
  if (named.length === 0) {
    return [{ value: DEFAULT_INPUT, label: 'Default microphone' }];
  }
  return named.map((d, i) => ({
    value: d.id,
    label:
      d.label ||
      (d.id === DEFAULT_INPUT ? 'Default microphone' : `Microphone ${i + 1}`),
  }));
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className={TYPE_CLASS.micro} style={{ color: 'var(--daw-text-3)' }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className={TYPE_CLASS.label} style={{ color: 'var(--daw-text-3)' }}>
      {children}
    </p>
  );
}

/** A read-only fact: its name and line, the value at the right. */
function Fact({
  label,
  description,
  value,
}: {
  label: string;
  description: string;
  value: string;
}) {
  return (
    <SettingRow label={label} description={description}>
      <span className={`${TYPE_CLASS.body} tabular-nums text-daw-text`}>
        {value}
      </span>
    </SettingRow>
  );
}

// ── SettingsModal ──────────────────────────────────────────────────────

export function SettingsModal() {
  const open = useStore((s) => s.settingsOpen);
  const setOpen = useStore((s) => s.setSettingsOpen);

  return (
    <DawDialog
      open={open}
      onOpenChange={setOpen}
      size="md"
      title="Audio & MIDI"
      description="Where the Studio listens and plays, and your MIDI keyboard."
      data={{ 'data-testid': 'audio-midi-settings' }}
    >
      {open && <SettingsBody />}
    </DawDialog>
  );
}

function SettingsBody() {
  const [inputs, setInputs] = useState<AudioInputDevice[]>([]);
  const [outputs, setOutputs] = useState<AudioOutputDevice[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [probing, setProbing] = useState(false);
  const [refused, setRefused] = useState(false);

  const inputDeviceId = useStore((s) => s.inputDeviceId);
  const outputDeviceId = useStore((s) => s.outputDeviceId);
  const inputDetectedChannelCount = useStore(
    (s) => s.inputDetectedChannelCount,
  );
  const inputChannelCountOverride = useStore(
    (s) => s.inputChannelCountOverride,
  );
  const inputDeviceChannelCount = useStore((s) => s.inputDeviceChannelCount);
  const setInputDevice = useStore((s) => s.setInputDevice);
  const setOutputDevice = useStore((s) => s.setOutputDevice);
  const setInputChannelCountOverride = useStore(
    (s) => s.setInputChannelCountOverride,
  );
  const midiStatus = useStore((s) => s.midiStatus);
  const midiInputs = useStore((s) => s.inputs);

  const supportsOutput = audioEngine.supportsOutputSelection();
  const sampleRate = audioEngine.getSampleRate();
  const latencyMs = audioEngine.getBaseLatency() * 1000;

  // List the devices, asking for nothing, and again when one is plugged in.
  const enumerate = useCallback(async () => {
    const [ins, outs, permission] = await Promise.all([
      listAudioInputs(),
      getAudioOutputs(),
      hasMicrophonePermission(),
    ]);
    setInputs(ins);
    setOutputs(outs);
    setAllowed(permission ?? ins.some((d) => d.label !== ''));
  }, []);

  useEffect(() => {
    void enumerate();
    const devices = navigator.mediaDevices;
    if (!devices?.addEventListener) return;
    const onChange = () => void enumerate();
    devices.addEventListener('devicechange', onChange);
    return () => devices.removeEventListener('devicechange', onChange);
  }, [enumerate]);

  // Picking an input is when the browser asks for the microphone: the probe
  // opens it to count its channels. Then the names show.
  const handleSelectInput = useCallback(
    async (id: string) => {
      setProbing(true);
      setRefused(false);
      try {
        const detected = await probeDeviceChannelCount(id);
        setInputDevice(id, detected);
      } catch (err) {
        const blocked =
          err instanceof DOMException &&
          (err.name === 'NotAllowedError' || err.name === 'SecurityError');
        if (blocked) setRefused(true);
        else setInputDevice(id, 2);
      }
      setProbing(false);
      await enumerate();
    },
    [setInputDevice, enumerate],
  );

  const handleSelectOutput = useCallback(
    (id: string) => {
      // Output devices don't report a channel count; stereo it is.
      setOutputDevice(id, 2);
      audioEngine.setOutputDevice(id).catch((err) => {
        console.warn('[SettingsModal] Failed to set output device:', err);
      });
    },
    [setOutputDevice],
  );

  const inputChoices = useMemo(() => inputOptions(inputs), [inputs]);
  const outputChoices = useMemo(
    () =>
      outputs
        .filter((d) => d.id !== '')
        .map((d, i) => ({ value: d.id, label: d.label || `Output ${i + 1}` })),
    [outputs],
  );
  const autoLabel = `Auto (${inputDetectedChannelCount || '—'})`;

  return (
    <div className="flex flex-col gap-5 pb-3">
      <Section title="Input">
        <SettingRow
          label="Input device"
          description={AUDIO_MIDI_COPY.inputDevice}
        >
          <Select
            label="Input device"
            options={inputChoices}
            value={
              inputDeviceId &&
              inputChoices.some((o) => o.value === inputDeviceId)
                ? inputDeviceId
                : undefined
            }
            placeholder="Choose an input"
            onValueChange={(id) => void handleSelectInput(id)}
            disabled={probing}
            id="settings-input-device"
            className={PICKER}
          />
        </SettingRow>
        {refused ? (
          <Note>
            The browser didn’t allow the microphone. Allow it from the icon in
            the address bar, then choose the input again.
          </Note>
        ) : allowed === false ? (
          <Note>
            Choosing an input asks the browser for microphone access, so the
            Studio can hear it.
          </Note>
        ) : null}
        {inputDeviceId && (
          <SettingRow
            label="Input channels"
            description={AUDIO_MIDI_COPY.inputChannels}
          >
            <Select
              label="Input channels"
              options={[
                { value: AUTO, label: autoLabel },
                ...CHANNEL_COUNTS.map((n) => ({
                  value: String(n),
                  label: `${n} channels`,
                })),
              ]}
              value={
                inputChannelCountOverride === null
                  ? AUTO
                  : String(inputChannelCountOverride)
              }
              onValueChange={(next) =>
                setInputChannelCountOverride(
                  next === AUTO ? null : Number(next),
                )
              }
              disabled={probing}
              className={PICKER}
            />
          </SettingRow>
        )}
        {probing && <Note>Checking the input’s channels…</Note>}
      </Section>

      <Section title="Output">
        {supportsOutput && outputChoices.length > 0 ? (
          <SettingRow
            label="Output device"
            description={AUDIO_MIDI_COPY.outputDevice}
          >
            <Select
              label="Output device"
              options={outputChoices}
              value={outputDeviceId ?? undefined}
              placeholder="System default"
              onValueChange={handleSelectOutput}
              className={PICKER}
            />
          </SettingRow>
        ) : (
          <SettingRow
            layout="stacked"
            label="Output device"
            description={AUDIO_MIDI_COPY.outputDevice}
          >
            <Note>
              {supportsOutput
                ? 'Playing through the system’s default output. Other outputs are listed once the microphone is allowed.'
                : 'Choosing an output needs Chrome or Edge.'}
            </Note>
          </SettingRow>
        )}
      </Section>

      <Section title="Audio">
        <Fact
          label="Sample rate"
          description={AUDIO_MIDI_COPY.sampleRate}
          value={sampleRate > 0 ? `${sampleRate} Hz` : '—'}
        />
        <Fact
          label="Latency"
          description={AUDIO_MIDI_COPY.latency}
          value={latencyMs > 0 ? `${latencyMs.toFixed(1)} ms` : '—'}
        />
        <Fact
          label="Input channels in use"
          description={AUDIO_MIDI_COPY.inputChannelsInUse}
          value={
            inputDeviceChannelCount > 0 ? `${inputDeviceChannelCount}` : '—'
          }
        />
      </Section>

      <Section title="MIDI">
        <SettingRow
          layout="stacked"
          label="MIDI devices"
          description={AUDIO_MIDI_COPY.midi}
        >
          <Chip size="md" data-testid="midi-status" data-status={midiStatus}>
            {midiStatusText(
              midiStatus,
              midiInputs.map((d) => d.name),
            )}
          </Chip>
        </SettingRow>
      </Section>
    </div>
  );
}
