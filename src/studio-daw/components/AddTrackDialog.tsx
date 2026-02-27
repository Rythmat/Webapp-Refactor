import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Music2, Piano, Wand2, Search, Loader2, Upload, FileAudio, X, Volume2, VolumeX, Mic, Circle, Waves, Library } from "lucide-react";
import { GM_INSTRUMENTS } from '@/studio-daw/audio/midi-engine';
import { PRESET_CATEGORIES } from '@/studio-daw/audio/synth-presets';
import { MOOD_OPTIONS } from '@/studio-daw/components/AIPromptPanel';
import type { MidiClipData } from '@/studio-daw/audio/midi-engine';
import { analyzeContour, type ContourAnalysis } from '@/studio-daw/audio/contour-analysis';
import ContourVisualization, { ContourStats, ContourSegmentList } from '@/studio-daw/components/ContourVisualization';
import type { VolumeFollowMode } from '@/studio-daw/hooks/use-audio-engine';

import type { RecordingMode } from '@/studio-daw/hooks/use-recording';
import type { AudioDeviceInfo } from '@/studio-daw/hooks/use-audio-recording';
import type { MidiDeviceInfo } from '@/studio-daw/hooks/use-midi-input';
import { cn } from '@/lib/utils';

type TabType = 'audio' | 'midi' | 'synth' | 'ai' | 'scoring' | 'record';

interface ScoringParams {
  contour: ContourAnalysis;
  buffer: AudioBuffer;
  mood: string;
  tempo: number;
  trackSource: 'samples' | 'midi' | 'hybrid';
  volumeFollowMode: VolumeFollowMode;
  influenceStrength: number;
}

interface AddTrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTrackWithAudio: (name: string, url: string) => void;
  onAddEmptyTrack: (type?: 'audio' | 'midi' | 'synth', midiProgram?: number) => void;
  onAddMidiTrack: (name: string, midiData: MidiClipData) => void;
  onGenerateTrack: (prompt: string, trackType: 'audio' | 'midi', options?: { lyrics?: string; duration?: number }) => Promise<void>;
  onGenerateScore?: (params: ScoringParams) => Promise<void>;
  isGenerating?: boolean;
  // Recording
  onStartRecording?: (mode: RecordingMode, midiProgram?: number) => void;
  audioDevices?: AudioDeviceInfo[];
  midiDevices?: MidiDeviceInfo[];
  isMidiSupported?: boolean;
  midiRecordProgram?: number;
  onMidiRecordProgramChange?: (program: number) => void;
  // Reference Library
  onOpenReferenceLibrary?: () => void;
}

export type { ScoringParams };

