import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Check, AlertCircle } from "lucide-react";
import type { Track } from '@/studio-daw/hooks/use-audio-engine';

export interface ExtendableTrack {
  trackId: string;
  trackName: string;
  clipId: string;
  clipDuration: number;
  color: string;
}

export interface ExtendAllResult {
  trackIds: string[];
  targetDuration: number;
  prompt: string;
}

type TrackStatus = 'pending' | 'uploading' | 'extending' | 'done' | 'failed';

interface ExtendAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracks: Track[];
  onExtend: (
    result: ExtendAllResult,
    onTrackProgress: (trackId: string, status: TrackStatus) => void
  ) => Promise<{ succeeded: number; failed: number }>;
}

const ExtendAllDialog: React.FC<ExtendAllDialogProps> = ({
  open,
  onOpenChange,
  tracks,
  onExtend,
}) => {
  // Find extendable tracks: non-MIDI with a buffer on the first clip
  const extendable: ExtendableTrack[] = tracks
    .filter(t => t.type !== 'midi' && t.clips.length > 0 && t.clips[0].buffer)
    .map(t => ({
      trackId: t.id,
      trackName: t.name,
      clipId: t.clips[0].id,
      clipDuration: t.clips[0].duration,
      color: t.color,
    }));

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetDuration, setTargetDuration] = useState(60);
  const [prompt, setPrompt] = useState('');
  const [isExtending, setIsExtending] = useState(false);
  const [trackStatuses, setTrackStatuses] = useState<Record<string, TrackStatus>>({});

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setSelected(new Set(extendable.map(t => t.trackId)));
      setPrompt('');
      setIsExtending(false);
      setTrackStatuses({});
      // Default target: shortest clip + 30s, rounded to nearest option
      const shortest = Math.min(...extendable.map(t => t.clipDuration), 30);
      const opts = [30, 60, 90, 120, 180, 240].filter(d => d > shortest);
      setTargetDuration(opts[0] || 60);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTrack = (trackId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === extendable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(extendable.map(t => t.trackId)));
    }
  };

  const handleExtend = async () => {
    if (selected.size === 0) return;
    setIsExtending(true);

    // Initialize all selected tracks as pending
    const initial: Record<string, TrackStatus> = {};
    selected.forEach(id => { initial[id] = 'pending'; });
    setTrackStatuses(initial);

    await onExtend(
      {
        trackIds: Array.from(selected),
        targetDuration,
        prompt,
      },
      (trackId, status) => {
        setTrackStatuses(prev => ({ ...prev, [trackId]: status }));
      }
    );

    // Keep dialog open briefly to show results, then close
    setTimeout(() => {
      setIsExtending(false);
      onOpenChange(false);
    }, 1500);
  };

  const formatDuration = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  };

  // Filter duration options to > shortest selected clip
  const shortestSelected = extendable
    .filter(t => selected.has(t.trackId))
    .reduce((min, t) => Math.min(min, t.clipDuration), Infinity);
  const durationOptions = [30, 60, 90, 120, 180, 240].filter(d => d > (isFinite(shortestSelected) ? shortestSelected : 0));

  const statusIcon = (status: TrackStatus) => {
    switch (status) {
      case 'pending': return <div className="w-3 h-3 rounded-full border border-white/20" />;
      case 'uploading': return <Loader2 size={12} className="animate-spin text-yellow-400" />;
      case 'extending': return <Loader2 size={12} className="animate-spin text-green-400" />;
      case 'done': return <Check size={12} className="text-green-400" />;
      case 'failed': return <AlertCircle size={12} className="text-red-400" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1e1e1e] border-[#444] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-bold flex items-center gap-2">
            <ArrowRight size={16} className="text-green-400" />
            Extend / Continue Tracks
          </DialogTitle>
          <DialogDescription className="text-white/40 text-xs">
            Select tracks to extend using AI continuation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {extendable.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-4">No extendable audio tracks found.</p>
          ) : (
            <>
              {/* Select All / Deselect All */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
                  Tracks ({selected.size}/{extendable.length})
                </span>
                <button
                  type="button"
                  onClick={toggleAll}
                  disabled={isExtending}
                  className="text-[10px] text-white/40 hover:text-white/60 transition-colors"
                >
                  {selected.size === extendable.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Track list */}
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {extendable.map(track => {
                  const isSelected = selected.has(track.trackId);
                  const status = trackStatuses[track.trackId];

                  return (
                    <label
                      key={track.trackId}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                        isSelected ? 'bg-white/5 border border-white/10' : 'border border-transparent hover:bg-white/[0.03]'
                      } ${isExtending ? 'pointer-events-none' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTrack(track.trackId)}
                        disabled={isExtending}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'bg-green-500/30 border-green-400' : 'border-white/20'
                      }`}>
                        {isSelected && <Check size={10} className="text-green-400" />}
                      </div>
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: track.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{track.trackName}</p>
                      </div>
                      <span className="text-xs text-white/30 flex-shrink-0">
                        {formatDuration(track.clipDuration)}
                      </span>
                      {status && (
                        <span className="flex-shrink-0">{statusIcon(status)}</span>
                      )}
                    </label>
                  );
                })}
              </div>

              {/* Target Duration */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                  Target Duration
                </label>
                <select
                  value={targetDuration}
                  onChange={(e) => setTargetDuration(parseInt(e.target.value))}
                  disabled={isExtending}
                  className="w-full px-3 py-2 bg-[#111] border border-[#444] rounded-md text-sm text-white focus:outline-none focus:border-green-500/50"
                >
                  {durationOptions.map(d => (
                    <option key={d} value={d}>{formatDuration(d)}</option>
                  ))}
                </select>
              </div>

              {/* Style Guidance */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                  Style Guidance (optional)
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. continue with more energy, add strings..."
                  rows={2}
                  disabled={isExtending}
                  className="w-full px-3 py-2 bg-[#111] border border-[#444] rounded-md text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-colors resize-none"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExtending}
            className="border-[#444] text-white/60 hover:text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExtend}
            disabled={isExtending || selected.size === 0 || extendable.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isExtending ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Extending...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ArrowRight size={14} />
                Extend {selected.size} Track{selected.size !== 1 ? 's' : ''}
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExtendAllDialog;
