import { useState, useEffect, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { useStore } from '@/daw/store';
import {
  getAudioInputs,
  getAudioOutputs,
  probeDeviceChannelCount,
  type AudioInputDevice,
  type AudioOutputDevice,
} from '@/daw/midi/AudioInputEnumerator';
import { audioEngine } from '@/daw/audio/AudioEngine';

type SettingsView = 'main' | 'inputConfig' | 'outputConfig';

const CHANNEL_COUNT_OPTIONS = [
  { label: 'Auto', value: null as number | null },
  { label: '2', value: 2 },
  { label: '4', value: 4 },
  { label: '8', value: 8 },
  { label: '16', value: 16 },
  { label: '32', value: 32 },
];

// ── SettingsModal ──────────────────────────────────────────────────────

export function SettingsModal() {
  const open = useStore((s) => s.settingsOpen);
  const setOpen = useStore((s) => s.setSettingsOpen);

  const [view, setView] = useState<SettingsView>('main');

  // Reset view when modal closes
  useEffect(() => {
    if (!open) setView('main');
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full p-6 rounded-2xl z-50 outline-none"
          style={{
            maxWidth: view === 'main' ? 448 : 560,
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          }}
        >
          {view === 'main' && <MainView onNavigate={setView} />}
          {view === 'inputConfig' && <ChannelConfigView kind="input" onBack={() => setView('main')} />}
          {view === 'outputConfig' && <ChannelConfigView kind="output" onBack={() => setView('main')} />}

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

// ── Main View ─────────────────────────────────────────────────────────

function MainView({ onNavigate }: { onNavigate: (view: SettingsView) => void }) {
  const [inputs, setInputs] = useState<AudioInputDevice[]>([]);
  const [outputs, setOutputs] = useState<AudioOutputDevice[]>([]);
  const [showInputMenu, setShowInputMenu] = useState(false);
  const [showOutputMenu, setShowOutputMenu] = useState(false);
  const [showChannelCountMenu, setShowChannelCountMenu] = useState(false);
  const [probing, setProbing] = useState(false);

  const inputDeviceId = useStore((s) => s.inputDeviceId);
  const outputDeviceId = useStore((s) => s.outputDeviceId);
  const inputDetectedChannelCount = useStore((s) => s.inputDetectedChannelCount);
  const inputChannelCountOverride = useStore((s) => s.inputChannelCountOverride);
  const inputDeviceChannelCount = useStore((s) => s.inputDeviceChannelCount);
  const setInputDevice = useStore((s) => s.setInputDevice);
  const setOutputDevice = useStore((s) => s.setOutputDevice);
  const setInputChannelCountOverride = useStore((s) => s.setInputChannelCountOverride);

  const supportsOutput = audioEngine.supportsOutputSelection();
  const sampleRate = audioEngine.getSampleRate();
  const latencyMs = audioEngine.getBaseLatency() * 1000;

  // Enumerate devices — auto-select first input device if none configured
  useEffect(() => {
    const enumerate = () => {
      getAudioInputs().then(async (list) => {
        setInputs(list);
        if (!useStore.getState().inputDeviceId && list.length > 0) {
          setProbing(true);
          try {
            const detected = await probeDeviceChannelCount(list[0].id);
            setInputDevice(list[0].id, detected);
          } catch {
            setInputDevice(list[0].id, 2);
          }
          setProbing(false);
        }
      });
      getAudioOutputs().then(setOutputs);
    };
    enumerate();
    navigator.mediaDevices.addEventListener('devicechange', enumerate);
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerate);
  }, [setInputDevice]);

  const handleSelectInput = useCallback(async (id: string) => {
    setShowInputMenu(false);
    setProbing(true);
    try {
      const detected = await probeDeviceChannelCount(id);
      setInputDevice(id, detected);
    } catch {
      setInputDevice(id, 2);
    }
    setProbing(false);
  }, [setInputDevice]);

  const handleSelectOutput = useCallback((id: string) => {
    setShowOutputMenu(false);
    // Discover channel count — output devices don't provide channelCount easily, default to 2
    setOutputDevice(id, 2);
    audioEngine.setOutputDevice(id).catch((err) => {
      console.warn('[SettingsModal] Failed to set output device:', err);
    });
  }, [setOutputDevice]);

  const handleSelectChannelCount = useCallback((value: number | null) => {
    setShowChannelCountMenu(false);
    setInputChannelCountOverride(value);
  }, [setInputChannelCountOverride]);

  // Current channel count label
  const channelCountLabel = inputChannelCountOverride !== null
    ? `${inputChannelCountOverride} ch`
    : `Auto (${inputDetectedChannelCount || '—'})`;

  return (
    <>
      <Dialog.Title className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text)' }}>
        Settings
      </Dialog.Title>
      <Dialog.Description className="sr-only">
        Configure audio input and output devices.
      </Dialog.Description>

      <div className="flex flex-col gap-5">
        {/* Audio Input Device */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>
            Audio Input Device
          </span>
          <DeviceDropdown
            devices={inputs}
            selectedId={inputDeviceId ?? ''}
            onSelect={handleSelectInput}
            open={showInputMenu}
            onToggle={() => setShowInputMenu((v) => !v)}
            placeholder="No Input Device"
          />
        </div>

        {/* Input Channel Count */}
        {inputDeviceId && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>
              Input Channels
            </span>
            {probing ? (
              <div
                className="rounded-lg px-3 py-2 text-xs"
                style={{
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-dim)',
                }}
              >
                Detecting channels…
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => setShowChannelCountMenu((v) => !v)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <span className="text-xs" style={{ color: 'var(--color-text)' }}>
                    {channelCountLabel}
                  </span>
                  <ChevronDown size={14} className="shrink-0 ml-2" style={{ color: 'var(--color-text-dim)' }} />
                </div>
                {showChannelCountMenu && (
                  <div
                    className="absolute left-0 right-0 rounded-lg overflow-hidden z-50"
                    style={{
                      top: '100%',
                      marginTop: 2,
                      backgroundColor: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      maxHeight: 200,
                      overflowY: 'auto',
                    }}
                  >
                    {CHANNEL_COUNT_OPTIONS.map((opt) => {
                      const isSelected = opt.value === inputChannelCountOverride;
                      const label = opt.value === null
                        ? `Auto (${inputDetectedChannelCount || '—'})`
                        : `${opt.value} channels`;
                      return (
                        <div
                          key={opt.label}
                          onClick={() => handleSelectChannelCount(opt.value)}
                          className="px-3 py-1.5 text-xs cursor-pointer hover:bg-white/10"
                          style={{
                            color: isSelected ? 'var(--color-accent)' : 'var(--color-text)',
                          }}
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Audio Output Device */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>
            Audio Output Device
          </span>
          {supportsOutput ? (
            <DeviceDropdown
              devices={outputs}
              selectedId={outputDeviceId ?? ''}
              onSelect={handleSelectOutput}
              open={showOutputMenu}
              onToggle={() => setShowOutputMenu((v) => !v)}
              placeholder="No Output Device"
            />
          ) : (
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-dim)',
              }}
            >
              Output device selection requires Chrome or Edge
            </div>
          )}
        </div>

        {/* Channel Configuration */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>
            Channel Configuration
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => onNavigate('inputConfig')}
              disabled={!inputDeviceId}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-white/10"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: inputDeviceId ? 'var(--color-text)' : 'var(--color-text-dim)',
                cursor: inputDeviceId ? 'pointer' : 'default',
                opacity: inputDeviceId ? 1 : 0.5,
              }}
            >
              Input Config
            </button>
            <button
              onClick={() => onNavigate('outputConfig')}
              disabled={!outputDeviceId}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-white/10"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: outputDeviceId ? 'var(--color-text)' : 'var(--color-text-dim)',
                cursor: outputDeviceId ? 'pointer' : 'default',
                opacity: outputDeviceId ? 1 : 0.5,
              }}
            >
              Output Config
            </button>
          </div>
        </div>

        {/* Info row */}
        <div className="flex gap-6">
          <InfoPill label="Sample Rate" value={sampleRate > 0 ? `${sampleRate} Hz` : '—'} />
          <InfoPill label="Latency" value={latencyMs > 0 ? `${latencyMs.toFixed(1)} ms` : '—'} />
          <InfoPill label="Channels" value={inputDeviceChannelCount > 0 ? `${inputDeviceChannelCount}` : '—'} />
        </div>
      </div>
    </>
  );
}

// ── Channel Config View ───────────────────────────────────────────────

function ChannelConfigView({
  kind,
  onBack,
}: {
  kind: 'input' | 'output';
  onBack: () => void;
}) {
  const channelCount = useStore((s) =>
    kind === 'input' ? s.inputDeviceChannelCount : s.outputDeviceChannelCount,
  );
  const enabledMono = useStore((s) =>
    kind === 'input' ? s.enabledMonoInputs : s.enabledMonoOutputs,
  );
  const enabledStereo = useStore((s) =>
    kind === 'input' ? s.enabledStereoInputs : s.enabledStereoOutputs,
  );
  const toggleMono = useStore((s) =>
    kind === 'input' ? s.toggleMonoInput : s.toggleMonoOutput,
  );
  const toggleStereo = useStore((s) =>
    kind === 'input' ? s.toggleStereoInput : s.toggleStereoOutput,
  );

  const pairCount = Math.ceil(channelCount / 2);
  const label = kind === 'input' ? 'Input' : 'Output';

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/10"
          style={{ color: 'var(--color-text-dim)' }}
        >
          <ArrowLeft size={16} />
        </button>
        <Dialog.Title className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          {label} Configuration
        </Dialog.Title>
      </div>
      <Dialog.Description className="sr-only">
        Choose which audio hardware {kind}s to make available to tracks.
      </Dialog.Description>

      <p className="text-xs mb-5 leading-relaxed" style={{ color: 'var(--color-text-dim)' }}>
        Choose which audio hardware {kind}s to make available to tracks.
        Every {kind} pair can be used as one stereo {kind === 'input' ? 'in' : 'out'} and/or two mono {kind === 'input' ? 'ins' : 'outs'}.
      </p>

      {channelCount === 0 ? (
        <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
          No {kind} device selected.
        </p>
      ) : (
        <div className="flex gap-8" style={{ maxHeight: 320, overflowY: 'auto' }}>
          {/* Mono column */}
          <div className="flex-1">
            <span
              className="text-[11px] font-semibold mb-3 block"
              style={{ color: 'var(--color-text)' }}
            >
              Mono {label}s
            </span>
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: pairCount }, (_, pi) => {
                const ch1 = pi * 2;
                const ch2 = pi * 2 + 1;
                const hasCh2 = ch2 < channelCount;
                return (
                  <div key={pi} className="flex items-center gap-1.5">
                    <span
                      className="text-[10px] w-10 shrink-0 text-right"
                      style={{ color: 'var(--color-text-dim)' }}
                    >
                      {ch1 + 1}{hasCh2 ? ` & ${ch2 + 1}` : ''}
                    </span>
                    <ChannelToggle
                      active={enabledMono.includes(ch1)}
                      onClick={() => toggleMono(ch1)}
                    />
                    {hasCh2 && (
                      <ChannelToggle
                        active={enabledMono.includes(ch2)}
                        onClick={() => toggleMono(ch2)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stereo column */}
          <div className="flex-1">
            <span
              className="text-[11px] font-semibold mb-3 block"
              style={{ color: 'var(--color-text)' }}
            >
              Stereo {label}s
            </span>
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: Math.floor(channelCount / 2) }, (_, pi) => {
                const left = pi * 2;
                return (
                  <div key={pi} className="flex items-center gap-1.5">
                    <ChannelToggle
                      active={enabledStereo.includes(left)}
                      onClick={() => toggleStereo(left)}
                      label={`${left + 1}/${left + 2}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Channel Toggle Button ─────────────────────────────────────────────

function ChannelToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer"
      style={{
        backgroundColor: active ? '#f59e0b' : 'var(--color-surface-2)',
        color: active ? '#1a1a1a' : 'var(--color-text-dim)',
        border: `1px solid ${active ? '#f59e0b' : 'var(--color-border)'}`,
        minWidth: label ? 48 : 32,
      }}
    >
      {label ?? ''}
    </button>
  );
}

// ── Device Dropdown ────────────────────────────────────────────────────

function DeviceDropdown({
  devices,
  selectedId,
  onSelect,
  open,
  onToggle,
  placeholder,
}: {
  devices: { id: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  open: boolean;
  onToggle: () => void;
  placeholder: string;
}) {
  const selectedLabel = devices.find((d) => d.id === selectedId)?.label ?? placeholder;

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={onToggle}
        className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
        }}
      >
        <span
          className="text-xs truncate"
          style={{ color: devices.length ? 'var(--color-text)' : 'var(--color-text-dim)' }}
        >
          {selectedLabel}
        </span>
        <ChevronDown size={14} className="shrink-0 ml-2" style={{ color: 'var(--color-text-dim)' }} />
      </div>
      {open && devices.length > 0 && (
        <div
          className="absolute left-0 right-0 rounded-lg overflow-hidden z-50"
          style={{
            top: '100%',
            marginTop: 2,
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {devices.map((d) => (
            <div
              key={d.id}
              onClick={() => onSelect(d.id)}
              className="px-3 py-1.5 text-xs cursor-pointer hover:bg-white/10 truncate"
              style={{
                color: d.id === selectedId ? 'var(--color-accent)' : 'var(--color-text)',
              }}
            >
              {d.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Info Pill ──────────────────────────────────────────────────────────

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>
        {label}
      </span>
      <span
        className="text-xs px-3 py-1.5 rounded-lg"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
}
