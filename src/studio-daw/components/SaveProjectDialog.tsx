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
import { Save } from "lucide-react";

interface SaveProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  onSave: (name: string) => void;
}

const SaveProjectDialog: React.FC<SaveProjectDialogProps> = ({ open, onOpenChange, defaultName, onSave }) => {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (open) {
      setName(defaultName);
    }
  }, [open, defaultName]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-[#1e1e1e] border-[#444] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Save className="w-4 h-4 text-[#ff6a14]" />
            Save Project
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Give your project a name to save it to your account.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
            Project Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="My Zen Meditation"
            autoFocus
            className="w-full h-9 px-3 bg-[#111] border border-[#444] rounded-md text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff6a14] focus:ring-1 focus:ring-[#ff6a14]/30 transition-colors"
          />
        </div>
        <DialogFooter className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/50 hover:text-white hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="bg-[#ff6a14] hover:bg-[#ff6a14]/90 text-white"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveProjectDialog;
