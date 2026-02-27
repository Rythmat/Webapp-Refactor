import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, ShieldCheck, Music2 } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Project Sources
          </DialogTitle>
          <DialogDescription className="space-y-4 pt-2">
            <p>
              Your DAW curates sounds from multiple CC0 sources using AI.
            </p>
            <div className="bg-secondary/50 p-4 rounded-xl space-y-3 text-sm border border-border">
              <p className="font-semibold flex items-center gap-2">
                <Music2 className="w-4 h-4" /> Sound Sources:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><code>OPENAI_API_KEY</code> &mdash; AI curation (Required)</li>
                <li><code>FREESOUND_API_KEY</code> &mdash; Freesound.org CC samples (Required)</li>
                <li><code>PIXABAY_API_KEY</code> &mdash; Pixabay Music CC0 tracks (Optional)</li>
                <li><strong>Internet Archive</strong> &mdash; CC-licensed audio (No key needed, always active)</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              The more sources you enable, the larger the pool of free samples the AI can draw from.
            </p>
            <p className="text-xs">
              Set these keys in the Music Atlas API environment to enable AI generation sources.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2">
          <Button className="w-full rounded-xl" onClick={() => window.open('/docs', '_blank')}>
            Open API Docs <ExternalLink className="ml-2 w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
