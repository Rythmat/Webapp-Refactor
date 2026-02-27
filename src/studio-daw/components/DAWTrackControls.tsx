import React, { useState } from 'react';
import { Track, TrackEffect, EffectType, EffectParams, ReferenceTrackData, VolumeFollowMode } from '@/studio-daw/hooks/use-audio-engine';
import { cn } from '@/lib/utils';
import { Plus, Sliders, Piano, FileAudio, Volume2, VolumeX, Waves } from 'lucide-react';
import TrackEffectsPanel from './TrackEffectsPanel';
import AITrackSuggestions from './AITrackSuggestions';

interface DAWTrackControlsProps {
  tracks: Track[];
  onUpdate: (id: string, updates: Partial<Track>) => void;
  onDelete: (id: string) => void;
  onAddTrack: () => void;
  onAddEffect: (trackId: string, type: EffectType) => void;
  onRemoveEffect: (trackId: string, effectId: string) => void;
  onToggleEffect: (trackId: string, effectId: string) => void;
  onUpdateEffect: (trackId: string, effectId: string, params: Partial<EffectParams>) => void;
  onApplyTransform?: (trackId: string, clipId: string, transform: string, params: Record<string, number>) => void;
  onEditMidiClip?: (trackId: string, clipId: string) => void;
  onEditSynthPreset?: (trackId: string, clipId: string) => void;
  onUpdateReferenceSettings?: (trackId: string, settings: Partial<Omit<ReferenceTrackData, 'contour'>>) => void;
  projectBPM?: number;
  masterEffects?: TrackEffect[];
  onAddMasterEffect?: (type: EffectType) => void;
  onRemoveMasterEffect?: (effectId: string) => void;
  onToggleMasterEffect?: (effectId: string) => void;
  onUpdateMasterEffect?: (effectId: string, params: Partial<EffectParams>) => void;
}

