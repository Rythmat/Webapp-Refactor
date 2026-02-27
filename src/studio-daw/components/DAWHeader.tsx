import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Download, Plus, Settings, Save, FolderOpen, Trash2, LogOut, Repeat, ArrowRight, Share2, Loader2, Wand2, SlidersHorizontal, Disc } from "lucide-react";
import { Button } from "@/components/ui/button";
import SettingsDialog from './SettingsDialog';
import RecordingControls from './RecordingControls';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { TransportState } from '@/studio-daw/hooks/use-audio-engine';
import type { RecordingState, RecordingMode, RecordingSettings } from '@/studio-daw/hooks/use-recording';
import type { AudioPermissionState } from '@/studio-daw/hooks/use-audio-recording';
import { cn } from '@/lib/utils';

interface DAWHeaderProps {
  transportState: TransportState;
  currentTime: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeekForward: () => void;
  onSeekBackward: () => void;
  onExport: (type: 'wav' | 'zip') => void;
  onGenerate: () => void;
  onSave: () => void;
  savedProjects: any[];
  onLoadProject: (project: any) => void;
  onDeleteProject: (id: string) => void;
  onLogout?: () => void;
  bpm?: number;
  onBPMChange?: (bpm: number) => void;
  // Recording
  recordingState?: RecordingState;
  recordingMode?: RecordingMode;
  recordingDuration?: number;
  inputLevel?: number;
  recordingSettings?: RecordingSettings;
  onUpdateRecordingSettings?: (updates: Partial<RecordingSettings>) => void;
  onArmRecording?: () => void;
  onStopRecording?: () => void;
  onCancelRecording?: () => void;
  onOpenDeviceDialog?: () => void;
  audioPermissionState?: AudioPermissionState;
  isMidiSupported?: boolean;
  hasAudioDevices?: boolean;
  hasMidiDevices?: boolean;
  // Loop
  loopEnabled?: boolean;
  onToggleLoop?: () => void;
  loopStart?: number;
  loopEnd?: number;
  onSetLoopRegion?: (start: number, end: number) => void;
  // Extend all
  onExtendAll?: () => void;
  // Share
  onShare?: () => void;
  isSharing?: boolean;
  // AI features
  onGenerateStem?: () => void;
  onAutoMix?: () => void;
  onAutoMaster?: () => void;
  // Total song duration (seconds)
  totalDuration?: number;
}

/** Formats seconds to MM:SS:ms display */
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

