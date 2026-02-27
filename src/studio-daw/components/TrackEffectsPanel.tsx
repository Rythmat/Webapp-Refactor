import React from 'react';
import { Track, EffectType, EffectParams } from '@/studio-daw/hooks/use-audio-engine';
import { cn } from '@/lib/utils';
import { Plus, X, Power } from 'lucide-react';

interface TrackEffectsPanelProps {
  track: Track;
  allTracks?: Track[];
  onAddEffect: (type: EffectType) => void;
  onRemoveEffect: (effectId: string) => void;
  onToggleEffect: (effectId: string) => void;
  onUpdateEffect: (effectId: string, params: Partial<EffectParams>) => void;
  onClose: () => void;
}

const EFFECT_TYPES: { value: EffectType; label: string }[] = [
  { value: 'reverb', label: 'Reverb' },
  { value: 'delay', label: 'Delay' },
  { value: 'phaser', label: 'Phaser' },
  { value: 'flanger', label: 'Flanger' },
  { value: 'eq', label: 'EQ' },
  { value: 'compressor', label: 'Comp' },
  { value: 'limiter', label: 'Limiter' },
  { value: 'sidechain', label: 'Sidechain' },
];

const EFFECT_PARAM_DEFS: Record<EffectType, { key: keyof EffectParams; label: string; min: number; max: number; step: number }[]> = {
  reverb: [
    { key: 'wet', label: 'Wet', min: 0, max: 1, step: 0.05 },
    { key: 'decay', label: 'Decay', min: 0.5, max: 10, step: 0.5 },
  ],
  delay: [
    { key: 'wet', label: 'Wet', min: 0, max: 1, step: 0.05 },
    { key: 'time', label: 'Time', min: 0.05, max: 2, step: 0.05 },
    { key: 'feedback', label: 'Feedback', min: 0, max: 0.95, step: 0.05 },
  ],
  phaser: [
    { key: 'wet', label: 'Wet', min: 0, max: 1, step: 0.05 },
    { key: 'rate', label: 'Rate', min: 0.1, max: 8, step: 0.1 },
    { key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.05 },
  ],
  flanger: [
    { key: 'wet', label: 'Wet', min: 0, max: 1, step: 0.05 },
    { key: 'rate', label: 'Rate', min: 0.1, max: 8, step: 0.1 },
    { key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.05 },
    { key: 'feedback', label: 'Feedback', min: 0, max: 0.95, step: 0.05 },
  ],
  eq: [
    { key: 'eqFrequency', label: 'Freq', min: 20, max: 20000, step: 10 },
    { key: 'eqGain', label: 'Gain', min: -12, max: 12, step: 0.5 },
    { key: 'eqQ', label: 'Q', min: 0.1, max: 10, step: 0.1 },
  ],
  compressor: [
    { key: 'threshold', label: 'Thresh', min: -60, max: 0, step: 1 },
    { key: 'ratio', label: 'Ratio', min: 1, max: 20, step: 0.5 },
    { key: 'attack', label: 'Attack', min: 0, max: 1, step: 0.001 },
    { key: 'release', label: 'Release', min: 0, max: 1, step: 0.01 },
  ],
  limiter: [
    { key: 'threshold', label: 'Thresh', min: -12, max: 0, step: 0.5 },
  ],
  sidechain: [
    { key: 'sidechainAmount', label: 'Amount', min: 0, max: 1, step: 0.05 },
    { key: 'threshold', label: 'Thresh', min: -60, max: 0, step: 1 },
    { key: 'attack', label: 'Attack', min: 0.001, max: 0.5, step: 0.001 },
    { key: 'release', label: 'Release', min: 0.01, max: 1, step: 0.01 },
  ],
};

