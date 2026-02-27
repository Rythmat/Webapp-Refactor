import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Piano, ShieldAlert, RefreshCw } from "lucide-react";
import { cn } from '@/lib/utils';
import type { AudioDeviceInfo, AudioPermissionState } from '@/studio-daw/hooks/use-audio-recording';
import type { MidiDeviceInfo } from '@/studio-daw/hooks/use-midi-input';
import { GM_INSTRUMENTS } from '@/studio-daw/audio/midi-engine';

interface DeviceSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Audio devices
  audioDevices: AudioDeviceInfo[];
  selectedAudioDeviceId: string | null;
  onSelectAudioDevice: (id: string) => void;
  audioPermissionState: AudioPermissionState;
  onRequestAudioPermission: () => Promise<boolean>;
  inputLevel: number;

  // MIDI devices
  isMidiSupported: boolean;
  midiDevices: MidiDeviceInfo[];
  selectedMidiDeviceId: string | null;
  onSelectMidiDevice: (id: string | null) => void;

  // MIDI instrument
  midiProgram: number;
  onMidiProgramChange: (program: number) => void;

  // Metronome / count-in settings
  countInBars: number;
  onCountInBarsChange: (bars: number) => void;
  metronomeEnabled: boolean;
  onMetronomeEnabledChange: (enabled: boolean) => void;
  metronomeVolume: number;
  onMetronomeVolumeChange: (volume: number) => void;
  loopWhileRecording: boolean;
  onLoopWhileRecordingChange: (enabled: boolean) => void;
}

