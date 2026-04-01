function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider w-10">
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-16 h-1 accent-zinc-400 cursor-pointer"
      />
    </div>
  );
}

interface GameToolbarProps {
  bpm: number;
  metronomeEnabled: boolean;
  midiStatus: string;
  showVolumePanel: boolean;
  melodyVolume: number;
  drumVolume: number;
  metronomeVolume: number;
  onChangeBPM: (delta: number) => void;
  onToggleMetronome: () => void;
  onToggleVolumePanel: () => void;
  onChangeVolume: (
    category: 'melody' | 'drums' | 'metronome',
    value: number,
  ) => void;
}

export function GameToolbar({
  bpm,
  metronomeEnabled,
  midiStatus,
  showVolumePanel,
  melodyVolume,
  drumVolume,
  metronomeVolume,
  onChangeBPM,
  onToggleMetronome,
  onToggleVolumePanel,
  onChangeVolume,
}: GameToolbarProps) {
  return (
    <div className="h-12 bg-[#121214] border-b border-zinc-800 flex items-center px-6 gap-4 shrink-0">
      <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded border border-zinc-800">
        <button
          onClick={() => onChangeBPM(-5)}
          className="text-zinc-400 hover:text-white px-2"
        >
          -
        </button>
        <span className="text-xs text-zinc-500 font-mono">BPM</span>
        <span className="text-sm text-zinc-200 font-mono w-8 text-center">
          {bpm}
        </span>
        <button
          onClick={() => onChangeBPM(5)}
          className="text-zinc-400 hover:text-white px-2"
        >
          +
        </button>
      </div>
      <button
        onClick={onToggleMetronome}
        className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-colors border ${
          metronomeEnabled
            ? 'bg-emerald-900/30 border-emerald-800 text-emerald-400'
            : 'bg-zinc-900 border-zinc-800 text-zinc-500'
        }`}
      >
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            metronomeEnabled ? 'bg-emerald-400' : 'bg-zinc-600'
          }`}
        />
        Metronome
      </button>

      <button
        onClick={onToggleVolumePanel}
        className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors border bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white"
      >
        Volume
      </button>
      {showVolumePanel && (
        <div className="flex items-center gap-4 pl-2 border-l border-zinc-800">
          <VolumeSlider
            label="Keys"
            value={melodyVolume}
            onChange={(v) => onChangeVolume('melody', v)}
          />
          <VolumeSlider
            label="Drums"
            value={drumVolume}
            onChange={(v) => onChangeVolume('drums', v)}
          />
          <VolumeSlider
            label="Click"
            value={metronomeVolume}
            onChange={(v) => onChangeVolume('metronome', v)}
          />
        </div>
      )}

      <div className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            midiStatus.includes('Active') ? 'bg-green-500' : 'bg-zinc-600'
          }`}
        />
        {midiStatus}
      </div>
    </div>
  );
}
