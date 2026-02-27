import React from 'react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Trash2 } from "lucide-react";
import { Track } from "@/studio-daw/hooks/use-audio-engine";

interface TrackCardProps {
  track: Track;
  onUpdate: (id: string, updates: Partial<Track>) => void;
  onDelete: (id: string) => void;
}

const TrackCard: React.FC<TrackCardProps> = ({ track, onUpdate, onDelete }) => {
  return (
    <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl border border-border/50 backdrop-blur-sm">
      <div className="flex-1">
        <h3 className="text-sm font-medium mb-2">{track.name}</h3>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onUpdate(track.id, { muted: !track.muted })}
            className={track.muted ? "text-destructive" : "text-primary"}
          >
            {track.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </Button>
          <Slider
            value={[track.volume * 100]}
            max={100}
            step={1}
            onValueChange={(vals) => onUpdate(track.id, { volume: vals[0] / 100 })}
            className="w-32"
          />
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(track.id)}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 size={18} />
      </Button>
    </div>
  );
};

export default TrackCard;