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
import { Layers, Loader2, Mic, Drum, Guitar, Music2 } from "lucide-react";
import { cn } from '@/lib/utils';
import type { StemType } from '@/studio-daw/services/stem-separation';

interface StemSeparationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clipName: string;
  onSeparate: (selectedStems: StemType[]) => Promise<void>;
}

const STEM_OPTIONS: { type: StemType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'vocals', label: 'Vocals', icon: <Mic size={14} />, color: '#ff6b6b' },
  { type: 'drums', label: 'Drums', icon: <Drum size={14} />, color: '#ffa94d' },
  { type: 'bass', label: 'Bass', icon: <Guitar size={14} />, color: '#69db7c' },
  { type: 'other', label: 'Other', icon: <Music2 size={14} />, color: '#748ffc' },
];

const StemSeparationDialog: React.FC<StemSeparationDialogProps> = ({
  open,
  onOpenChange,
  clipName,
  onSeparate,
}) => {
  const [selected, setSelected] = useState<Set<StemType>>(new Set(['vocals', 'drums', 'bass', 'other']));
  const [isSeparating, setIsSeparating] = useState(false);
  const [progress, setProgress] = useState('');

  const toggleStem = (stem: StemType) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(stem)) next.delete(stem);
      else next.add(stem);
      return next;
    });
  };

  const handleSeparate = async () => {
    if (selected.size === 0) return;
    setIsSeparating(true);
    setProgress('Starting...');
    try {
      await onSeparate(Array.from(selected));
      onOpenChange(false);
    } catch (err) {
      console.error('[StemSeparation] Failed:', err);
      setProgress('Failed — please try again');
    } finally {
      setIsSeparating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isSeparating ? undefined : onOpenChange}>
      <DialogContent className="bg-[#1e1e1e] border-[#444] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-bold flex items-center gap-2">
            <Layers size={16} className="text-blue-400" />
            Separate Stems
          </DialogTitle>
          <DialogDescription className="text-white/40 text-xs">
            Split "{clipName}" into individual instrument stems using AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            {STEM_OPTIONS.map(({ type, label, icon, color }) => (
              <button
                key={type}
                onClick={() => !isSeparating && toggleStem(type)}
                disabled={isSeparating}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-md border transition-all text-left",
                  selected.has(type)
                    ? "border-white/30 bg-white/10"
                    : "border-white/10 bg-white/[0.02] opacity-40"
                )}
              >
                <span style={{ color }}>{icon}</span>
                <span className="text-[12px] font-semibold text-white/80">{label}</span>
              </button>
            ))}
          </div>

          {isSeparating && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <Loader2 size={14} className="animate-spin text-blue-400" />
              <span className="text-[11px] text-blue-300">{progress}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSeparating}
            className="text-white/40 hover:text-white/70"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSeparate}
            disabled={isSeparating || selected.size === 0}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            {isSeparating ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1" />
                Separating...
              </>
            ) : (
              <>
                <Layers size={14} className="mr-1" />
                Separate {selected.size} Stems
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StemSeparationDialog;
