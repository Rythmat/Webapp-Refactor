import React, { useCallback, useRef, useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Power, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import SynthKnob from './SynthKnob';
import type {
  SynthPreset, OscConfig, SubOscConfig, NoiseConfig, FilterConfig,
  EnvelopeConfig, LfoConfig, UnisonConfig, ModSlot, OscWaveform, NoiseType,
  LfoShape, ModSource, ModTarget, FilterSlope,
} from '@/studio-daw/audio/synth-engine';
import { DEFAULT_SYNTH_PRESET } from '@/studio-daw/audio/synth-engine';
import { FACTORY_PRESETS, PRESET_CATEGORIES } from '@/studio-daw/audio/synth-presets';

interface SynthPanelProps {
  preset: SynthPreset;
  onPresetChange: (preset: SynthPreset) => void;
  onClose: () => void;
}

// Accent color
const TEAL = '#50C8A8';
const ORANGE = '#ff6a14';
const BLUE = '#5B8DEF';
const PURPLE = '#A675E2';

// === Sub-components ===

/** Waveform selector (small button group) */
const WaveSelect: React.FC<{
  value: OscWaveform;
  onChange: (v: OscWaveform) => void;
  color?: string;
}> = ({ value, onChange, color = TEAL }) => {
  const waves: { v: OscWaveform; label: string }[] = [
    { v: 'sine', label: 'SIN' },
    { v: 'triangle', label: 'TRI' },
    { v: 'sawtooth', label: 'SAW' },
    { v: 'square', label: 'SQR' },
  ];
  return (
    <div className="flex gap-[2px]">
      {waves.map(w => (
        <button
          key={w.v}
          onClick={() => onChange(w.v)}
          className={cn(
            "h-[16px] px-1 text-[7px] font-bold rounded-sm transition-colors",
            value === w.v
              ? "text-white"
              : "bg-[#222] text-white/25 hover:text-white/50"
          )}
          style={value === w.v ? { backgroundColor: color + '60', color: '#fff' } : undefined}
        >
          {w.label}
        </button>
      ))}
    </div>
  );
};

/** Enable/disable toggle button */
const EnableBtn: React.FC<{
  enabled: boolean;
  onToggle: () => void;
  color?: string;
}> = ({ enabled, onToggle, color = TEAL }) => (
  <button
    onClick={onToggle}
    className={cn(
      "w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0 transition-colors",
      enabled ? "text-white" : "bg-[#222] text-white/20"
    )}
    style={enabled ? { backgroundColor: color + '80' } : undefined}
  >
    <Power size={8} />
  </button>
);

/** Section header label */
const SectionLabel: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <span
    className="text-[8px] font-bold uppercase tracking-widest leading-none"
    style={{ color: color ?? 'rgba(255,255,255,0.3)' }}
  >
    {children}
  </span>
);

// === Oscillator Section ===
const OscSection: React.FC<{
  label: string;
  config: OscConfig;
  onChange: (updates: Partial<OscConfig>) => void;
  color: string;
}> = ({ label, config, onChange, color }) => (
  <div className="flex flex-col gap-1.5 p-2 bg-[#151515] rounded border border-white/5">
    <div className="flex items-center gap-1.5">
      <EnableBtn enabled={config.enabled} onToggle={() => onChange({ enabled: !config.enabled })} color={color} />
      <SectionLabel color={color}>{label}</SectionLabel>
    </div>
    {config.enabled && (
      <>
        <WaveSelect value={config.waveform} onChange={(v) => onChange({ waveform: v })} color={color} />
        <div className="flex gap-1 flex-wrap justify-center">
          <SynthKnob label="WT Pos" value={config.wtPosition} min={0} max={1} step={0.01}
            defaultValue={0.5} color={color} size={32} onChange={(v) => onChange({ wtPosition: v })} />
          <SynthKnob label="Oct" value={config.octave} min={-2} max={2} step={1}
            defaultValue={0} color={color} size={32}
            formatValue={(v) => v > 0 ? `+${v}` : `${v}`}
            onChange={(v) => onChange({ octave: v })} />
          <SynthKnob label="Semi" value={config.semitone} min={-12} max={12} step={1}
            defaultValue={0} color={color} size={32}
            formatValue={(v) => v > 0 ? `+${v}` : `${v}`}
            onChange={(v) => onChange({ semitone: v })} />
          <SynthKnob label="Fine" value={config.fine} min={-100} max={100} step={1}
            defaultValue={0} color={color} size={32}
            formatValue={(v) => `${v > 0 ? '+' : ''}${v}c`}
            onChange={(v) => onChange({ fine: v })} />
          <SynthKnob label="Level" value={config.level} min={0} max={1} step={0.01}
            defaultValue={0.7} color={color} size={32}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => onChange({ level: v })} />
        </div>
      </>
    )}
  </div>
);