/** Small circular pan knob visual */
const PanKnob: React.FC<{ value: number; onChange: (v: number) => void; color: string }> = ({ value, onChange, color }) => {
  const angle = value * 135; // -135 to +135 degrees
  return (
    <div
      className="relative w-6 h-6 rounded-full bg-[#1a1a1a] border border-white/10 cursor-pointer select-none flex-shrink-0"
      title={`Pan: ${value === 0 ? 'C' : value < 0 ? `${Math.round(Math.abs(value) * 50)}L` : `${Math.round(value * 50)}R`}`}
      onDoubleClick={() => onChange(0)}
      onWheel={(e) => {
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        onChange(Math.max(-1, Math.min(1, value + delta)));
      }}
    >
      {/* Knob indicator line */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: `rotate(${angle}deg)` }}
      >
        <div
          className="w-[2px] h-[8px] rounded-full absolute top-[3px]"
          style={{ backgroundColor: color }}
        />
      </div>
      {/* Center dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1 h-1 rounded-full bg-white/20" />
      </div>
    </div>
  );
};

/** Compact horizontal volume slider (Ableton-style) */
const VolumeSlider: React.FC<{ value: number; onChange: (v: number) => void; color: string; muted: boolean }> = ({ value, onChange, color, muted }) => {
  const percent = (value / 2) * 100; // 0-2 mapped to 0-100%
  return (
    <div className="flex-1 h-[14px] relative group">
      <div className="absolute inset-0 bg-[#1a1a1a] rounded-sm overflow-hidden border border-white/5">
        {/* Fill bar */}
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-75"
          style={{
            width: `${percent}%`,
            backgroundColor: muted ? '#555' : color,
            opacity: muted ? 0.3 : 0.5,
          }}
        />
        {/* dB markings */}
        <div className="absolute inset-0 flex items-center justify-between px-1">
          <span className="text-[8px] font-mono text-white/30 leading-none">
            {muted ? 'MUTE' : `${value <= 1 ? (value === 0 ? '-inf' : `${(Math.log10(value) * 20).toFixed(1)}`) : `+${(Math.log10(value) * 20).toFixed(1)}`} dB`}
          </span>
        </div>
      </div>
      {/* Invisible range input overlay */}
      <input
        type="range"
        min={0}
        max={200}
        value={value * 100}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="absolute inset-0 opacity-0 cursor-ew-resize"
      />
    </div>
  );
};

/** Reference track controls for volume following */
const ReferenceTrackControls: React.FC<{
  referenceData: ReferenceTrackData;
  onUpdate: (settings: Partial<Omit<ReferenceTrackData, 'contour'>>) => void;
}> = ({ referenceData, onUpdate }) => {
  return (
    <div className="flex flex-col gap-1 mt-1">
      {/* Volume Follow Toggle + Mode */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onUpdate({ volumeFollowEnabled: !referenceData.volumeFollowEnabled })}
          className={cn(
            "flex-1 h-5 rounded text-[8px] font-bold flex items-center justify-center gap-1 transition-colors",
            referenceData.volumeFollowEnabled
              ? "bg-[#F97316]/30 text-[#F97316]"
              : "bg-[#333] text-white/30 hover:text-white/50"
          )}
        >
          {referenceData.volumeFollowEnabled ? 'Follow ON' : 'Follow OFF'}
        </button>
        {referenceData.volumeFollowEnabled && (
          <>
            <button
              onClick={() => onUpdate({ volumeFollowMode: 'duck' })}
              className={cn(
                "w-12 h-5 rounded text-[8px] font-bold flex items-center justify-center gap-0.5 transition-colors",
                referenceData.volumeFollowMode === 'duck'
                  ? "bg-[#3B82F6]/30 text-[#3B82F6]"
                  : "bg-[#333] text-white/30 hover:text-white/50"
              )}
              title="Music quieter when speech is loud"
            >
              <VolumeX size={9} />
              Duck
            </button>
            <button
              onClick={() => onUpdate({ volumeFollowMode: 'swell' })}
              className={cn(
                "w-12 h-5 rounded text-[8px] font-bold flex items-center justify-center gap-0.5 transition-colors",
                referenceData.volumeFollowMode === 'swell'
                  ? "bg-[#22C55E]/30 text-[#22C55E]"
                  : "bg-[#333] text-white/30 hover:text-white/50"
              )}
              title="Music louder to match speech intensity"
            >
              <Volume2 size={9} />
              Swell
            </button>
          </>
        )}
      </div>

      {/* Influence Strength Slider */}
      {referenceData.volumeFollowEnabled && (
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] text-white/40 w-12 flex-shrink-0">Influence</span>
          <div className="flex-1 h-[10px] relative">
            <div className="absolute inset-0 bg-[#1a1a1a] rounded-sm overflow-hidden border border-white/5">
              <div
                className="absolute inset-y-0 left-0 transition-[width] duration-75 bg-[#F97316]/40"
                style={{ width: `${referenceData.influenceStrength * 100}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={referenceData.influenceStrength * 100}
              onChange={(e) => onUpdate({ influenceStrength: Number(e.target.value) / 100 })}
              className="absolute inset-0 opacity-0 cursor-ew-resize"
            />
          </div>
          <span className="text-[8px] text-white/40 w-6 text-right">
            {Math.round(referenceData.influenceStrength * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};

const DAWTrackControls: React.FC<DAWTrackControlsProps> = ({
  tracks, onUpdate, onDelete, onAddTrack,
  onAddEffect, onRemoveEffect, onToggleEffect, onUpdateEffect,
  onApplyTransform, onEditMidiClip, onEditSynthPreset, onUpdateReferenceSettings, projectBPM = 60,
  masterEffects = [], onAddMasterEffect, onRemoveMasterEffect, onToggleMasterEffect, onUpdateMasterEffect,
}) => {
  const [fxOpenTrackId, setFxOpenTrackId] = useState<string | null>(null);
  const [aiOpenTrackId, setAiOpenTrackId] = useState<string | null>(null);
  const [masterFxOpen, setMasterFxOpen] = useState(false);

  return (
    <div className="w-[220px] bg-[#1e1e1e] border-r border-[#333] flex flex-col z-20 flex-shrink-0">
      {/* Column header */}
      <div className="h-7 border-b border-[#333] flex items-center px-2 bg-[#2a2a2a]">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-white/30">Tracks</span>
      </div>

      <div className="flex flex-col overflow-y-auto">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className={cn(
              "border-b border-[#333] flex group hover:bg-[#252525] transition-colors relative",
              track.type === 'reference' ? "min-h-[90px]" : "min-h-[60px]"
            )}
          >
            {/* Color strip */}
            <div
              className="w-[4px] flex-shrink-0"
              style={{ backgroundColor: track.color }}
            />

            <div className="flex-1 flex flex-col justify-between py-1.5 px-2 min-w-0">
              {/* Row 1: Track number, name, FX, delete */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] font-mono text-white/25 flex-shrink-0 w-3 text-right">
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium truncate flex-1 min-w-0",
                    track.muted ? "text-white/30" : "text-white/80"
                  )}
                >
                  {track.name}
                </span>
                {track.type === 'reference' && (
                  <span className="text-[7px] font-bold px-1 py-[1px] rounded flex-shrink-0 flex items-center gap-0.5 bg-[#F97316]/30 text-[#F97316]">
                    <FileAudio size={8} />
                    REF
                  </span>
                )}
                {track.type === 'midi' && (
                  <button
                    onClick={() => {
                      const clip = track.clips[0];
                      if (clip && onEditMidiClip) onEditMidiClip(track.id, clip.id);
                    }}
                    disabled={!track.clips[0]?.midiData}
                    className={cn(
                      "text-[7px] font-bold px-1 py-[1px] rounded flex-shrink-0 flex items-center gap-0.5 transition-colors",
                      track.clips[0]?.midiData
                        ? "bg-[#A675E2]/30 text-[#A675E2] hover:bg-[#A675E2]/50 cursor-pointer"
                        : "bg-[#A675E2]/15 text-[#A675E2]/40 cursor-not-allowed"
                    )}
                    title="Edit MIDI notes"
                  >
                    <Piano size={8} />
                    MIDI
                  </button>
                )}
                {track.type === 'synth' && (
                  <button
                    onClick={() => {
                      const clip = track.clips[0];
                      if (clip && onEditSynthPreset) onEditSynthPreset(track.id, clip.id);
                    }}
                    className="text-[7px] font-bold px-1 py-[1px] rounded flex-shrink-0 flex items-center gap-0.5 transition-colors bg-[#50C8A8]/30 text-[#50C8A8] hover:bg-[#50C8A8]/50 cursor-pointer"
                    title="Edit synth preset"
                  >
                    <Waves size={8} />
                    SYNTH
                  </button>
                )}
                {/* FX button */}
                <button
                  onClick={() => setFxOpenTrackId(prev => prev === track.id ? null : track.id)}
                  className={cn(
                    "w-[22px] h-[14px] rounded-sm text-[7px] font-bold flex items-center justify-center flex-shrink-0 transition-colors",
                    track.effects.length > 0
                      ? fxOpenTrackId === track.id
                        ? "bg-[#ff6a14] text-white"
                        : "bg-[#ff6a14]/40 text-white/80 hover:bg-[#ff6a14]/60"
                      : fxOpenTrackId === track.id
                        ? "bg-[#555] text-white"
                        : "bg-[#333] text-white/30 hover:text-white/50"
                  )}
                  title="Effects"
                >
                  FX
                </button>
                {/* AI suggestions button */}
                <button
                  onClick={() => setAiOpenTrackId(prev => prev === track.id ? null : track.id)}
                  className={cn(
                    "w-[22px] h-[14px] rounded-sm text-[7px] font-bold flex items-center justify-center flex-shrink-0 transition-colors",
                    track.clips[0]?.analysis
                      ? aiOpenTrackId === track.id
                        ? "bg-[#a675e2] text-white"
                        : "bg-[#a675e2]/40 text-white/80 hover:bg-[#a675e2]/60"
                      : "bg-[#333] text-white/15 cursor-not-allowed"
                  )}
                  title="AI Analysis & Suggestions"
                  disabled={!track.clips[0]?.analysis}
                >
                  AI
                </button>
                {/* Delete button - visible on hover */}
                <button
                  onClick={() => onDelete(track.id)}
                  className="text-[9px] text-white/0 group-hover:text-white/20 hover:!text-red-400 transition-colors flex-shrink-0"
                  title="Delete track"
                >
                  ×
                </button>
              </div>

              {/* Analysis badges */}
              {track.clips[0]?.analysis && (
                <div className="flex items-center gap-1 -mt-0.5">
                  {track.clips[0].analysis.key && (
                    <span className="text-[7px] px-1 py-[1px] rounded bg-white/5 text-white/35 font-mono">
                      {track.clips[0].analysis.key}
                    </span>
                  )}
                  {track.clips[0].analysis.bpm && (
                    <span className="text-[7px] px-1 py-[1px] rounded bg-white/5 text-white/35 font-mono">
                      {Math.round(track.clips[0].analysis.bpm)}bpm
                    </span>
                  )}
                </div>
              )}

              {/* Row 2: Activator, S, M, Pan, Volume */}
              <div className="flex items-center gap-1">
                {/* Track activator (on/off) */}
                <button
                  onClick={() => onUpdate(track.id, { muted: !track.muted })}
                  className={cn(
                    "w-[14px] h-[14px] rounded-sm text-[7px] font-bold flex items-center justify-center flex-shrink-0 transition-colors border",
                    track.muted
                      ? "bg-[#1a1a1a] border-white/10 text-white/20"
                      : "border-white/10 text-white/70"
                  )}
                  style={!track.muted ? { backgroundColor: track.color + '40' } : undefined}
                  title={track.muted ? 'Unmute' : 'Mute'}
                >
                  {track.muted ? '' : '●'}
                </button>

                {/* Solo */}
                <button
                  onClick={() => onUpdate(track.id, { soloed: !track.soloed })}
                  className={cn(
                    "w-[18px] h-[14px] rounded-sm text-[8px] font-bold flex items-center justify-center flex-shrink-0 transition-colors",
                    track.soloed
                      ? "bg-[#1a6ac2] text-white"
                      : "bg-[#333] text-white/30 hover:text-white/50"
                  )}
                  title="Solo"
                >
                  S
                </button>

                {/* Pan knob */}
                <PanKnob
                  value={track.pan}
                  onChange={(v) => onUpdate(track.id, { pan: v })}
                  color={track.color}
                />

                {/* Volume slider */}
                <VolumeSlider
                  value={track.volume}
                  onChange={(v) => onUpdate(track.id, { volume: v })}
                  color={track.color}
                  muted={track.muted}
                />
              </div>

              {/* Reference track controls */}
              {track.type === 'reference' && track.clips[0]?.referenceData && onUpdateReferenceSettings && (
                <ReferenceTrackControls
                  referenceData={track.clips[0].referenceData}
                  onUpdate={(settings) => onUpdateReferenceSettings(track.id, settings)}
                />
              )}
            </div>

            {/* Effects panel popover */}
            {fxOpenTrackId === track.id && (
              <TrackEffectsPanel
                track={track}
                allTracks={tracks}
                onAddEffect={(type) => onAddEffect(track.id, type)}
                onRemoveEffect={(effectId) => onRemoveEffect(track.id, effectId)}
                onToggleEffect={(effectId) => onToggleEffect(track.id, effectId)}
                onUpdateEffect={(effectId, params) => onUpdateEffect(track.id, effectId, params)}
                onClose={() => setFxOpenTrackId(null)}
              />
            )}

            {/* AI suggestions panel popover */}
            {aiOpenTrackId === track.id && onApplyTransform && (
              <AITrackSuggestions
                track={track}
                allTracks={tracks}
                projectBPM={projectBPM}
                onApplyTransform={onApplyTransform}
                onClose={() => setAiOpenTrackId(null)}
              />
            )}
          </div>
        ))}

        {/* Add Track button */}
        <button
          onClick={onAddTrack}
          className="h-[32px] border-b border-[#333] flex items-center justify-center gap-1.5 text-[10px] font-semibold text-white/30 hover:text-white/60 hover:bg-[#252525] transition-colors"
          title="Add Track"
        >
          <Plus size={12} />
          Add Track
        </button>

        {/* Master track area */}
        {tracks.length > 0 && (
          <div className="h-[40px] border-b border-[#333] flex bg-[#1a1a1a] relative">
            <div className="w-[4px] flex-shrink-0 bg-white/20" />
            <div className="flex-1 flex items-center px-2 gap-2">
              <span className="text-[9px] font-mono text-white/25 w-3 text-right">M</span>
              <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider flex-1">Master</span>
              {/* Master FX button */}
              {onAddMasterEffect && (
                <button
                  onClick={() => setMasterFxOpen(prev => !prev)}
                  className={cn(
                    "w-[22px] h-[14px] rounded-sm text-[7px] font-bold flex items-center justify-center flex-shrink-0 transition-colors",
                    masterEffects.length > 0
                      ? masterFxOpen
                        ? "bg-[#ff6a14] text-white"
                        : "bg-[#ff6a14]/40 text-white/80 hover:bg-[#ff6a14]/60"
                      : masterFxOpen
                        ? "bg-[#555] text-white"
                        : "bg-[#333] text-white/30 hover:text-white/50"
                  )}
                  title="Master Effects"
                >
                  FX
                </button>
              )}
            </div>

            {/* Master effects panel */}
            {masterFxOpen && onAddMasterEffect && onRemoveMasterEffect && onToggleMasterEffect && onUpdateMasterEffect && (
              <TrackEffectsPanel
                track={{ id: 'master', name: 'Master', type: 'audio', clips: [], volume: 1.2, pan: 0, muted: false, color: '#ffffff', effects: masterEffects }}
                onAddEffect={onAddMasterEffect}
                onRemoveEffect={onRemoveMasterEffect}
                onToggleEffect={onToggleMasterEffect}
                onUpdateEffect={onUpdateMasterEffect}
                onClose={() => setMasterFxOpen(false)}
              />
            )}
          </div>
        )}

        {/* Empty fill */}
        <div className="flex-1 bg-[#1a1a1a]" />
      </div>
    </div>
  );
};

export default DAWTrackControls;