const DAWHeader: React.FC<DAWHeaderProps> = ({
  transportState,
  currentTime,
  onPlay,
  onPause,
  onStop,
  onSeekForward,
  onSeekBackward,
  onExport,
  onGenerate,
  onSave,
  savedProjects,
  onLoadProject,
  onDeleteProject,
  onLogout,
  bpm = 60,
  onBPMChange,
  recordingState,
  recordingMode,
  recordingDuration,
  inputLevel,
  recordingSettings,
  onUpdateRecordingSettings,
  onArmRecording,
  onStopRecording,
  onCancelRecording,
  onOpenDeviceDialog,
  audioPermissionState,
  isMidiSupported,
  hasAudioDevices,
  hasMidiDevices,
  loopEnabled,
  onToggleLoop,
  loopStart = 0,
  loopEnd = 0,
  onSetLoopRegion,
  onExtendAll,
  onShare,
  isSharing,
  onGenerateStem,
  onAutoMix,
  onAutoMaster,
  totalDuration = 0,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingBPM, setEditingBPM] = useState(false);
  const [bpmInput, setBpmInput] = useState(bpm.toString());
  const bpmInputRef = useRef<HTMLInputElement>(null);

  // Sync bpmInput when bpm prop changes externally
  useEffect(() => {
    if (!editingBPM) {
      setBpmInput(bpm.toString());
    }
  }, [bpm, editingBPM]);

  // Auto-focus and select on edit
  useEffect(() => {
    if (editingBPM && bpmInputRef.current) {
      bpmInputRef.current.focus();
      bpmInputRef.current.select();
    }
  }, [editingBPM]);

  const commitBPM = () => {
    const parsed = parseInt(bpmInput);
    if (!isNaN(parsed) && parsed >= 20 && parsed <= 300) {
      onBPMChange?.(parsed);
    } else {
      setBpmInput(bpm.toString());
    }
    setEditingBPM(false);
  };

  return (
    <header className="flex items-center h-10 px-2 border-b border-[#333] bg-[#1a1a1a] sticky top-0 z-50 gap-1">
      {/* Logo / App name */}
      <div className="flex items-center gap-1.5 px-2 mr-2">
        <span className="font-bold text-[11px] tracking-tight text-white/70 uppercase">Prism</span>
      </div>

      <div className="w-px h-5 bg-[#333]" />

      {/* Transport controls */}
      <div className="flex items-center gap-0.5 px-1">
        {/* Rewind */}
        <button
          onClick={onSeekBackward}
          className="w-7 h-7 flex items-center justify-center rounded-sm transition-colors bg-[#333] text-white/60 hover:bg-[#444] hover:text-white"
          title="Rewind 5s"
        >
          <SkipBack size={10} className="fill-current" />
        </button>
        {/* Stop */}
        <button
          onClick={onStop}
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-sm transition-colors",
            transportState === 'stopped'
              ? "bg-[#555] text-white"
              : "bg-[#333] text-white/60 hover:bg-[#444] hover:text-white"
          )}
          title="Stop"
        >
          <Square size={10} className="fill-current" />
        </button>
        {/* Play */}
        <button
          onClick={onPlay}
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-sm transition-colors",
            transportState === 'playing'
              ? "bg-[#7EC850] text-white"
              : "bg-[#333] text-white/60 hover:bg-[#444] hover:text-white"
          )}
          title="Play"
        >
          <Play size={10} className="fill-current" />
        </button>
        {/* Pause */}
        <button
          onClick={onPause}
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-sm transition-colors",
            transportState === 'paused'
              ? "bg-[#ff6a14]/90 text-white"
              : "bg-[#333] text-white/60 hover:bg-[#444] hover:text-white"
          )}
          title="Pause"
        >
          <Pause size={10} />
        </button>
        {/* Fast Forward */}
        <button
          onClick={onSeekForward}
          className="w-7 h-7 flex items-center justify-center rounded-sm transition-colors bg-[#333] text-white/60 hover:bg-[#444] hover:text-white"
          title="Forward 5s"
        >
          <SkipForward size={10} className="fill-current" />
        </button>
      </div>

      {/* Loop toggle */}
      {onToggleLoop && (
        <button
          onClick={onToggleLoop}
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-sm transition-colors",
            loopEnabled
              ? "bg-[#5B8DEF]/30 text-[#5B8DEF]"
              : "bg-[#333] text-white/30 hover:bg-[#444] hover:text-white/60"
          )}
          title={`Loop ${loopEnabled ? 'ON' : 'OFF'}${loopEnabled && loopEnd > loopStart ? ` (${formatTime(loopStart)} - ${formatTime(loopEnd)})` : ''}`}
        >
          <Repeat size={11} />
        </button>
      )}

      {/* Recording controls */}
      {onArmRecording && recordingSettings && (
        <>
          <div className="w-px h-5 bg-[#333]" />
          <RecordingControls
            recordingState={recordingState ?? 'idle'}
            recordingMode={recordingMode ?? 'audio'}
            recordingDuration={recordingDuration ?? 0}
            inputLevel={inputLevel ?? 0}
            settings={recordingSettings}
            onUpdateSettings={onUpdateRecordingSettings!}
            onArm={onArmRecording}
            onStop={onStopRecording!}
            onCancel={onCancelRecording!}
            onOpenDeviceDialog={onOpenDeviceDialog!}
            audioPermissionState={audioPermissionState ?? 'prompt'}
            isMidiSupported={isMidiSupported ?? false}
            hasAudioDevices={hasAudioDevices ?? false}
            hasMidiDevices={hasMidiDevices ?? false}
          />
        </>
      )}

      {/* Position display — time + bars */}
      <div className="flex items-center bg-[#111] border border-[#333] rounded-sm px-2 h-6 mx-1 gap-1">
        <span className="text-[11px] font-mono text-[#ff6a14] tracking-wide leading-none">
          {formatTime(currentTime)}
        </span>
        {totalDuration > 0 && (
          <>
            <span className="text-[9px] font-mono text-white/20 leading-none">/</span>
            <span className="text-[11px] font-mono text-white/30 tracking-wide leading-none">
              {formatTime(totalDuration)}
            </span>
          </>
        )}
      </div>

      {/* Bar counter */}
      {totalDuration > 0 && (
        <div className="flex items-center bg-[#111] border border-[#333] rounded-sm px-2 h-6 gap-1">
          <span className="text-[10px] font-mono text-white/50 leading-none">BAR</span>
          <span className="text-[11px] font-mono text-[#ff6a14] leading-none">
            {Math.floor(currentTime / (240 / bpm)) + 1}
          </span>
          <span className="text-[9px] font-mono text-white/20 leading-none">/</span>
          <span className="text-[11px] font-mono text-white/30 leading-none">
            {Math.ceil(totalDuration / (240 / bpm))}
          </span>
        </div>
      )}

      <div className="w-px h-5 bg-[#333]" />

      {/* BPM display - click to edit */}
      <div
        className={cn(
          "flex items-center bg-[#111] border rounded-sm px-2 h-6 mx-1 cursor-pointer transition-colors",
          editingBPM ? "border-[#ff6a14]" : "border-[#333] hover:border-[#555]"
        )}
        onClick={() => { if (!editingBPM) setEditingBPM(true); }}
        title="Click to edit BPM"
      >
        <span className="text-[10px] font-mono text-white/50 leading-none">BPM</span>
        {editingBPM ? (
          <input
            ref={bpmInputRef}
            value={bpmInput}
            onChange={(e) => setBpmInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitBPM();
              if (e.key === 'Escape') { setBpmInput(bpm.toString()); setEditingBPM(false); }
            }}
            onBlur={commitBPM}
            className="w-10 text-[11px] font-mono text-[#ff6a14] ml-1 leading-none bg-transparent border-none outline-none"
          />
        ) : (
          <span className="text-[11px] font-mono text-white/80 ml-1 leading-none">{bpm}</span>
        )}
      </div>

      <div className="w-px h-5 bg-[#333]" />

      {/* File operations */}
      <div className="flex items-center gap-0.5 px-1">
        <Button variant="ghost" size="icon" onClick={onSave} className="h-7 w-7 text-white/40 hover:text-white hover:bg-[#333]" title="Save Project">
          <Save size={13} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white hover:bg-[#333]" title="Open Project">
              <FolderOpen size={13} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a1a1a] border-[#333] text-slate-200 min-w-[200px]">
            <div className="px-2 py-1.5 text-[9px] font-bold text-white/30 uppercase tracking-widest">Recent Projects</div>
            <DropdownMenuSeparator className="bg-[#333]" />
            {savedProjects.length === 0 ? (
              <div className="px-2 py-4 text-xs text-center text-white/30 italic">No saved projects</div>
            ) : (
              savedProjects.map(p => (
                <div key={p.id} className="flex items-center group">
                  <DropdownMenuItem
                    className="flex-1 cursor-pointer focus:bg-white/5 focus:text-white"
                    onClick={() => onLoadProject(p)}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-[11px]">{p.name}</span>
                      <span className="text-[9px] text-white/30">{new Date(p.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </DropdownMenuItem>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-500"
                    onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                  >
                    <Trash2 size={11} />
                  </Button>
                </div>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          className="h-7 w-7 text-white/40 hover:text-white hover:bg-[#333]"
          title="Settings"
        >
          <Settings size={13} />
        </Button>
      </div>

      <div className="w-px h-5 bg-[#333]" />

      {/* New project */}
      <button
        onClick={onGenerate}
        className="flex items-center gap-1 h-6 px-2 rounded-sm bg-[#333] text-[10px] font-semibold text-white/50 hover:bg-[#444] hover:text-white/80 transition-colors"
      >
        <Plus size={11} />
        NEW
      </button>

      {/* Extend all tracks */}
      {onExtendAll && (
        <button
          onClick={onExtendAll}
          className="flex items-center gap-1 h-6 px-2 rounded-sm bg-[#333] text-[10px] font-semibold text-white/50 hover:bg-[#444] hover:text-white/80 transition-colors"
          title="Extend / Continue all tracks"
        >
          <ArrowRight size={11} />
          EXTEND
        </button>
      )}

      {/* AI features */}
      {onGenerateStem && (
        <button
          onClick={onGenerateStem}
          className="flex items-center gap-1 h-6 px-2 rounded-sm bg-[#333] text-[10px] font-semibold text-white/50 hover:bg-[#444] hover:text-purple-300 transition-colors"
          title="Generate an AI instrument stem"
        >
          <Wand2 size={11} />
          AI STEM
        </button>
      )}
      {onAutoMix && (
        <button
          onClick={onAutoMix}
          className="flex items-center gap-1 h-6 px-2 rounded-sm bg-[#333] text-[10px] font-semibold text-white/50 hover:bg-[#444] hover:text-blue-300 transition-colors"
          title="Auto mix: balance volumes, panning, and EQ"
        >
          <SlidersHorizontal size={11} />
          AUTO MIX
        </button>
      )}
      {onAutoMaster && (
        <button
          onClick={onAutoMaster}
          className="flex items-center gap-1 h-6 px-2 rounded-sm bg-[#333] text-[10px] font-semibold text-white/50 hover:bg-[#444] hover:text-amber-300 transition-colors"
          title="Auto master: add mastering chain"
        >
          <Disc size={11} />
          MASTER
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export & Share */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onExport('wav')}
          className="flex items-center gap-1 h-6 px-2 rounded-sm text-[10px] font-semibold text-white/40 hover:bg-[#333] hover:text-white/70 transition-colors"
        >
          <Download size={10} />
          WAV
        </button>
        <button
          onClick={() => onExport('zip')}
          className="flex items-center gap-1 h-6 px-2 rounded-sm text-[10px] font-semibold text-white/40 hover:bg-[#333] hover:text-white/70 transition-colors"
        >
          <Download size={10} />
          STEMS
        </button>
        {onShare && (
          <>
            <div className="w-px h-4 bg-[#333]" />
            <button
              onClick={onShare}
              disabled={isSharing}
              className={cn(
                "flex items-center gap-1 h-6 px-2 rounded-sm text-[10px] font-semibold transition-colors",
                isSharing
                  ? "text-[#ff6a14] bg-[#ff6a14]/10 cursor-wait"
                  : "text-white/40 hover:bg-[#333] hover:text-white/70"
              )}
            >
              {isSharing ? <Loader2 size={10} className="animate-spin" /> : <Share2 size={10} />}
              {isSharing ? 'SHARING...' : 'SHARE'}
            </button>
          </>
        )}
      </div>

      {onLogout && (
        <>
          <div className="w-px h-5 bg-[#333]" />
          <button
            onClick={onLogout}
            className="flex items-center gap-1 h-6 px-2 rounded-sm text-[10px] font-semibold text-white/40 hover:bg-[#333] hover:text-red-400 transition-colors"
            title="Sign Out"
          >
            <LogOut size={10} />
            Sign Out
          </button>
        </>
      )}

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
};

export default DAWHeader;