// === Sub Oscillator Section ===
const SubSection: React.FC<{
  config: SubOscConfig;
  onChange: (updates: Partial<SubOscConfig>) => void;
}> = ({ config, onChange }) => (
  <div className="flex flex-col gap-1.5 p-2 bg-[#151515] rounded border border-white/5">
    <div className="flex items-center gap-1.5">
      <EnableBtn enabled={config.enabled} onToggle={() => onChange({ enabled: !config.enabled })} color={ORANGE} />
      <SectionLabel color={ORANGE}>SUB</SectionLabel>
    </div>
    {config.enabled && (
      <>
        <WaveSelect value={config.waveform} onChange={(v) => onChange({ waveform: v })} color={ORANGE} />
        <div className="flex gap-1 justify-center">
          <SynthKnob label="Oct" value={config.octave} min={-2} max={0} step={1}
            defaultValue={-1} color={ORANGE} size={32}
            formatValue={(v) => `${v}`}
            onChange={(v) => onChange({ octave: v })} />
          <SynthKnob label="Level" value={config.level} min={0} max={1} step={0.01}
            defaultValue={0.5} color={ORANGE} size={32}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => onChange({ level: v })} />
        </div>
      </>
    )}
  </div>
);

// === Noise Section ===
const NoiseSection: React.FC<{
  config: NoiseConfig;
  onChange: (updates: Partial<NoiseConfig>) => void;
}> = ({ config, onChange }) => {
  const types: { v: NoiseType; label: string }[] = [
    { v: 'off', label: 'OFF' },
    { v: 'white', label: 'WHT' },
    { v: 'pink', label: 'PNK' },
  ];
  return (
    <div className="flex flex-col gap-1.5 p-2 bg-[#151515] rounded border border-white/5">
      <SectionLabel>NOISE</SectionLabel>
      <div className="flex gap-[2px]">
        {types.map(t => (
          <button
            key={t.v}
            onClick={() => onChange({ type: t.v })}
            className={cn(
              "h-[16px] px-1.5 text-[7px] font-bold rounded-sm transition-colors",
              config.type === t.v
                ? "bg-white/20 text-white"
                : "bg-[#222] text-white/25 hover:text-white/50"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {config.type !== 'off' && (
        <div className="flex justify-center">
          <SynthKnob label="Level" value={config.level} min={0} max={1} step={0.01}
            defaultValue={0.1} size={32}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => onChange({ level: v })} />
        </div>
      )}
    </div>
  );
};

// === Filter Section ===
const FilterSection: React.FC<{
  label: string;
  config: FilterConfig;
  onChange: (updates: Partial<FilterConfig>) => void;
  color: string;
}> = ({ label, config, onChange, color }) => {
  const filterTypes: { v: BiquadFilterType; label: string }[] = [
    { v: 'lowpass', label: 'LP' },
    { v: 'highpass', label: 'HP' },
    { v: 'bandpass', label: 'BP' },
    { v: 'notch', label: 'NT' },
  ];
  return (
    <div className="flex flex-col gap-1.5 p-2 bg-[#151515] rounded border border-white/5">
      <div className="flex items-center gap-1.5">
        <EnableBtn enabled={config.enabled} onToggle={() => onChange({ enabled: !config.enabled })} color={color} />
        <SectionLabel color={color}>{label}</SectionLabel>
        {config.enabled && (
          <button
            onClick={() => onChange({ slope: (config.slope === 12 ? 24 : 12) as FilterSlope })}
            className="ml-auto text-[7px] font-bold px-1 h-[14px] rounded-sm bg-[#222] text-white/30 hover:text-white/50 transition-colors"
          >
            {config.slope}dB
          </button>
        )}
      </div>
      {config.enabled && (
        <>
          <div className="flex gap-[2px]">
            {filterTypes.map(t => (
              <button
                key={t.v}
                onClick={() => onChange({ type: t.v })}
                className={cn(
                  "h-[16px] px-1.5 text-[7px] font-bold rounded-sm transition-colors",
                  config.type === t.v ? "text-white" : "bg-[#222] text-white/25 hover:text-white/50"
                )}
                style={config.type === t.v ? { backgroundColor: color + '60' } : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap justify-center">
            <SynthKnob label="Cutoff" value={config.cutoff} min={20} max={20000} step={10}
              defaultValue={4000} color={color} size={32}
              formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`}
              onChange={(v) => onChange({ cutoff: v })} />
            <SynthKnob label="Res" value={config.resonance} min={0} max={30} step={0.1}
              defaultValue={1} color={color} size={32}
              formatValue={(v) => v.toFixed(1)}
              onChange={(v) => onChange({ resonance: v })} />
            <SynthKnob label="Key" value={config.keyTracking} min={0} max={1} step={0.01}
              defaultValue={0.5} color={color} size={32}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onChange({ keyTracking: v })} />
            <SynthKnob label="Env" value={config.envelopeAmount} min={-1} max={1} step={0.01}
              defaultValue={0.3} color={color} size={32}
              formatValue={(v) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}%`}
              onChange={(v) => onChange({ envelopeAmount: v })} />
          </div>
        </>
      )}
    </div>
  );
};

// === Envelope Section with ADSR Curve ===
const EnvelopeSection: React.FC<{
  label: string;
  config: EnvelopeConfig;
  onChange: (updates: Partial<EnvelopeConfig>) => void;
  color: string;
}> = ({ label, config, onChange, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw ADSR curve
    const totalTime = config.attack + config.decay + 0.5 + config.release;
    const scaleX = (t: number) => (t / totalTime) * w;
    const scaleY = (v: number) => h - v * (h - 4) - 2;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    // Start at 0
    ctx.moveTo(0, scaleY(0));
    // Attack
    ctx.lineTo(scaleX(config.attack), scaleY(1));
    // Decay
    ctx.lineTo(scaleX(config.attack + config.decay), scaleY(config.sustain));
    // Sustain hold
    ctx.lineTo(scaleX(config.attack + config.decay + 0.5), scaleY(config.sustain));
    // Release
    ctx.lineTo(scaleX(totalTime), scaleY(0));
    ctx.stroke();

    // Fill under curve
    ctx.lineTo(scaleX(totalTime), scaleY(0));
    ctx.lineTo(0, scaleY(0));
    ctx.closePath();
    ctx.fillStyle = color + '15';
    ctx.fill();
  }, [config, color]);

  return (
    <div className="flex flex-col gap-1.5 p-2 bg-[#151515] rounded border border-white/5">
      <SectionLabel color={color}>{label}</SectionLabel>
      <canvas
        ref={canvasRef}
        width={120}
        height={40}
        className="w-full h-[40px] rounded bg-[#0a0a0a]"
      />
      <div className="flex gap-1 justify-center">
        <SynthKnob label="A" value={config.attack} min={0.001} max={10} step={0.01}
          defaultValue={0.01} color={color} size={30}
          formatValue={(v) => v >= 1 ? `${v.toFixed(1)}s` : `${Math.round(v * 1000)}ms`}
          onChange={(v) => onChange({ attack: v })} />
        <SynthKnob label="D" value={config.decay} min={0.001} max={10} step={0.01}
          defaultValue={0.3} color={color} size={30}
          formatValue={(v) => v >= 1 ? `${v.toFixed(1)}s` : `${Math.round(v * 1000)}ms`}
          onChange={(v) => onChange({ decay: v })} />
        <SynthKnob label="S" value={config.sustain} min={0} max={1} step={0.01}
          defaultValue={0.7} color={color} size={30}
          formatValue={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => onChange({ sustain: v })} />
        <SynthKnob label="R" value={config.release} min={0.001} max={10} step={0.01}
          defaultValue={0.3} color={color} size={30}
          formatValue={(v) => v >= 1 ? `${v.toFixed(1)}s` : `${Math.round(v * 1000)}ms`}
          onChange={(v) => onChange({ release: v })} />
      </div>
    </div>
  );
};

// === LFO Section ===
const LfoSection: React.FC<{
  label: string;
  config: LfoConfig;
  onChange: (updates: Partial<LfoConfig>) => void;
  color: string;
}> = ({ label, config, onChange, color }) => {
  const shapes: { v: LfoShape; label: string }[] = [
    { v: 'sine', label: 'SIN' },
    { v: 'triangle', label: 'TRI' },
    { v: 'sawtooth', label: 'SAW' },
    { v: 'square', label: 'SQR' },
  ];
  return (
    <div className="flex flex-col gap-1 p-1.5 bg-[#151515] rounded border border-white/5">
      <div className="flex items-center gap-1">
        <EnableBtn enabled={config.enabled} onToggle={() => onChange({ enabled: !config.enabled })} color={color} />
        <SectionLabel color={color}>{label}</SectionLabel>
      </div>
      {config.enabled && (
        <>
          <div className="flex gap-[2px]">
            {shapes.map(s => (
              <button
                key={s.v}
                onClick={() => onChange({ shape: s.v })}
                className={cn(
                  "h-[14px] px-1 text-[6px] font-bold rounded-sm transition-colors",
                  config.shape === s.v ? "text-white" : "bg-[#222] text-white/20 hover:text-white/40"
                )}
                style={config.shape === s.v ? { backgroundColor: color + '50' } : undefined}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 justify-center">
            <SynthKnob label="Rate" value={config.rate} min={0.01} max={50} step={0.1}
              defaultValue={2} color={color} size={28}
              formatValue={(v) => `${v.toFixed(1)}`}
              onChange={(v) => onChange({ rate: v })} />
            <SynthKnob label="Depth" value={config.depth} min={0} max={1} step={0.01}
              defaultValue={0.3} color={color} size={28}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onChange({ depth: v })} />
          </div>
        </>
      )}
    </div>
  );
};

// === Mod Matrix Section ===
const MOD_SOURCES: { v: ModSource; label: string }[] = [
  { v: 'lfo1', label: 'LFO 1' },
  { v: 'lfo2', label: 'LFO 2' },
  { v: 'lfo3', label: 'LFO 3' },
  { v: 'lfo4', label: 'LFO 4' },
  { v: 'env1', label: 'Env 1' },
  { v: 'env2', label: 'Env 2' },
  { v: 'velocity', label: 'Vel' },
  { v: 'note', label: 'Note' },
];

const MOD_TARGETS: { v: ModTarget; label: string }[] = [
  { v: 'osc1Pitch', label: 'Osc1 Pitch' },
  { v: 'osc2Pitch', label: 'Osc2 Pitch' },
  { v: 'osc1Level', label: 'Osc1 Level' },
  { v: 'osc2Level', label: 'Osc2 Level' },
  { v: 'filter1Cutoff', label: 'Flt1 Cut' },
  { v: 'filter2Cutoff', label: 'Flt2 Cut' },
  { v: 'filter1Resonance', label: 'Flt1 Res' },
  { v: 'ampLevel', label: 'Amp' },
  { v: 'pan', label: 'Pan' },
  { v: 'lfo1Rate', label: 'LFO1 Rate' },
];

const ModMatrixSection: React.FC<{
  slots: ModSlot[];
  onChange: (slots: ModSlot[]) => void;
}> = ({ slots, onChange }) => {
  const addSlot = () => {
    if (slots.length >= 8) return;
    onChange([...slots, { source: 'lfo1', target: 'filter1Cutoff', amount: 0.5 }]);
  };

  const removeSlot = (i: number) => {
    onChange(slots.filter((_, idx) => idx !== i));
  };

  const updateSlot = (i: number, updates: Partial<ModSlot>) => {
    onChange(slots.map((s, idx) => idx === i ? { ...s, ...updates } : s));
  };

  return (
    <div className="flex flex-col gap-1 p-2 bg-[#151515] rounded border border-white/5">
      <div className="flex items-center gap-1.5">
        <SectionLabel color={PURPLE}>MOD MATRIX</SectionLabel>
        {slots.length < 8 && (
          <button onClick={addSlot} className="ml-auto w-4 h-4 rounded-sm bg-[#222] text-white/20 hover:text-white/50 flex items-center justify-center transition-colors">
            <Plus size={8} />
          </button>
        )}
      </div>
      {slots.length === 0 && (
        <span className="text-[8px] text-white/15 italic text-center py-1">No modulations</span>
      )}
      {slots.map((slot, i) => (
        <div key={i} className="flex items-center gap-1">
          <select
            value={slot.source}
            onChange={(e) => updateSlot(i, { source: e.target.value as ModSource })}
            className="h-[16px] text-[7px] bg-[#222] text-white/60 border-none rounded-sm px-0.5 outline-none flex-1 min-w-0"
          >
            {MOD_SOURCES.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
          <span className="text-[7px] text-white/20">&rarr;</span>
          <select
            value={slot.target}
            onChange={(e) => updateSlot(i, { target: e.target.value as ModTarget })}
            className="h-[16px] text-[7px] bg-[#222] text-white/60 border-none rounded-sm px-0.5 outline-none flex-1 min-w-0"
          >
            {MOD_TARGETS.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
          <SynthKnob label="" value={slot.amount} min={-1} max={1} step={0.01}
            defaultValue={0.5} color={PURPLE} size={22}
            formatValue={(v) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}%`}
            onChange={(v) => updateSlot(i, { amount: v })} />
          <button onClick={() => removeSlot(i)} className="text-white/15 hover:text-red-400 transition-colors">
            <Trash2 size={8} />
          </button>
        </div>
      ))}
    </div>
  );
};

// === Unison Section ===
const UnisonSection: React.FC<{
  config: UnisonConfig;
  onChange: (updates: Partial<UnisonConfig>) => void;
}> = ({ config, onChange }) => (
  <div className="flex flex-col gap-1.5 p-2 bg-[#151515] rounded border border-white/5">
    <SectionLabel color={BLUE}>UNISON</SectionLabel>
    <div className="flex gap-1 justify-center">
      <SynthKnob label="Voices" value={config.voices} min={1} max={16} step={1}
        defaultValue={1} color={BLUE} size={30}
        formatValue={(v) => `${v}`}
        onChange={(v) => onChange({ voices: v })} />
      <SynthKnob label="Detune" value={config.detune} min={0} max={100} step={1}
        defaultValue={15} color={BLUE} size={30}
        formatValue={(v) => `${v}c`}
        onChange={(v) => onChange({ detune: v })} />
      <SynthKnob label="Blend" value={config.blend} min={0} max={1} step={0.01}
        defaultValue={0.5} color={BLUE} size={30}
        formatValue={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => onChange({ blend: v })} />
    </div>
  </div>
);

// === Preset Selector ===
const PresetSelector: React.FC<{
  preset: SynthPreset;
  onSelect: (p: SynthPreset) => void;
}> = ({ preset, onSelect }) => {
  const [open, setOpen] = useState(false);
  const currentIndex = FACTORY_PRESETS.findIndex(p => p.name === preset.name);

  const prev = () => {
    const i = currentIndex <= 0 ? FACTORY_PRESETS.length - 1 : currentIndex - 1;
    onSelect(FACTORY_PRESETS[i]);
  };
  const next = () => {
    const i = currentIndex >= FACTORY_PRESETS.length - 1 ? 0 : currentIndex + 1;
    onSelect(FACTORY_PRESETS[i]);
  };

  return (
    <div className="flex items-center gap-1 relative">
      <button onClick={prev} className="w-5 h-5 flex items-center justify-center rounded-sm bg-[#222] text-white/30 hover:text-white/60 transition-colors">
        <ChevronLeft size={10} />
      </button>
      <button
        onClick={() => setOpen(!open)}
        className="h-5 px-2 rounded-sm bg-[#222] text-[9px] font-semibold text-white/60 hover:text-white/80 transition-colors min-w-[100px] text-center"
      >
        {preset.name}
      </button>
      <button onClick={next} className="w-5 h-5 flex items-center justify-center rounded-sm bg-[#222] text-white/30 hover:text-white/60 transition-colors">
        <ChevronRight size={10} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-6 left-0 z-50 w-[200px] max-h-[300px] overflow-y-auto bg-[#1a1a1a] border border-[#444] rounded shadow-2xl"
          onMouseLeave={() => setOpen(false)}
        >
          {PRESET_CATEGORIES.map(cat => (
            <div key={cat.name}>
              <div className="px-2 py-1 text-[7px] font-bold text-white/20 uppercase tracking-widest bg-[#111]">
                {cat.name}
              </div>
              {cat.presets.map(p => (
                <button
                  key={p.name}
                  onClick={() => { onSelect(p); setOpen(false); }}
                  className={cn(
                    "w-full text-left px-2 py-1 text-[9px] hover:bg-white/5 transition-colors",
                    p.name === preset.name ? "text-[#50C8A8] font-semibold" : "text-white/50"
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// === Main SynthPanel ===
const SynthPanel: React.FC<SynthPanelProps> = ({ preset, onPresetChange, onClose }) => {
  const update = useCallback(<K extends keyof SynthPreset>(key: K, value: SynthPreset[K]) => {
    onPresetChange({ ...preset, [key]: value });
  }, [preset, onPresetChange]);

  const updateOsc1 = useCallback((u: Partial<OscConfig>) => update('osc1', { ...preset.osc1, ...u }), [preset, update]);
  const updateOsc2 = useCallback((u: Partial<OscConfig>) => update('osc2', { ...preset.osc2, ...u }), [preset, update]);
  const updateSub = useCallback((u: Partial<SubOscConfig>) => update('sub', { ...preset.sub, ...u }), [preset, update]);
  const updateNoise = useCallback((u: Partial<NoiseConfig>) => update('noise', { ...preset.noise, ...u }), [preset, update]);
  const updateFilter1 = useCallback((u: Partial<FilterConfig>) => update('filter1', { ...preset.filter1, ...u }), [preset, update]);
  const updateFilter2 = useCallback((u: Partial<FilterConfig>) => update('filter2', { ...preset.filter2, ...u }), [preset, update]);
  const updateAmpEnv = useCallback((u: Partial<EnvelopeConfig>) => update('ampEnvelope', { ...preset.ampEnvelope, ...u }), [preset, update]);
  const updateFilterEnv = useCallback((u: Partial<EnvelopeConfig>) => update('filterEnvelope', { ...preset.filterEnvelope, ...u }), [preset, update]);
  const updateLfo1 = useCallback((u: Partial<LfoConfig>) => update('lfo1', { ...preset.lfo1, ...u }), [preset, update]);
  const updateLfo2 = useCallback((u: Partial<LfoConfig>) => update('lfo2', { ...preset.lfo2, ...u }), [preset, update]);
  const updateLfo3 = useCallback((u: Partial<LfoConfig>) => update('lfo3', { ...preset.lfo3, ...u }), [preset, update]);
  const updateLfo4 = useCallback((u: Partial<LfoConfig>) => update('lfo4', { ...preset.lfo4, ...u }), [preset, update]);
  const updateUnison = useCallback((u: Partial<UnisonConfig>) => update('unison', { ...preset.unison, ...u }), [preset, update]);

  return (
    <div className="w-full bg-[#111] border-t border-[#444] flex flex-col" style={{ height: '380px' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1a1a1a] border-b border-[#333] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
            Synth
          </span>
          <PresetSelector preset={preset} onSelect={onPresetChange} />
        </div>
        <div className="flex items-center gap-2">
          <SynthKnob label="Master" value={preset.masterGain} min={0} max={1} step={0.01}
            defaultValue={0.7} color={TEAL} size={28}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => update('masterGain', v)} />
          <SynthKnob label="Glide" value={preset.glide} min={0} max={2} step={0.01}
            defaultValue={0} color={TEAL} size={28}
            formatValue={(v) => v >= 0.1 ? `${(v * 1000).toFixed(0)}ms` : 'Off'}
            onChange={(v) => update('glide', v)} />
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded-sm text-white/30 hover:text-white/60 hover:bg-[#333] transition-colors ml-2"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Main content — scrollable grid */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        <div className="grid grid-cols-6 gap-1.5 auto-rows-min">
          {/* Row 1: SUB | OSC1 | OSC2 | NOISE | FILTER1 | FILTER2 */}
          <SubSection config={preset.sub} onChange={updateSub} />
          <OscSection label="OSC 1" config={preset.osc1} onChange={updateOsc1} color={TEAL} />
          <OscSection label="OSC 2" config={preset.osc2} onChange={updateOsc2} color="#6DC8E8" />
          <NoiseSection config={preset.noise} onChange={updateNoise} />
          <FilterSection label="FILTER 1" config={preset.filter1} onChange={updateFilter1} color="#E8956D" />
          <FilterSection label="FILTER 2" config={preset.filter2} onChange={updateFilter2} color="#C9A84C" />

          {/* Row 2: ENV1 | ENV2 | LFO1 | LFO2 | LFO3 | LFO4 */}
          <EnvelopeSection label="AMP ENV" config={preset.ampEnvelope} onChange={updateAmpEnv} color="#7EC850" />
          <EnvelopeSection label="FILTER ENV" config={preset.filterEnvelope} onChange={updateFilterEnv} color="#E86DB0" />
          <LfoSection label="LFO 1" config={preset.lfo1} onChange={updateLfo1} color={BLUE} />
          <LfoSection label="LFO 2" config={preset.lfo2} onChange={updateLfo2} color={BLUE} />
          <LfoSection label="LFO 3" config={preset.lfo3} onChange={updateLfo3} color={BLUE} />
          <LfoSection label="LFO 4" config={preset.lfo4} onChange={updateLfo4} color={BLUE} />

          {/* Row 3: MOD MATRIX (3 cols) | UNISON (1 col) | MASTER (2 cols, empty space) */}
          <div className="col-span-3">
            <ModMatrixSection slots={preset.modMatrix} onChange={(slots) => update('modMatrix', slots)} />
          </div>
          <UnisonSection config={preset.unison} onChange={updateUnison} />
        </div>
      </div>
    </div>
  );
};

export default SynthPanel;