const TrackEffectsPanel: React.FC<TrackEffectsPanelProps> = ({
  track, allTracks, onAddEffect, onRemoveEffect, onToggleEffect, onUpdateEffect, onClose,
}) => {
  // Available source tracks for sidechain (exclude self)
  const sidechainSourceTracks = (allTracks || []).filter(t => t.id !== track.id);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Panel */}
      <div
        className="relative w-[320px] max-h-[80vh] bg-[#1a1a1a] border border-[#444] rounded-lg shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] flex-shrink-0">
          <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
            FX — {track.name}
          </span>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Effect list */}
        <div className="flex-1 overflow-y-auto">
          {track.effects.length === 0 && (
            <div className="px-3 py-6 text-center text-[11px] text-white/20 italic">
              No effects added
            </div>
          )}

          {track.effects.map((effect) => {
            const paramDefs = EFFECT_PARAM_DEFS[effect.type] || [];
            return (
              <div key={effect.id} className="border-b border-[#2a2a2a] last:border-b-0">
                {/* Effect header */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    onClick={() => onToggleEffect(effect.id)}
                    className={cn(
                      "w-5 h-5 rounded-sm flex items-center justify-center flex-shrink-0 transition-colors",
                      effect.enabled
                        ? "bg-[#7EC850] text-white"
                        : "bg-[#333] text-white/30"
                    )}
                    title={effect.enabled ? 'Disable' : 'Enable'}
                  >
                    <Power size={10} />
                  </button>
                  <span className={cn(
                    "text-[11px] font-semibold flex-1 capitalize",
                    effect.enabled ? "text-white/80" : "text-white/30"
                  )}>
                    {effect.type}
                  </span>
                  <button
                    onClick={() => onRemoveEffect(effect.id)}
                    className="text-white/20 hover:text-red-400 transition-colors"
                    title="Remove effect"
                  >
                    <X size={12} />
                  </button>
                </div>

                {/* Parameter sliders */}
                {effect.enabled && (
                  <div className="px-3 pb-2.5 space-y-1.5">
                    {/* Sidechain source track selector */}
                    {effect.type === 'sidechain' && (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/30 w-[48px] text-right flex-shrink-0">
                          Source
                        </span>
                        <select
                          value={effect.params.sidechainSourceTrackId || ''}
                          onChange={(e) => onUpdateEffect(effect.id, { sidechainSourceTrackId: e.target.value })}
                          className="flex-1 h-[20px] bg-[#111] border border-white/10 rounded-sm text-[9px] text-white/60 px-1 focus:outline-none focus:border-purple-500/40"
                        >
                          <option value="">Select track...</option>
                          {sidechainSourceTracks.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {paramDefs.map((param) => {
                      const value = (effect.params[param.key] as number) ?? 0;
                      const percent = ((value - param.min) / (param.max - param.min)) * 100;
                      return (
                        <div key={param.key} className="flex items-center gap-2">
                          <span className="text-[9px] text-white/30 w-[48px] text-right flex-shrink-0">
                            {param.label}
                          </span>
                          <div className="flex-1 relative h-[12px] bg-[#111] rounded-sm overflow-hidden border border-white/5">
                            <div
                              className="absolute inset-y-0 left-0 bg-white/15 rounded-sm"
                              style={{ width: `${percent}%` }}
                            />
                            <input
                              type="range"
                              min={param.min}
                              max={param.max}
                              step={param.step}
                              value={value}
                              onChange={(e) => onUpdateEffect(effect.id, { [param.key]: parseFloat(e.target.value) })}
                              className="absolute inset-0 opacity-0 cursor-ew-resize"
                            />
                          </div>
                          <span className="text-[9px] text-white/25 w-[32px] font-mono text-right flex-shrink-0">
                            {value.toFixed(param.step < 0.1 ? 2 : 1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add effect buttons */}
        <div className="border-t border-[#333] px-3 py-2 flex-shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {EFFECT_TYPES.map((et) => (
              <button
                key={et.value}
                onClick={() => onAddEffect(et.value)}
                className="flex items-center gap-1 h-[22px] px-2 rounded-sm text-[9px] font-semibold bg-[#333] text-white/40 hover:bg-[#444] hover:text-white/70 transition-colors"
              >
                <Plus size={9} />
                {et.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackEffectsPanel;