const AddTrackDialog: React.FC<AddTrackDialogProps> = ({
  open,
  onOpenChange,
  onAddTrackWithAudio,
  onAddEmptyTrack,
  onAddMidiTrack,
  onGenerateTrack,
  onGenerateScore,
  isGenerating = false,
  onStartRecording,
  audioDevices = [],
  midiDevices = [],
  isMidiSupported = false,
  midiRecordProgram = 0,
  onMidiRecordProgramChange,
  onOpenReferenceLibrary,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('ai');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedProgram, setSelectedProgram] = useState(89); // Pad 2 (warm) default
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTrackType, setAiTrackType] = useState<'audio' | 'midi'>('audio');
  const [aiLyrics, setAiLyrics] = useState('');
  const [aiDuration, setAiDuration] = useState(30);
  const [recordMode, setRecordMode] = useState<RecordingMode>('audio');
  const [selectedPresetName, setSelectedPresetName] = useState('Init');

  // Scoring tab state
  const [scoringFile, setScoringFile] = useState<File | null>(null);
  const [scoringBuffer, setScoringBuffer] = useState<AudioBuffer | null>(null);
  const [scoringContour, setScoringContour] = useState<ContourAnalysis | null>(null);
  const [scoringAnalyzing, setScoringAnalyzing] = useState(false);
  const [scoringAnalysisProgress, setScoringAnalysisProgress] = useState(0);
  const [scoringMood, setScoringMood] = useState('meditative');
  const [scoringTrackSource, setScoringTrackSource] = useState<'samples' | 'midi' | 'hybrid'>('midi');
  const [scoringVolumeMode, setScoringVolumeMode] = useState<VolumeFollowMode>('duck');
  const [scoringInfluence, setScoringInfluence] = useState(0.5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setUrl('');
      setAiPrompt('');
      setAiLyrics('');
      setAiDuration(30);
      // Reset scoring state
      setScoringFile(null);
      setScoringBuffer(null);
      setScoringContour(null);
      setScoringAnalyzing(false);
      setScoringAnalysisProgress(0);
    }
  }, [open]);

  // Handle file upload for scoring
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|flac|aac)$/i)) {
      console.error('Invalid file type');
      return;
    }

    setScoringFile(file);
    setScoringAnalyzing(true);
    setScoringAnalysisProgress(0);
    setScoringContour(null);

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      setScoringAnalysisProgress(20);

      // Decode to AudioBuffer
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      setScoringBuffer(audioBuffer);
      setScoringAnalysisProgress(40);

      // Run contour analysis with progress callback
      const contour = await analyzeContour(audioBuffer, (progress) => {
        setScoringAnalysisProgress(40 + progress * 0.6); // 40-100%
      });

      setScoringContour(contour);
      // Use suggested values from analysis
      if (contour.suggestedMood) setScoringMood(contour.suggestedMood);
    } catch (error) {
      console.error('Failed to analyze audio file:', error);
      setScoringFile(null);
      setScoringBuffer(null);
    } finally {
      setScoringAnalyzing(false);
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleClearFile = useCallback(() => {
    setScoringFile(null);
    setScoringBuffer(null);
    setScoringContour(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleGenerateScore = useCallback(async () => {
    if (!scoringContour || !scoringBuffer || !onGenerateScore) return;

    await onGenerateScore({
      contour: scoringContour,
      buffer: scoringBuffer,
      mood: scoringMood,
      tempo: scoringContour.suggestedTempo,
      trackSource: scoringTrackSource,
      volumeFollowMode: scoringVolumeMode,
      influenceStrength: scoringInfluence,
    });

    onOpenChange(false);
  }, [scoringContour, scoringBuffer, scoringMood, scoringTrackSource, scoringVolumeMode, scoringInfluence, onGenerateScore, onOpenChange]);

  const handleAddAudioWithUrl = () => {
    const trimmedName = name.trim() || 'New Track';
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    onAddTrackWithAudio(trimmedName, trimmedUrl);
    onOpenChange(false);
  };

  const handleAddEmptyAudio = () => {
    onAddEmptyTrack('audio');
    onOpenChange(false);
  };

  const handleAddEmptyMidi = () => {
    onAddEmptyTrack('midi', selectedProgram);
    onOpenChange(false);
  };

  const handleAddSynth = () => {
    onAddEmptyTrack('synth');
    onOpenChange(false);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    await onGenerateTrack(aiPrompt.trim(), aiTrackType, {
      lyrics: aiLyrics.trim() || undefined,
      duration: aiDuration,
    });
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (activeTab === 'audio' && url.trim()) {
        handleAddAudioWithUrl();
      } else if (activeTab === 'ai' && aiPrompt.trim() && !isGenerating) {
        handleAiGenerate();
      }
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'ai', label: 'Generate', icon: <Wand2 className="w-3.5 h-3.5" /> },
    { id: 'scoring', label: 'Score', icon: <FileAudio className="w-3.5 h-3.5" /> },
    { id: 'record', label: 'Record', icon: <Circle className="w-3.5 h-3.5" /> },
    { id: 'audio', label: 'Audio', icon: <Music2 className="w-3.5 h-3.5" /> },
    { id: 'midi', label: 'MIDI', icon: <Piano className="w-3.5 h-3.5" /> },
    { id: 'synth', label: 'Synth', icon: <Waves className="w-3.5 h-3.5" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] bg-[#1e1e1e] border-[#444] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Plus className="w-4 h-4 text-[#7EC850]" />
            Add Track
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Add a new audio or MIDI track to your project.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selector */}
        <div className="flex gap-0.5 p-1 bg-[#111] rounded-lg">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md text-[11px] font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#333] text-white'
                  : 'text-white/40 hover:text-white/60 hover:bg-[#222]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="py-2 space-y-3" onKeyDown={handleKeyDown}>
          {/* AI Generate Tab */}
          {activeTab === 'ai' && (
            <>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                  Describe what you want
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. A gentle piano melody in C major, soft warm pad that slowly evolves..."
                  autoFocus
                  rows={3}
                  className="w-full px-3 py-2 bg-[#111] border border-[#444] rounded-md text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#7EC850] focus:ring-1 focus:ring-[#7EC850]/30 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                  Generate as
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAiTrackType('audio')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-xs font-semibold border transition-all ${
                      aiTrackType === 'audio'
                        ? 'bg-[#5B8DEF]/20 border-[#5B8DEF] text-[#5B8DEF]'
                        : 'bg-[#111] border-[#444] text-white/40 hover:text-white/60'
                    }`}
                  >
                    <Music2 className="w-3.5 h-3.5" />
                    Audio Sample
                  </button>
                  <button
                    onClick={() => setAiTrackType('midi')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-xs font-semibold border transition-all ${
                      aiTrackType === 'midi'
                        ? 'bg-[#A675E2]/20 border-[#A675E2] text-[#A675E2]'
                        : 'bg-[#111] border-[#444] text-white/40 hover:text-white/60'
                    }`}
                  >
                    <Piano className="w-3.5 h-3.5" />
                    MIDI Notes
                  </button>
                </div>
              </div>
              {aiTrackType === 'audio' && (
                <>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                      Duration
                    </label>
                    <select
                      value={aiDuration}
                      onChange={(e) => setAiDuration(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-[#111] border border-[#444] rounded-md text-sm text-white focus:outline-none focus:border-[#7EC850] focus:ring-1 focus:ring-[#7EC850]/30 transition-colors"
                    >
                      <option value={30}>30s Short</option>
                      <option value={60}>60s Medium</option>
                      <option value={120}>2min Long</option>
                      <option value={240}>4min Full</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                      Lyrics (optional)
                    </label>
                    <textarea
                      value={aiLyrics}
                      onChange={(e) => setAiLyrics(e.target.value)}
                      placeholder={"[Verse]\nYour lyrics here...\n\n[Chorus]\nChorus lyrics..."}
                      rows={3}
                      className="w-full px-3 py-2 bg-[#111] border border-[#444] rounded-md text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#7EC850] focus:ring-1 focus:ring-[#7EC850]/30 transition-colors resize-none"
                    />
                    <p className="text-[9px] text-white/25 mt-1">Use [Verse], [Chorus], [Bridge] markers. Leave empty for instrumental.</p>
                  </div>
                  {onOpenReferenceLibrary && (
                    <button
                      type="button"
                      onClick={onOpenReferenceLibrary}
                      className="flex items-center gap-1.5 px-3 py-2 w-full bg-[#111] border border-[#444] rounded-md text-xs text-white/40 hover:text-purple-400 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all"
                    >
                      <Library className="w-3.5 h-3.5" />
                      Browse Reference Library
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* AI Scoring Tab */}
          {activeTab === 'scoring' && (
            <div className="space-y-3">
              {/* File Upload Area */}
              {!scoringFile ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#444] rounded-lg p-6 text-center cursor-pointer hover:border-[#F97316] hover:bg-[#F97316]/5 transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 mx-auto mb-2 text-white/30" />
                  <p className="text-sm text-white/50 mb-1">Drop audio file here or click to browse</p>
                  <p className="text-[10px] text-white/30">Supports MP3, WAV, OGG, M4A, FLAC</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* File Info */}
                  <div className="flex items-center gap-2 p-2 bg-[#111] rounded-lg">
                    <FileAudio className="w-5 h-5 text-[#F97316] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{scoringFile.name}</p>
                      <p className="text-[10px] text-white/40">
                        {(scoringFile.size / (1024 * 1024)).toFixed(1)} MB
                        {scoringBuffer && ` | ${Math.floor(scoringBuffer.duration / 60)}:${Math.floor(scoringBuffer.duration % 60).toString().padStart(2, '0')}`}
                      </p>
                    </div>
                    <button
                      onClick={handleClearFile}
                      className="p-1 text-white/40 hover:text-white/70 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Analysis Progress */}
                  {scoringAnalyzing && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin text-[#F97316]" />
                        <span className="text-[10px] text-white/50">Analyzing audio contour...</span>
                      </div>
                      <div className="h-1 bg-[#222] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#F97316] transition-all duration-300"
                          style={{ width: `${scoringAnalysisProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Contour Visualization */}
                  {scoringContour && scoringBuffer && (
                    <>
                      <div className="bg-[#111] rounded-lg p-2">
                        <ContourVisualization
                          buffer={scoringBuffer}
                          contour={scoringContour}
                          width={420}
                          height={80}
                          showSegments
                          showWaveform
                        />
                      </div>

                      {/* Stats */}
                      <ContourStats contour={scoringContour} />

                      {/* Segment Preview */}
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                          Detected Segments ({scoringContour.segments.length})
                        </label>
                        <ContourSegmentList segments={scoringContour.segments} compact />
                      </div>

                      {/* Generation Settings */}
                      <div className="space-y-3 pt-2 border-t border-[#333]">
                        {/* Mood Selector */}
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                            Music Mood
                          </label>
                          <select
                            value={scoringMood}
                            onChange={(e) => setScoringMood(e.target.value)}
                            className="w-full h-8 px-2 bg-[#111] border border-[#444] rounded text-xs text-white focus:outline-none focus:border-[#F97316]"
                          >
                            {(() => {
                              const groups = MOOD_OPTIONS.reduce<Record<string, typeof MOOD_OPTIONS>>((acc, m) => {
                                (acc[m.group] ??= []).push(m);
                                return acc;
                              }, {});
                              return Object.entries(groups).map(([group, moods]) => (
                                <optgroup key={group} label={group}>
                                  {moods.map(m => (
                                    <option key={m.id} value={m.id}>{m.label}</option>
                                  ))}
                                </optgroup>
                              ));
                            })()}
                          </select>
                        </div>

                        {/* Track Source */}
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                            Music Generation
                          </label>
                          <div className="flex gap-1">
                            {(['midi', 'samples', 'hybrid'] as const).map((source) => (
                              <button
                                key={source}
                                onClick={() => setScoringTrackSource(source)}
                                className={`flex-1 py-1.5 rounded text-[10px] font-semibold border transition-all ${
                                  scoringTrackSource === source
                                    ? 'bg-[#F97316]/20 border-[#F97316] text-[#F97316]'
                                    : 'bg-[#111] border-[#444] text-white/40 hover:text-white/60'
                                }`}
                              >
                                {source === 'midi' ? 'MIDI' : source === 'samples' ? 'Samples' : 'Hybrid'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Volume Follow Mode */}
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                            Volume Following
                          </label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setScoringVolumeMode('duck')}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-[10px] font-semibold border transition-all ${
                                scoringVolumeMode === 'duck'
                                  ? 'bg-[#3B82F6]/20 border-[#3B82F6] text-[#3B82F6]'
                                  : 'bg-[#111] border-[#444] text-white/40 hover:text-white/60'
                              }`}
                            >
                              <VolumeX className="w-3 h-3" />
                              Duck
                            </button>
                            <button
                              onClick={() => setScoringVolumeMode('swell')}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-[10px] font-semibold border transition-all ${
                                scoringVolumeMode === 'swell'
                                  ? 'bg-[#22C55E]/20 border-[#22C55E] text-[#22C55E]'
                                  : 'bg-[#111] border-[#444] text-white/40 hover:text-white/60'
                              }`}
                            >
                              <Volume2 className="w-3 h-3" />
                              Swell
                            </button>
                          </div>
                          <p className="text-[9px] text-white/30 mt-1">
                            {scoringVolumeMode === 'duck'
                              ? 'Music gets quieter when speech is loud'
                              : 'Music gets louder to match speech intensity'}
                          </p>
                        </div>

                        {/* Influence Strength */}
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                            Influence Strength: {Math.round(scoringInfluence * 100)}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={scoringInfluence}
                            onChange={(e) => setScoringInfluence(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#F97316] [&::-webkit-slider-thumb]:rounded-full"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Audio Tab */}
          {activeTab === 'audio' && (
            <>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                  Track Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="New Track"
                  autoFocus
                  className="w-full h-9 px-3 bg-[#111] border border-[#444] rounded-md text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#7EC850] focus:ring-1 focus:ring-[#7EC850]/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                  Audio URL <span className="text-white/20 normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                  className="w-full h-9 px-3 bg-[#111] border border-[#444] rounded-md text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#7EC850] focus:ring-1 focus:ring-[#7EC850]/30 transition-colors"
                />
                <p className="text-[9px] text-white/25 mt-1">Leave blank to add an empty audio track.</p>
              </div>
            </>
          )}

          {/* Record Tab */}
          {activeTab === 'record' && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                  Record Mode
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRecordMode('audio')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-xs font-semibold border transition-all",
                      recordMode === 'audio'
                        ? "bg-[#FF4444]/20 border-[#FF4444] text-[#FF4444]"
                        : "bg-[#111] border-[#444] text-white/40 hover:text-white/60",
                    )}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Audio
                  </button>
                  <button
                    onClick={() => setRecordMode('midi')}
                    disabled={!isMidiSupported}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-xs font-semibold border transition-all",
                      recordMode === 'midi'
                        ? "bg-[#A675E2]/20 border-[#A675E2] text-[#A675E2]"
                        : "bg-[#111] border-[#444] text-white/40 hover:text-white/60",
                      !isMidiSupported && "opacity-30 cursor-not-allowed",
                    )}
                  >
                    <Piano className="w-3.5 h-3.5" />
                    MIDI
                  </button>
                </div>
              </div>

              {recordMode === 'audio' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 block">
                    Audio Input Device
                  </label>
                  {audioDevices.length > 0 ? (
                    <>
                      <select className="w-full h-8 px-2 bg-[#111] border border-[#444] rounded text-xs text-white focus:outline-none focus:border-[#FF4444]">
                        {audioDevices.map(d => (
                          <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                        ))}
                      </select>
                      <p className="text-[9px] text-white/25">
                        {audioDevices.length} device{audioDevices.length !== 1 ? 's' : ''} available. USB devices auto-detected.
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] text-white/40 p-3 bg-[#111] rounded-md text-center">
                      No audio input devices detected. Grant mic permission in Recording Settings.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 block">
                    MIDI Input Device
                  </label>
                  {midiDevices.length > 0 ? (
                    <select className="w-full h-8 px-2 bg-[#111] border border-[#444] rounded text-xs text-white focus:outline-none focus:border-[#A675E2]">
                      {midiDevices.filter(d => d.state === 'connected').map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[10px] text-white/40 p-3 bg-[#111] rounded-md text-center">
                      No MIDI devices connected. Plug in a MIDI controller.
                    </p>
                  )}

                  {/* MIDI Instrument selector */}
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 block">
                    Instrument
                  </label>
                  <select
                    value={midiRecordProgram}
                    onChange={(e) => onMidiRecordProgramChange?.(parseInt(e.target.value))}
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
              )}

              <p className="text-[9px] text-white/25">
                Closes this dialog and starts recording with count-in. Configure metronome and count-in in Recording Settings.
              </p>
            </div>
          )}

          {/* MIDI Tab */}
          {activeTab === 'midi' && (
            <>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                  Instrument
                </label>
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(parseInt(e.target.value))}
                  className="w-full h-9 px-3 bg-[#111] border border-[#444] rounded-md text-sm text-white focus:outline-none focus:border-[#A675E2] focus:ring-1 focus:ring-[#A675E2]/30 transition-colors"
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
              <p className="text-[9px] text-white/25">
                Creates an empty MIDI track with the selected instrument. Uses SpessaSynth (SoundFont2) for playback.
              </p>
            </>
          )}

          {/* Synth Tab */}
          {activeTab === 'synth' && (
            <>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                  Starting Preset
                </label>
                <select
                  value={selectedPresetName}
                  onChange={(e) => setSelectedPresetName(e.target.value)}
                  className="w-full h-9 px-3 bg-[#111] border border-[#444] rounded-md text-sm text-white focus:outline-none focus:border-[#50C8A8] focus:ring-1 focus:ring-[#50C8A8]/30 transition-colors"
                >
                  {PRESET_CATEGORIES.map(cat => (
                    <optgroup key={cat.name} label={cat.name}>
                      {cat.presets.map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <p className="text-[9px] text-white/25">
                Creates a wavetable synth track with dual oscillators, filters, envelopes, LFOs, and modulation matrix. Draw notes in the piano roll.
              </p>
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/50 hover:text-white hover:bg-white/5"
          >
            Cancel
          </Button>

          {activeTab === 'ai' && (
            <Button
              onClick={handleAiGenerate}
              disabled={!aiPrompt.trim() || isGenerating}
              className="bg-[#7EC850] hover:bg-[#7EC850]/90 text-white disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                  Generate {aiTrackType === 'midi' ? 'MIDI' : 'Audio'} Track
                </>
              )}
            </Button>
          )}

          {activeTab === 'audio' && (
            url.trim() ? (
              <Button
                onClick={handleAddAudioWithUrl}
                className="bg-[#7EC850] hover:bg-[#7EC850]/90 text-white"
              >
                <Music2 className="w-3.5 h-3.5 mr-1.5" />
                Add with Audio
              </Button>
            ) : (
              <Button
                onClick={handleAddEmptyAudio}
                className="bg-[#555] hover:bg-[#666] text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Empty Audio Track
              </Button>
            )
          )}

          {activeTab === 'midi' && (
            <Button
              onClick={handleAddEmptyMidi}
              className="bg-[#A675E2] hover:bg-[#A675E2]/90 text-white"
            >
              <Piano className="w-3.5 h-3.5 mr-1.5" />
              Add MIDI Track
            </Button>
          )}

          {activeTab === 'synth' && (
            <Button
              onClick={handleAddSynth}
              className="bg-[#50C8A8] hover:bg-[#50C8A8]/90 text-white"
            >
              <Waves className="w-3.5 h-3.5 mr-1.5" />
              Add Synth Track
            </Button>
          )}

          {activeTab === 'record' && onStartRecording && (
            <Button
              onClick={() => {
                onStartRecording(recordMode, recordMode === 'midi' ? midiRecordProgram : undefined);
                onOpenChange(false);
              }}
              disabled={
                (recordMode === 'audio' && audioDevices.length === 0) ||
                (recordMode === 'midi' && midiDevices.filter(d => d.state === 'connected').length === 0)
              }
              className="bg-[#FF4444] hover:bg-[#FF4444]/90 text-white disabled:opacity-50"
            >
              <Circle className="w-3.5 h-3.5 mr-1.5 fill-current" />
              Start Recording
            </Button>
          )}

          {activeTab === 'scoring' && scoringContour && (
            <Button
              onClick={handleGenerateScore}
              disabled={!scoringContour || isGenerating}
              className="bg-[#F97316] hover:bg-[#F97316]/90 text-white disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                  Generate Score
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddTrackDialog;
