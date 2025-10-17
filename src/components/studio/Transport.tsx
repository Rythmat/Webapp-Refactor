import { useState, useEffect } from "react";
import * as Tone from "tone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Rewind, Play, Pause, FastForward, Repeat, Timer, Circle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TransportProps = {
  isAudioReady: boolean;
  bpm: number;
  loopStart: number;
  loopEnd: number;
  onBpmChange: (bpm: number) => void;
  onLoopStartChange: (start: number) => void;
  onLoopEndChange: (end: number) => void;
  onPositionChange: () => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  isLooping: boolean;
  onLoopingChange: (looping: boolean) => void;
  canRecord: boolean;
  recordingGainDb: number;
  onRecordingGainDbChange: (db: number) => void;
  recordInLoopOnly: boolean;
  onRecordInLoopOnlyChange: (v: boolean) => void;

  // New: loop recording behavior
  loopRecordMode: "single" | "continuous";
  onLoopRecordModeChange: (mode: "single" | "continuous") => void;
  preRollOneLoop: boolean;
  onPreRollOneLoopChange: (v: boolean) => void;
};

const Transport = ({ 
  isAudioReady, 
  bpm, 
  loopStart, 
  loopEnd, 
  onBpmChange, 
  onLoopStartChange, 
  onLoopEndChange, 
  onPositionChange, 
  isRecording, 
  onToggleRecording,
  isLooping,
  onLoopingChange,
  canRecord,
  recordingGainDb,
  onRecordingGainDbChange,
  recordInLoopOnly,
  onRecordInLoopOnlyChange,
  loopRecordMode,
  onLoopRecordModeChange,
  preRollOneLoop,
  onPreRollOneLoopChange
}: TransportProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isAudioReady) return;
    Tone.Transport.bpm.value = bpm;
  }, [bpm, isAudioReady]);

  useEffect(() => {
    if (!isAudioReady) return;
    Tone.Transport.loopStart = `${loopStart}m`;
    Tone.Transport.loopEnd = `${loopEnd}m`;
  }, [loopStart, loopEnd, isAudioReady]);

  useEffect(() => {
    if (!isAudioReady) return;
    Tone.Transport.loop = isLooping;
  }, [isLooping, isAudioReady]);

  useEffect(() => {
    const onPlay = () => setIsPlaying(true);
    const onStop = () => setIsPlaying(false);
    const onPause = () => setIsPlaying(false);
    
    Tone.Transport.on("start", onPlay);
    Tone.Transport.on("stop", onStop);
    Tone.Transport.on("pause", onPause);

    return () => {
      Tone.Transport.off("start", onPlay);
      Tone.Transport.off("stop", onStop);
      Tone.Transport.off("pause", onPause);
    };
  }, []);

  const handlePlayPause = async () => {
    try {
      await Tone.start();
      if (Tone.Transport.state === "started") {
        Tone.Transport.pause();
      } else {
        Tone.Transport.start();
      }
    } catch (error) {
      console.error("Error with transport:", error);
    }
  };

  const handleRewind = () => {
    if (!isAudioReady) return;
    try {
      const currentSeconds = Tone.Transport.seconds;
      const fourMeasuresInSeconds = Tone.Time("4m").toSeconds();
      let newSeconds = currentSeconds - fourMeasuresInSeconds;

      const minSeconds = isLooping ? Tone.Time(`${loopStart}m`).toSeconds() : 0;
      
      if (newSeconds < minSeconds) {
        newSeconds = minSeconds;
      }
      
      Tone.Transport.seconds = newSeconds;
      onPositionChange();
    } catch (error) {
      console.error("Error rewinding:", error);
    }
  };

  const handleFastForward = () => {
    if (!isAudioReady) return;
    try {
      const currentSeconds = Tone.Transport.seconds;
      const fourMeasuresInSeconds = Tone.Time("4m").toSeconds();
      let newSeconds = currentSeconds + fourMeasuresInSeconds;

      if (isLooping) {
        const loopStartTime = Tone.Time(`${loopStart}m`).toSeconds();
        const loopEndTime = Tone.Time(`${loopEnd}m`).toSeconds();
        
        if (newSeconds >= loopEndTime) {
          const overflow = newSeconds - loopEndTime;
          newSeconds = loopStartTime + overflow;
          if (newSeconds >= loopEndTime) {
            newSeconds = loopStartTime;
          }
        }
      }
      
      Tone.Transport.seconds = newSeconds;
      onPositionChange();
    } catch (error) {
      console.error("Error fast forwarding:", error);
    }
  };
  
  const handleLoopToggle = () => {
    onLoopingChange(!isLooping);
  };

  const handleStop = () => {
    if (!isAudioReady) return;
    try {
      Tone.Transport.stop();
      const stopPosition = isLooping ? `${loopStart}m` : "0m";
      Tone.Transport.position = stopPosition;
      onPositionChange();
    } catch (error) {
      console.error("Error stopping:", error);
    }
  };

  return (
    <div className="bg-muted border-b border-border p-2 flex items-center justify-center space-x-4 flex-shrink-0 flex-wrap">
      <Button variant="ghost" size="icon" aria-label="Rewind" onClick={handleRewind} disabled={!isAudioReady}>
        <Rewind className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-12 w-12" aria-label="Play/Pause" onClick={handlePlayPause}>
        {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
      </Button>
      <Button variant="ghost" size="icon" aria-label="Stop" onClick={handleStop} disabled={!isAudioReady}>
        <div className="h-4 w-4 bg-current" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Fast Forward" onClick={handleFastForward} disabled={!isAudioReady}>
        <FastForward className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Record" onClick={onToggleRecording} disabled={!canRecord}>
        <Circle className={`h-6 w-6 transition-colors ${isRecording ? 'text-red-500 fill-current' : 'text-red-500'}`} />
      </Button>

      <div className="w-px h-8 bg-border mx-2"></div>
      
      <div className="flex items-center space-x-2">
        <Label htmlFor="bpm" className="text-sm">BPM</Label>
        <Input 
          id="bpm"
          type="number"
          value={bpm}
          onChange={(e) => onBpmChange(Math.max(20, Number(e.target.value)))}
          className="w-20"
          disabled={!isAudioReady}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Label htmlFor="loopStart" className="text-sm">Loop</Label>
        <Input 
          id="loopStart"
          type="number"
          value={loopStart}
          onChange={(e) => onLoopStartChange(Math.max(0, Number(e.target.value)))}
          className="w-16 text-center"
          min={0}
          disabled={!isAudioReady}
        />
        <span className="text-muted-foreground">-</span>
        <Input 
          id="loopEnd"
          type="number"
          value={loopEnd}
          onChange={(e) => onLoopEndChange(Math.max(loopStart + 1, Number(e.target.value)))}
          className="w-16 text-center"
          min={loopStart + 1}
          disabled={!isAudioReady}
        />
      </div>

      <Button variant={isLooping ? "default" : "outline"} size="icon" aria-label="Loop" onClick={handleLoopToggle} disabled={!isAudioReady}>
        <Repeat className="h-5 w-5" />
      </Button>

      <Button
        variant={recordInLoopOnly ? "default" : "outline"}
        size="sm"
        aria-label="Record only within loop"
        onClick={() => onRecordInLoopOnlyChange(!recordInLoopOnly)}
        disabled={!isAudioReady || !isLooping}
        title="Record only within loop region"
      >
        Rec Loop
      </Button>

      <Select
        value={loopRecordMode}
        onValueChange={(v) => onLoopRecordModeChange(v as "single" | "continuous")}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Loop Rec Mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="single">Loop Rec: Single pass</SelectItem>
          <SelectItem value="continuous">Loop Rec: Continuous</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant={preRollOneLoop ? "default" : "outline"}
        size="sm"
        aria-label="Pre-roll one loop"
        onClick={() => onPreRollOneLoopChange(!preRollOneLoop)}
        disabled={!isAudioReady || !isLooping || !recordInLoopOnly}
        title="Wait one full loop before starting recording"
      >
        Pre-roll 1x
      </Button>

      <Button variant="ghost" size="icon" aria-label="Metronome" disabled={!isAudioReady}>
        <Timer className="h-5 w-5" />
      </Button>

      <div className="w-px h-8 bg-border mx-2"></div>

      <div className="flex items-center space-x-2">
        <Label htmlFor="inputGain" className="text-sm">Input Gain</Label>
        <div className="w-40">
          <Slider
            value={[recordingGainDb]}
            min={-12}
            max={24}
            step={1}
            onValueChange={([val]: number[]) => onRecordingGainDbChange(val)}
            disabled={!isAudioReady || !canRecord}
          />
        </div>
        <span className="w-12 text-right text-xs text-muted-foreground">{recordingGainDb} dB</span>
      </div>
    </div>
  );
};

export default Transport;