const DeviceSelectDialog: React.FC<DeviceSelectDialogProps> = ({
  open,
  onOpenChange,
  audioDevices,
  selectedAudioDeviceId,
  onSelectAudioDevice,
  audioPermissionState,
  onRequestAudioPermission,
  inputLevel,
  isMidiSupported,
  midiDevices,
  selectedMidiDeviceId,
  onSelectMidiDevice,
  midiProgram,
  onMidiProgramChange,
  countInBars,
  onCountInBarsChange,
  metronomeEnabled,
  onMetronomeEnabledChange,
  metronomeVolume,
  onMetronomeVolumeChange,
  loopWhileRecording,
  onLoopWhileRecordingChange,
}) => {

  const getLevelColor = (level: number) => {
    if (level >= 0.9) return 'bg-red-500';
    if (level >= 0.7) return 'bg-yellow-500';
    return 'bg-[#7EC850]';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-[#1e1e1e] border-[#444] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Mic className="w-4 h-4 text-[#FF4444]" />
            Recording Settings
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Configure audio and MIDI input devices, metronome, and count-in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Audio Input Section */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 block">
              Audio Input
            </label>

            {audioPermissionState === 'unavailable' ? (
              <div className="flex items-center gap-2 p-3 bg-[#332211] border border-[#664422] rounded-md">
                <ShieldAlert className="w-4 h-4 text-[#ff6a14] flex-shrink-0" />
                <p className="text-[11px] text-white/60">
                  Microphone access is not available. Make sure you're using HTTPS.
                </p>
              </div>
            ) : audioPermissionState === 'denied' ? (
              <div className="flex items-center gap-2 p-3 bg-[#331111] border border-[#662222] rounded-md">
                <ShieldAlert className="w-4 h-4 text-[#FF4444] flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[11px] text-white/60">
                    Microphone access was denied. Please allow it in your browser's site settings, then refresh.
                  </p>
                </div>
              </div>
            ) : audioPermissionState === 'prompt' ? (
              <Button
                onClick={onRequestAudioPermission}
                className="w-full bg-[#5B8DEF] hover:bg-[#5B8DEF]/90 text-white text-xs"
              >
                <Mic className="w-3.5 h-3.5 mr-1.5" />
                Grant Microphone Access
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedAudioDeviceId || ''}
                    onChange={(e) => onSelectAudioDevice(e.target.value)}
                    className="flex-1 h-8 px-2 bg-[#111] border border-[#444] rounded text-xs text-white focus:outline-none focus:border-[#FF4444]"
                  >
                    {audioDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                    {audioDevices.length === 0 && (
                      <option value="" disabled>No audio input devices found</option>
                    )}
                  </select>

                  {/* Level indicator */}
                  <div className="w-2 h-6 bg-[#222] rounded-full overflow-hidden flex flex-col-reverse flex-shrink-0">
                    <div
                      className={cn("w-full transition-all duration-75 rounded-full", getLevelColor(inputLevel))}
                      style={{ height: `${Math.min(100, inputLevel * 100)}%` }}
                    />
                  </div>
                </div>
                {audioDevices.length > 0 && (
                  <p className="text-[9px] text-white/25">
                    {audioDevices.length} device{audioDevices.length !== 1 ? 's' : ''} detected. USB devices are auto-detected when connected.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* MIDI Input Section */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 block">
              MIDI Input
            </label>

            {!isMidiSupported ? (
              <div className="flex items-center gap-2 p-3 bg-[#222] border border-[#333] rounded-md">
                <Piano className="w-4 h-4 text-white/30 flex-shrink-0" />
                <p className="text-[11px] text-white/40">
                  Web MIDI is not supported in this browser. Use Chrome or Edge for MIDI input.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedMidiDeviceId || ''}
                  onChange={(e) => onSelectMidiDevice(e.target.value || null)}
                  className="w-full h-8 px-2 bg-[#111] border border-[#444] rounded text-xs text-white focus:outline-none focus:border-[#A675E2]"
                >
                  <option value="">None</option>
                  {midiDevices.filter(d => d.state === 'connected').map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.manufacturer !== 'Unknown' ? `(${d.manufacturer})` : ''}
                    </option>
                  ))}
                </select>
                {midiDevices.filter(d => d.state === 'connected').length === 0 && (
                  <p className="text-[9px] text-white/25">
                    No MIDI devices connected. Plug in a MIDI controller to see it here.
                  </p>
                )}

                {/* MIDI Instrument */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1 block">
                    MIDI Instrument
                  </label>
                  <select
                    value={midiProgram}
                    onChange={(e) => onMidiProgramChange(parseInt(e.target.value))}
                    className="w-full h-8 px-2 bg-[#111] border border-[#444] rounded text-xs text-white focus:outline-none focus:border-[#A675E2]"
                  >
                    {(() => {
                      const categories = new Map<string, typeof GM_INSTRUMENTS>();
                      for (const inst of GM_INSTRUMENTS) {
                        if (!categories.has(inst.category)) categories.set(inst.category, []);
                        categories.get(inst.category)!.push(inst);
                      }
                      return Array.from(categories.entries()).map(([cat, instruments]) => (
                        <optgroup key={cat} label={cat}>
                          {instruments.map(inst => (
                            <option key={inst.id} value={inst.id}>
                              {inst.name}
                            </option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Metronome & Count-in */}
          <div className="space-y-3 pt-2 border-t border-[#333]">
            {/* Count-in bars */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                Count-in Bars
              </label>
              <div className="flex gap-1">
                {[0, 1, 2, 4].map((bars) => (
                  <button
                    key={bars}
                    onClick={() => onCountInBarsChange(bars)}
                    className={cn(
                      "flex-1 py-1.5 rounded text-[10px] font-semibold border transition-all",
                      countInBars === bars
                        ? "bg-[#FF4444]/20 border-[#FF4444] text-[#FF4444]"
                        : "bg-[#111] border-[#444] text-white/40 hover:text-white/60",
                    )}
                  >
                    {bars === 0 ? 'Off' : `${bars} bar${bars > 1 ? 's' : ''}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Metronome toggle */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                Metronome During Recording
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => onMetronomeEnabledChange(true)}
                  className={cn(
                    "flex-1 py-1.5 rounded text-[10px] font-semibold border transition-all",
                    metronomeEnabled
                      ? "bg-[#ff6a14]/20 border-[#ff6a14] text-[#ff6a14]"
                      : "bg-[#111] border-[#444] text-white/40 hover:text-white/60",
                  )}
                >
                  On
                </button>
                <button
                  onClick={() => onMetronomeEnabledChange(false)}
                  className={cn(
                    "flex-1 py-1.5 rounded text-[10px] font-semibold border transition-all",
                    !metronomeEnabled
                      ? "bg-[#555]/40 border-[#555] text-white/70"
                      : "bg-[#111] border-[#444] text-white/40 hover:text-white/60",
                  )}
                >
                  Off
                </button>
              </div>
            </div>

            {/* Metronome volume */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                Metronome Volume: {Math.round(metronomeVolume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={metronomeVolume}
                onChange={(e) => onMetronomeVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#ff6a14] [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>

            {/* Loop while recording */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                Loop While Recording
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => onLoopWhileRecordingChange(true)}
                  className={cn(
                    "flex-1 py-1.5 rounded text-[10px] font-semibold border transition-all",
                    loopWhileRecording
                      ? "bg-[#5B8DEF]/20 border-[#5B8DEF] text-[#5B8DEF]"
                      : "bg-[#111] border-[#444] text-white/40 hover:text-white/60",
                  )}
                >
                  On
                </button>
                <button
                  onClick={() => onLoopWhileRecordingChange(false)}
                  className={cn(
                    "flex-1 py-1.5 rounded text-[10px] font-semibold border transition-all",
                    !loopWhileRecording
                      ? "bg-[#555]/40 border-[#555] text-white/70"
                      : "bg-[#111] border-[#444] text-white/40 hover:text-white/60",
                  )}
                >
                  Off
                </button>
              </div>
              <p className="text-[9px] text-white/25 mt-1">
                Loop existing tracks during recording so you can layer parts.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceSelectDialog;
