import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wand2, Loader2 } from "lucide-react";
import { cn } from '@/lib/utils';
import type { Track } from '@/studio-daw/hooks/use-audio-engine';

export type InstrumentStemType = 'drums' | 'bass' | 'guitar' | 'keys' | 'strings' | 'brass' | 'pads' | 'vocals';

export interface StemGenerationParams {
  instruments: InstrumentStemType[];
  referenceTrackId?: string;
  styleGuidance?: string;
  duration: number;
  /** When set, search for a real sound effect sample instead of generating music */
  sfxQuery?: string;
}

interface GenerateStemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTracks: Track[];
  bpm: number;
  genre?: string;
  onGenerate: (params: StemGenerationParams) => Promise<void>;
  isGenerating: boolean;
  generatingProgress?: string;
}

const INSTRUMENTS: { type: InstrumentStemType; label: string; emoji: string }[] = [
  { type: 'drums', label: 'Drums', emoji: '🥁' },
  { type: 'bass', label: 'Bass', emoji: '🎸' },
  { type: 'guitar', label: 'Guitar', emoji: '🎵' },
  { type: 'keys', label: 'Keys', emoji: '🎹' },
  { type: 'strings', label: 'Strings', emoji: '🎻' },
  { type: 'brass', label: 'Brass', emoji: '🎺' },
  { type: 'pads', label: 'Pads', emoji: '🌊' },
  { type: 'vocals', label: 'Vocals', emoji: '🎤' },
];

const DURATION_OPTIONS = [30, 60, 120, 240];

type StemMode = 'instruments' | 'sfx';

const GenerateStemDialog: React.FC<GenerateStemDialogProps> = ({
  open,
  onOpenChange,
  existingTracks,
  onGenerate,
  isGenerating,
  generatingProgress,
}) => {
  const [mode, setMode] = useState<StemMode>('instruments');
  const [selected, setSelected] = useState<Set<InstrumentStemType>>(new Set(['drums', 'bass']));
  const [referenceTrackId, setReferenceTrackId] = useState<string>('');
  const [styleGuidance, setStyleGuidance] = useState('');
  const [duration, setDuration] = useState(30);
  const [sfxQuery, setSfxQuery] = useState('');

  const audioTracks = existingTracks.filter(t => t.clips.some(c => c.buffer) && t.type !== 'reference');

  const toggleInstrument = (type: InstrumentStemType) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const canGenerate = mode === 'sfx' ? sfxQuery.trim().length > 0 : selected.size > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    await onGenerate({
      instruments: mode === 'instruments' ? Array.from(selected) : [],
      referenceTrackId: referenceTrackId || undefined,
      styleGuidance: styleGuidance.trim() || undefined,
      duration,
      sfxQuery: mode === 'sfx' ? sfxQuery.trim() : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={isGenerating ? undefined : onOpenChange}>
      <DialogContent className="bg-[#1e1e1e] border-[#444] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-bold flex items-center gap-2">
            <Wand2 size={16} className="text-purple-400" />
            Generate AI Stems
          </DialogTitle>
          <DialogDescription className="text-white/40 text-xs">
            Generate instrument tracks or find real sound effects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode toggle */}
          <div className="flex gap-1 p-0.5 bg-white/5 border border-white/10 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('instruments')}
              disabled={isGenerating}
              className={cn(
                "flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all",
                mode === 'instruments'
                  ? "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                  : "text-white/40 hover:text-white/60 border border-transparent"
              )}
            >
              Instruments
            </button>
            <button
              type="button"
              onClick={() => setMode('sfx')}
              disabled={isGenerating}
              className={cn(
                "flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all",
                mode === 'sfx'
                  ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                  : "text-white/40 hover:text-white/60 border border-transparent"
              )}
            >
              Sound Effects
            </button>
          </div>

          {mode === 'instruments' ? (
            <>
              {/* Multi-select instrument picker */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                  Instruments ({selected.size} selected)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {INSTRUMENTS.map(({ type, label, emoji }) => (
                    <button
                      key={type}
                      onClick={() => toggleInstrument(type)}
                      disabled={isGenerating}
                      className={cn(
                        "flex flex-col items-center gap-0.5 px-2 py-2 rounded-md border transition-all",
                        selected.has(type)
                          ? "border-purple-500/60 bg-purple-500/15 text-white"
                          : "border-white/10 bg-white/[0.02] text-white/50 hover:bg-white/5"
                      )}
                    >
                      <span className="text-[16px]">{emoji}</span>
                      <span className="text-[9px] font-semibold">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference track */}
              {audioTracks.length > 0 && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                    Style Reference (optional)
                  </label>
                  <select
                    value={referenceTrackId}
                    onChange={e => setReferenceTrackId(e.target.value)}
                    disabled={isGenerating}
                    className="w-full h-8 px-2 bg-[#111] border border-white/10 rounded-md text-[11px] text-white/70 focus:outline-none focus:border-purple-500/40"
                  >
                    <option value="">None — generate freely</option>
                    {audioTracks.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Duration */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                  Duration
                </label>
                <div className="flex gap-1.5">
                  {DURATION_OPTIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      disabled={isGenerating}
                      className={cn(
                        "flex-1 h-7 rounded-md border text-[10px] font-semibold transition-all",
                        duration === d
                          ? "border-purple-500/60 bg-purple-500/15 text-white"
                          : "border-white/10 bg-white/[0.02] text-white/40 hover:bg-white/5"
                      )}
                    >
                      {d >= 60 ? `${d / 60}m` : `${d}s`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style guidance */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                  Style Guidance (optional)
                </label>
                <textarea
                  value={styleGuidance}
                  onChange={e => setStyleGuidance(e.target.value)}
                  disabled={isGenerating}
                  placeholder="e.g. jazzy brushes, funky slap bass, ambient pads..."
                  className="w-full h-16 px-2 py-1.5 bg-[#111] border border-white/10 rounded-md text-[11px] text-white/70 placeholder:text-white/20 resize-none focus:outline-none focus:border-purple-500/40"
                />
              </div>
            </>
          ) : (
            /* SFX mode */
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                Describe the sound effect
              </label>
              <textarea
                value={sfxQuery}
                onChange={e => setSfxQuery(e.target.value)}
                disabled={isGenerating}
                placeholder="e.g. ocean waves, thunder, birds chirping, rain on a window, crowd cheering..."
                className="w-full h-20 px-2 py-1.5 bg-[#111] border border-white/10 rounded-md text-[11px] text-white/70 placeholder:text-white/20 resize-none focus:outline-none focus:border-emerald-500/40"
                autoFocus
              />
              <p className="text-[10px] text-white/25 mt-1 ml-0.5">
                Searches real sound effect recordings from Freesound.
              </p>
            </div>
          )}

          {/* Progress */}
          {isGenerating && generatingProgress && (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-md">
              <Loader2 size={14} className="animate-spin text-purple-400" />
              <span className="text-[11px] text-purple-300">{generatingProgress}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="text-white/40 hover:text-white/70"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerate}
            className={cn(
              "text-white",
              mode === 'sfx'
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-purple-600 hover:bg-purple-500"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1" />
                {mode === 'sfx' ? 'Searching...' : 'Generating...'}
              </>
            ) : mode === 'sfx' ? (
              <>
                <Wand2 size={14} className="mr-1" />
                Find Sound Effect
              </>
            ) : (
              <>
                <Wand2 size={14} className="mr-1" />
                Generate {selected.size} Stem{selected.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateStemDialog;
