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
import { ArrowRight, Loader2 } from "lucide-react";

interface ExtendClipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clipName: string;
  clipDuration: number;
  onExtend: (targetDuration: number, prompt: string) => Promise<void>;
}

const ExtendClipDialog: React.FC<ExtendClipDialogProps> = ({
  open,
  onOpenChange,
  clipName,
  clipDuration,
  onExtend,
}) => {
  const [targetDuration, setTargetDuration] = useState(Math.ceil(clipDuration) + 30);
  const [prompt, setPrompt] = useState('');
  const [isExtending, setIsExtending] = useState(false);

  const handleExtend = async () => {
    setIsExtending(true);
    try {
      await onExtend(targetDuration, prompt);
      onOpenChange(false);
    } catch (err) {
      console.error('[ExtendClip] Failed:', err);
    } finally {
      setIsExtending(false);
    }
  };

  const formatDuration = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1e1e1e] border-[#444] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-bold flex items-center gap-2">
            <ArrowRight size={16} className="text-green-400" />
            Extend / Continue Clip
          </DialogTitle>
          <DialogDescription className="text-white/40 text-xs">
            Generate a continuation of this audio clip using AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 px-3 py-2 bg-white/5 border border-white/10 rounded-md">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{clipName}</p>
              <p className="text-xs text-white/40">Current: {formatDuration(clipDuration)}</p>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
              Target Duration
            </label>
            <select
              value={targetDuration}
              onChange={(e) => setTargetDuration(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-[#111] border border-[#444] rounded-md text-sm text-white focus:outline-none focus:border-green-500/50"
            >
              {[30, 60, 90, 120, 180, 240].filter(d => d > clipDuration).map(d => (
                <option key={d} value={d}>{formatDuration(d)} (+{formatDuration(d - clipDuration)})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
              Style Guidance (optional)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. continue with more energy, add strings..."
              rows={2}
              className="w-full px-3 py-2 bg-[#111] border border-[#444] rounded-md text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-colors resize-none"
            />
          </div>
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
            disabled={isExtending}
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
                Extend Clip
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExtendClipDialog;
