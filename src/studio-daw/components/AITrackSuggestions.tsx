import React, { useMemo } from 'react';
import { Track } from '@/studio-daw/hooks/use-audio-engine';
import { AudioAnalysis } from '@/studio-daw/audio/audio-analysis';
import { suggestTransformations, TransformSuggestion } from '@/studio-daw/audio/transforms';
import { cn } from '@/lib/utils';
import { X, Sparkles, ArrowUpDown, Music, Waves } from 'lucide-react';

interface AITrackSuggestionsProps {
  track: Track;
  allTracks: Track[];
  projectBPM: number;
  onApplyTransform: (trackId: string, clipId: string, transform: string, params: Record<string, number>) => void;
  onClose: () => void;
}

const AITrackSuggestions: React.FC<AITrackSuggestionsProps> = ({
  track, allTracks, projectBPM, onApplyTransform, onClose,
}) => {
  const clip = track.clips[0];
  const analysis = clip?.analysis;

  // Find foundation track analysis (first track, or first with role=foundation)
  const foundationAnalysis = useMemo(() => {
    const foundationTrack = allTracks.find(t =>
      t.clips[0]?.role === 'foundation'
    ) || allTracks[0];
    return foundationTrack?.clips[0]?.analysis;
  }, [allTracks]);

  const suggestions = useMemo(() => {
    if (!analysis) return [];
    return suggestTransformations(analysis, foundationAnalysis, projectBPM);
  }, [analysis, foundationAnalysis, projectBPM]);

  const handleApply = (suggestion: TransformSuggestion) => {
    if (!clip) return;
    onApplyTransform(track.id, clip.id, suggestion.type, suggestion.params);
  };

  return (
    <div
      className="absolute left-full top-0 z-50 w-[260px] bg-[#1a1a1a] border border-[#444] rounded-md shadow-2xl"
      style={{ marginLeft: 1 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#333]">
        <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider flex items-center gap-1">
          <Sparkles size={10} className="text-[#a675e2]" />
          AI — {track.name}
        </span>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
          <X size={12} />
        </button>
      </div>

      {/* Analysis data */}
      {analysis ? (
        <div className="px-3 py-2 border-b border-[#2a2a2a]">
          <div className="text-[9px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Analysis</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="flex items-center gap-1.5">
              <Music size={9} className="text-white/25" />
              <span className="text-[9px] text-white/40">Key:</span>
              <span className="text-[10px] text-white/80 font-mono">{analysis.key || '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown size={9} className="text-white/25" />
              <span className="text-[9px] text-white/40">BPM:</span>
              <span className="text-[10px] text-white/80 font-mono">{analysis.bpm ? Math.round(analysis.bpm) : '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Waves size={9} className="text-white/25" />
              <span className="text-[9px] text-white/40">Bright:</span>
              <div className="flex-1 h-[4px] bg-[#111] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-yellow-400 rounded-full"
                  style={{ width: `${analysis.spectralCentroid * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-white/40 ml-3">Level:</span>
              <div className="flex-1 h-[4px] bg-[#111] rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${analysis.rmsLevel * 100}%` }}
                />
              </div>
            </div>
          </div>
          {clip?.role && (
            <div className="mt-1.5">
              <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-[#a675e2]/20 text-[#a675e2] font-semibold uppercase">
                {clip.role}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="px-3 py-4 text-center text-[10px] text-white/20 italic">
          Analyzing audio...
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 ? (
        <div className="px-2 py-2">
          <div className="text-[9px] font-semibold text-white/30 uppercase tracking-wider mb-1.5 px-1">
            Suggestions
          </div>
          <div className="space-y-1">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleApply(suggestion)}
                className="w-full flex items-start gap-2 px-2 py-1.5 rounded-sm text-left hover:bg-white/5 transition-colors group"
              >
                <Sparkles size={10} className="text-[#a675e2] flex-shrink-0 mt-0.5" />
                <span className="text-[10px] text-white/60 group-hover:text-white/90 leading-tight">
                  {suggestion.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : analysis ? (
        <div className="px-3 py-3 text-center text-[10px] text-white/25 italic">
          No issues detected — this track fits well
        </div>
      ) : null}
    </div>
  );
};

export default AITrackSuggestions;
