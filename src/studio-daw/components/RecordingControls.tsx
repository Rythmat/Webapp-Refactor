import React from 'react';
import { Circle, Mic, Piano, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecordingState, RecordingMode, RecordingSettings } from '@/studio-daw/hooks/use-recording';
import type { AudioPermissionState } from '@/studio-daw/hooks/use-audio-recording';

interface RecordingControlsProps {
  recordingState: RecordingState;
  recordingMode: RecordingMode;
  recordingDuration: number;
  inputLevel: number;
  settings: RecordingSettings;
  onUpdateSettings: (updates: Partial<RecordingSettings>) => void;
  onArm: () => void;
  onStop: () => void;
  onCancel: () => void;
  onOpenDeviceDialog: () => void;
  audioPermissionState: AudioPermissionState;
  isMidiSupported: boolean;
  hasAudioDevices: boolean;
  hasMidiDevices: boolean;
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
};

const RecordingControls: React.FC<RecordingControlsProps> = ({
  recordingState,
  recordingMode,
  recordingDuration,
  inputLevel,
  settings,
  onUpdateSettings,
  onArm,
  onStop,
  onCancel,
  onOpenDeviceDialog,
  isMidiSupported,
}) => {
  const isIdle = recordingState === 'idle';
  const isCountingIn = recordingState === 'counting-in';
  const isRecording = recordingState === 'recording';

  const handleRecordClick = () => {
    if (isIdle) {
      onArm();
    } else {
      onStop();
    }
  };

  // Level meter color
  const getLevelColor = (level: number) => {
    if (level >= 0.9) return 'bg-red-500';
    if (level >= 0.7) return 'bg-yellow-500';
    return 'bg-[#7EC850]';
  };

  return (
    <div className="flex items-center gap-0.5 px-1">
      {/* Record button */}
      <button
        onClick={handleRecordClick}
        className={cn(
          "w-7 h-7 flex items-center justify-center rounded-sm transition-all",
          isIdle && "bg-[#333] text-[#FF4444]/60 hover:bg-[#444] hover:text-[#FF4444]",
          isCountingIn && "bg-[#FF4444]/30 text-[#FF4444] animate-pulse",
          isRecording && "bg-[#FF4444] text-white",
        )}
        title={isIdle ? "Record" : isRecording ? "Stop Recording" : "Counting in..."}
      >
        <Circle size={10} className={cn("fill-current", isRecording && "animate-pulse")} />
      </button>

      {/* Mode toggle (Audio / MIDI) */}
      {isIdle && (
        <div className="flex items-center h-5 bg-[#222] rounded-sm overflow-hidden border border-[#333]">
          <button
            onClick={() => onUpdateSettings({ mode: 'audio' })}
            className={cn(
              "px-1.5 h-full flex items-center justify-center transition-colors",
              recordingMode === 'audio'
                ? "bg-[#444] text-white"
                : "text-white/30 hover:text-white/50",
            )}
            title="Record Audio"
          >
            <Mic size={9} />
          </button>
          <button
            onClick={() => onUpdateSettings({ mode: 'midi' })}
            className={cn(
              "px-1.5 h-full flex items-center justify-center transition-colors",
              recordingMode === 'midi'
                ? "bg-[#444] text-white"
                : "text-white/30 hover:text-white/50",
              !isMidiSupported && "opacity-30 cursor-not-allowed",
            )}
            title={isMidiSupported ? "Record MIDI" : "Web MIDI not supported in this browser"}
            disabled={!isMidiSupported}
          >
            <Piano size={9} />
          </button>
        </div>
      )}

      {/* Input level meter (audio mode, when recording or counting-in) */}
      {recordingMode === 'audio' && !isIdle && (
        <div className="flex items-center gap-1 mx-0.5">
          <div className="w-1 h-5 bg-[#222] rounded-full overflow-hidden flex flex-col-reverse">
            <div
              className={cn("w-full transition-all duration-75 rounded-full", getLevelColor(inputLevel))}
              style={{ height: `${Math.min(100, inputLevel * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Recording duration */}
      {!isIdle && (
        <div className="flex items-center bg-[#111] border border-[#FF4444]/30 rounded-sm px-1.5 h-5 mx-0.5">
          <span className={cn(
            "text-[10px] font-mono leading-none",
            isRecording ? "text-[#FF4444]" : "text-[#FF4444]/60 animate-pulse",
          )}>
            {isCountingIn ? 'COUNT-IN' : formatDuration(recordingDuration)}
          </span>
        </div>
      )}

      {/* Metronome quick toggle */}
      {isIdle && (
        <button
          onClick={() => onUpdateSettings({ metronomeEnabled: !settings.metronomeEnabled })}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded-sm text-[9px] font-bold transition-colors",
            settings.metronomeEnabled
              ? "bg-[#444] text-[#ff6a14]"
              : "text-white/20 hover:text-white/40",
          )}
          title={`Metronome ${settings.metronomeEnabled ? 'ON' : 'OFF'}`}
        >
          M
        </button>
      )}

      {/* Cancel button (during recording) */}
      {!isIdle && (
        <button
          onClick={onCancel}
          className="h-5 px-1.5 flex items-center justify-center rounded-sm text-[9px] font-semibold text-white/30 hover:text-white/60 hover:bg-[#333] transition-colors"
          title="Cancel Recording"
        >
          ESC
        </button>
      )}

      {/* Settings gear */}
      {isIdle && (
        <button
          onClick={onOpenDeviceDialog}
          className="w-5 h-5 flex items-center justify-center rounded-sm text-white/20 hover:text-white/50 transition-colors"
          title="Recording Settings"
        >
          <Settings2 size={9} />
        </button>
      )}
    </div>
  );
};

export default RecordingControls;
