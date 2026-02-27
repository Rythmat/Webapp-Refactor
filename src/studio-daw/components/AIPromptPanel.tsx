import React, { useState, useRef, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel as SelectLabelUI } from "@/components/ui/select";
import { Search, Wand2, Music, Piano, Disc3, FileAudio, Upload, X, Loader2, VolumeX, Volume2, Video, Link, Plus, FolderOpen, ChevronDown, Type } from "lucide-react";
import { cn } from '@/lib/utils';
import InstrumentSelectDialog from './InstrumentSelectDialog';
import { analyzeContour, type ContourAnalysis } from '@/studio-daw/audio/contour-analysis';
import ContourVisualization, { ContourStats, ContourSegmentList } from '@/studio-daw/components/ContourVisualization';
import VideoContourVisualization, { VideoContourStats, VideoSegmentList } from '@/studio-daw/components/VideoContourVisualization';
import { analyzeVideo, type VideoAnalysisProgress } from '@/studio-daw/services/video-analysis';
import { type VideoContourAnalysis } from '@/studio-daw/audio/video-contour-analysis';
import { validateVideoFile, parseYouTubeUrl, getYouTubeEmbedUrl, extractAudioFromVideo } from '@/studio-daw/utils/video-keyframes';
import type { VolumeFollowMode } from '@/studio-daw/hooks/use-audio-engine';
import ReferenceAnalysisPanel from './ReferenceAnalysisPanel';
import ReferenceLibraryDialog from './ReferenceLibraryDialog';
import type { ReferenceTrack } from '@/studio-daw/types/reference-library';

export interface ScoringParams {
  contour: ContourAnalysis;
  buffer: AudioBuffer;
  mood: string;
  tempo: number;
  trackSource: 'samples' | 'midi' | 'hybrid';
  volumeFollowMode: VolumeFollowMode;
  influenceStrength: number;
}

export interface VideoScoringParams {
  videoContour: VideoContourAnalysis;
  videoUrl: string;
  youtubeUrl?: string;
  videoAudioBuffer?: AudioBuffer;  // Extracted audio from uploaded video
  mood: string;
  tempo: number;
  trackSource: 'samples' | 'midi' | 'hybrid';
  volumeFollowMode: VolumeFollowMode;
  influenceStrength: number;
}

interface AIPromptPanelProps {
  onGenerate: (params: GenerationParams) => void;
  onGenerateScore?: (params: ScoringParams) => void;
  onGenerateVideoScore?: (params: VideoScoringParams) => void;
  isLoading: boolean;
  onSkipToDAW?: () => void;
  savedProjects?: any[];
  onLoadProject?: (project: any) => void;
}

export type TrackSourceMode = 'samples' | 'midi' | 'hybrid';
export type MidiInstrumentRole = 'drums' | 'bass' | 'melodic' | 'pads';

export interface GenerationParams {
  prompt: string;
  mood: string;
  genre?: string;
  tempo: number;
  trackSource: TrackSourceMode;
  midiRoles: MidiInstrumentRole[];
  selectedInstruments?: number[];
  lyrics?: string;
  duration?: number;
  referenceFile?: File;
  referenceTags?: string[];
  detectedInstruments?: string[];
}

/** Shared mood options across the app */
export interface MoodOption { id: string; label: string; group: string; }
export const MOOD_OPTIONS: MoodOption[] = [
  // Therapeutic
  { id: 'meditative', label: 'Meditative', group: 'Therapeutic' },
  { id: 'ethereal', label: 'Ethereal', group: 'Therapeutic' },
  { id: 'dark-ambient', label: 'Deep/Dark', group: 'Therapeutic' },
  { id: 'nature', label: 'Pure Nature', group: 'Therapeutic' },
  { id: 'warm', label: 'Warm/Enveloping', group: 'Therapeutic' },
  { id: 'minimal', label: 'Minimal/Sparse', group: 'Therapeutic' },
  // Cinematic
  { id: 'dramatic', label: 'Dramatic', group: 'Cinematic' },
  { id: 'cinematic', label: 'Cinematic', group: 'Cinematic' },
  { id: 'uplifting', label: 'Uplifting', group: 'Cinematic' },
  { id: 'tense', label: 'Tense', group: 'Cinematic' },
  { id: 'peaceful', label: 'Peaceful', group: 'Cinematic' },
  { id: 'melancholic', label: 'Melancholic', group: 'Cinematic' },
  { id: 'triumphant', label: 'Triumphant', group: 'Cinematic' },
  { id: 'haunting', label: 'Haunting', group: 'Cinematic' },
  { id: 'mysterious', label: 'Mysterious', group: 'Cinematic' },
  { id: 'nostalgic', label: 'Nostalgic', group: 'Cinematic' },
  // Energy
  { id: 'energetic', label: 'Energetic', group: 'Energy' },
  { id: 'aggressive', label: 'Aggressive', group: 'Energy' },
  { id: 'funky', label: 'Funky', group: 'Energy' },
  { id: 'groovy', label: 'Groovy', group: 'Energy' },
  // Emotional
  { id: 'romantic', label: 'Romantic', group: 'Emotional' },
  { id: 'dreamy', label: 'Dreamy', group: 'Emotional' },
];

/** Grouped mood options by group name */
const MOOD_GROUPS = MOOD_OPTIONS.reduce<Record<string, MoodOption[]>>((acc, m) => {
  (acc[m.group] ??= []).push(m);
  return acc;
}, {});

/** Genre options with BPM ranges and suggested instruments */
export interface GenreOption {
  id: string;
  label: string;
  category: string;
  bpmRange: [number, number];
  suggestedInstruments: number[];
}
export const GENRE_OPTIONS: GenreOption[] = [
  // Popular
  { id: 'pop', label: 'Pop', category: 'Popular', bpmRange: [100, 130], suggestedInstruments: [0, 4, 25, 89, 48] },
  { id: 'rock', label: 'Rock', category: 'Popular', bpmRange: [110, 140], suggestedInstruments: [25, 29, 30, 33, 89] },
  { id: 'heavy-metal', label: 'Heavy Metal', category: 'Popular', bpmRange: [130, 180], suggestedInstruments: [29, 30, 33, 38, 89] },
  { id: 'blues', label: 'Blues', category: 'Popular', bpmRange: [60, 100], suggestedInstruments: [0, 25, 26, 33, 16] },
  { id: 'jazz', label: 'Jazz', category: 'Popular', bpmRange: [80, 140], suggestedInstruments: [0, 26, 33, 66, 73] },
  { id: 'funk', label: 'Funk', category: 'Popular', bpmRange: [95, 120], suggestedInstruments: [4, 33, 34, 16, 0] },
  { id: 'country', label: 'Country', category: 'Popular', bpmRange: [80, 130], suggestedInstruments: [25, 24, 105, 0, 110] },
  { id: 'folk', label: 'Folk', category: 'Popular', bpmRange: [80, 120], suggestedInstruments: [24, 25, 46, 110, 73] },
  // Urban
  { id: 'hip-hop', label: 'Hip Hop', category: 'Urban', bpmRange: [80, 110], suggestedInstruments: [0, 4, 38, 89, 81] },
  { id: 'rnb', label: 'R&B / Soul', category: 'Urban', bpmRange: [65, 100], suggestedInstruments: [0, 4, 33, 89, 48] },
  // Electronic
  { id: 'ambient-electronic', label: 'Ambient', category: 'Electronic', bpmRange: [60, 90], suggestedInstruments: [89, 88, 91, 95, 94] },
  { id: 'house', label: 'House', category: 'Electronic', bpmRange: [118, 132], suggestedInstruments: [89, 81, 38, 4, 90] },
  { id: 'techno', label: 'Techno', category: 'Electronic', bpmRange: [125, 145], suggestedInstruments: [81, 38, 89, 90, 80] },
  { id: 'drum-and-bass', label: 'Drum & Bass', category: 'Electronic', bpmRange: [160, 180], suggestedInstruments: [38, 81, 89, 90, 33] },
  { id: 'lo-fi', label: 'Lo-Fi', category: 'Electronic', bpmRange: [70, 90], suggestedInstruments: [0, 4, 89, 11, 24] },
  // Orchestral
  { id: 'classical', label: 'Classical', category: 'Orchestral', bpmRange: [60, 140], suggestedInstruments: [0, 48, 40, 42, 73] },
  { id: 'cinematic-film', label: 'Cinematic / Film', category: 'Orchestral', bpmRange: [60, 130], suggestedInstruments: [48, 49, 60, 89, 14] },
  // World
  { id: 'reggae', label: 'Reggae', category: 'World', bpmRange: [70, 90], suggestedInstruments: [24, 33, 16, 0, 89] },
  { id: 'latin', label: 'Latin', category: 'World', bpmRange: [90, 130], suggestedInstruments: [24, 33, 0, 73, 112] },
  { id: 'indian-raga', label: 'Indian / Raga', category: 'World', bpmRange: [60, 120], suggestedInstruments: [104, 111, 108, 73, 89] },
  { id: 'middle-eastern', label: 'Middle Eastern', category: 'World', bpmRange: [70, 120], suggestedInstruments: [111, 104, 68, 73, 89] },
  { id: 'asian-gamelan', label: 'Asian / Gamelan', category: 'World', bpmRange: [60, 100], suggestedInstruments: [107, 108, 14, 13, 12] },
  { id: 'afrobeat', label: 'Afrobeat', category: 'World', bpmRange: [95, 130], suggestedInstruments: [33, 0, 16, 24, 112] },
  { id: 'world-fusion', label: 'World Fusion', category: 'World', bpmRange: [80, 120], suggestedInstruments: [104, 24, 73, 48, 89] },
];

const GENRE_CATEGORIES = GENRE_OPTIONS.reduce<Record<string, GenreOption[]>>((acc, g) => {
  (acc[g.category] ??= []).push(g);
  return acc;
}, {});

/** GM program number → human-readable name for instrument chips */
const GM_INSTRUMENT_NAMES: Record<number, string> = {
  0: 'Acoustic Piano', 1: 'Bright Piano', 2: 'Electric Grand', 4: 'Electric Piano 1',
  5: 'Electric Piano 2', 6: 'Harpsichord', 7: 'Clavinet', 8: 'Celesta',
  11: 'Vibraphone', 12: 'Marimba', 13: 'Xylophone', 14: 'Tubular Bells',
  16: 'Drawbar Organ', 24: 'Nylon Guitar', 25: 'Steel Guitar', 26: 'Jazz Guitar',
  27: 'Clean Guitar', 28: 'Muted Guitar', 29: 'Overdriven Guitar', 30: 'Distortion Guitar',
  31: 'Guitar Harmonics', 32: 'Acoustic Bass', 33: 'Electric Bass (finger)', 34: 'Electric Bass (pick)',
  35: 'Fretless Bass', 36: 'Slap Bass 1', 37: 'Slap Bass 2', 38: 'Synth Bass 1', 39: 'Synth Bass 2',
  40: 'Violin', 41: 'Viola', 42: 'Cello', 43: 'Contrabass',
  46: 'Harp', 48: 'String Ensemble', 49: 'Slow Strings', 50: 'Synth Strings 1', 51: 'Synth Strings 2',
  60: 'French Horn', 66: 'Tenor Sax', 68: 'Oboe', 69: 'English Horn', 71: 'Clarinet',
  73: 'Flute', 74: 'Recorder', 75: 'Pan Flute', 79: 'Ocarina',
  80: 'Square Lead', 81: 'Sawtooth Lead', 82: 'Calliope Lead', 83: 'Chiff Lead',
  84: 'Charang Lead', 85: 'Voice Lead', 86: 'Fifths Lead', 87: 'Bass + Lead',
  88: 'New Age Pad', 89: 'Warm Pad', 90: 'Polysynth', 91: 'Choir Pad',
  92: 'Bowed Pad', 93: 'Metallic Pad', 94: 'Halo Pad', 95: 'Sweep Pad',
  104: 'Sitar', 105: 'Banjo', 106: 'Shamisen', 107: 'Koto',
  108: 'Kalimba', 109: 'Bagpipe', 110: 'Fiddle', 111: 'Shanai',
  112: 'Tinkle Bell', 113: 'Agogo', 114: 'Steel Drums', 115: 'Woodblock',
  116: 'Taiko Drum', 117: 'Melodic Tom', 118: 'Synth Drum', 119: 'Reverse Cymbal',
  // Drum Kits (virtual IDs: 128 + GM program on bank 128)
  128: 'Standard Kit', 136: 'Room Kit', 144: 'Power Kit',
  152: 'Electronic Kit', 153: 'TR-808 Kit', 160: 'Jazz Kit',
  168: 'Brush Kit', 176: 'Orchestra Kit', 184: 'SFX Kit',
};


const TRACK_SOURCE_OPTIONS: { id: TrackSourceMode; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'samples', label: 'Samples Only', icon: Disc3, description: 'Audio loops & sounds from libraries' },
  { id: 'midi', label: 'MIDI Only', icon: Piano, description: 'Generated musical patterns' },
  { id: 'hybrid', label: 'Both', icon: Music, description: 'Combine samples with MIDI' },
];

const MIDI_ROLE_OPTIONS: { id: MidiInstrumentRole; label: string; description: string }[] = [
  { id: 'pads', label: 'Pads', description: 'Atmospheric textures & drones' },
  { id: 'bass', label: 'Bass', description: 'Low-end foundation' },
  { id: 'melodic', label: 'Melodic', description: 'Lead melodies & arpeggios' },
  { id: 'drums', label: 'Percussion', description: 'Rhythmic elements' },
];

type PanelMode = 'generate' | 'score';
type ScoringMediaType = 'audio' | 'video';
type VideoInputMode = 'upload' | 'url';

const AIPromptPanel: React.FC<AIPromptPanelProps> = ({ onGenerate, onGenerateScore, onGenerateVideoScore, isLoading, onSkipToDAW, savedProjects = [], onLoadProject }) => {
  const [mode, setMode] = useState<PanelMode>('generate');
  const [params, setParams] = useState<GenerationParams>({
    prompt: '',
    mood: 'meditative',
    tempo: 60,
    trackSource: 'hybrid',
    midiRoles: ['pads', 'bass'],
  });

  // Genre instrument selection state
  const [selectedInstruments, setSelectedInstruments] = useState<number[]>([]);
  const [showInstrumentBrowser, setShowInstrumentBrowser] = useState(false);

  // Lyrics and reference audio state
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceLibraryOpen, setReferenceLibraryOpen] = useState(false);
  const [selectedLibraryTrack, setSelectedLibraryTrack] = useState<ReferenceTrack | null>(null);

  const [detectedInstruments, setDetectedInstruments] = useState<string[]>([]);

  const handleReferenceAutoApply = useCallback((applied: { bpm?: number; key?: string; genre?: string; mood?: string; instruments?: string[] }) => {
    setParams(prev => ({
      ...prev,
      ...(applied.bpm != null && { tempo: applied.bpm }),
      ...(applied.genre && { genre: applied.genre }),
      ...(applied.mood && { mood: applied.mood }),
    }));
    if (applied.genre) {
      const genreOpt = GENRE_OPTIONS.find(g => g.id === applied.genre);
      if (genreOpt) setSelectedInstruments([...genreOpt.suggestedInstruments]);
    }
    if (applied.instruments?.length) {
      setDetectedInstruments(applied.instruments);
    }
  }, []);

  const handleLibrarySelect = useCallback(async (track: ReferenceTrack) => {
    setSelectedLibraryTrack(track);
    setReferenceOpen(true);
    // Fetch the stored audio file so it can be used for generation
    try {
      const res = await fetch(track.storage_url);
      const blob = await res.blob();
      const file = new File([blob], track.name, { type: blob.type || 'audio/wav' });
      setReferenceFile(file);
    } catch (err) {
      console.warn('[AIPromptPanel] Failed to fetch library track audio:', err);
    }
    // Auto-apply metadata from library track
    const bpm = track.user_bpm ?? track.detected_bpm;
    const genre = track.genre;
    if (bpm || genre) {
      handleReferenceAutoApply({ bpm: bpm ? Math.round(bpm) : undefined, genre: genre || undefined });
    }
  }, [handleReferenceAutoApply]);

  // Scoring state - shared
  const [scoringMediaType, setScoringMediaType] = useState<ScoringMediaType>('audio');

  // Audio scoring state
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

  // Video scoring state
  const [videoInputMode, setVideoInputMode] = useState<VideoInputMode>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoContour, setVideoContour] = useState<VideoContourAnalysis | null>(null);
  const [videoAudioBuffer, setVideoAudioBuffer] = useState<AudioBuffer | null>(null);
  const [videoAnalyzing, setVideoAnalyzing] = useState(false);
  const [videoAnalysisProgress, setVideoAnalysisProgress] = useState<VideoAnalysisProgress | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

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
      const arrayBuffer = await file.arrayBuffer();
      setScoringAnalysisProgress(20);

      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      setScoringBuffer(audioBuffer);
      setScoringAnalysisProgress(40);

      const contour = await analyzeContour(audioBuffer, (progress) => {
        setScoringAnalysisProgress(40 + progress * 0.6);
      });

      setScoringContour(contour);
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

  // Video file handling
  const handleVideoFileSelect = useCallback(async (file: File) => {
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      console.error(validation.error);
      return;
    }

    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setVideoAnalyzing(true);
    setVideoContour(null);
    setVideoAudioBuffer(null);

    try {
      // Extract audio from video in parallel with video analysis
      const audioPromise = extractAudioFromVideo(file).catch(err => {
        console.warn('Could not extract audio from video:', err.message);
        return null;
      });

      const contour = await analyzeVideo(file, {}, (progress) => {
        setVideoAnalysisProgress(progress);
      });

      // Wait for audio extraction to complete
      const audioBuffer = await audioPromise;
      setVideoAudioBuffer(audioBuffer);

      setVideoContour(contour);
      if (contour.overallMood) setScoringMood(contour.overallMood);
    } catch (error) {
      console.error('Failed to analyze video:', error);
      setVideoFile(null);
      setVideoUrl('');
    } finally {
      setVideoAnalyzing(false);
      setVideoAnalysisProgress(null);
    }
  }, []);

  const handleVideoFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleVideoFileSelect(file);
  }, [handleVideoFileSelect]);

  const handleVideoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleVideoFileSelect(file);
  }, [handleVideoFileSelect]);

  const handleClearVideo = useCallback(() => {
    setVideoFile(null);
    setVideoUrl('');
    setVideoContour(null);
    setVideoAudioBuffer(null);
    if (videoFileInputRef.current) videoFileInputRef.current.value = '';
  }, []);

  // YouTube URL handling
  const handleYouTubeUrlChange = useCallback((url: string) => {
    setYoutubeUrl(url);
    const videoId = parseYouTubeUrl(url);
    setYoutubeVideoId(videoId);
  }, []);

  const handleClearYouTube = useCallback(() => {
    setYoutubeUrl('');
    setYoutubeVideoId(null);
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
  }, [scoringContour, scoringBuffer, scoringMood, scoringTrackSource, scoringVolumeMode, scoringInfluence, onGenerateScore]);

  const handleGenerateVideoScore = useCallback(async () => {
    if (!onGenerateVideoScore) return;

    // For uploaded videos with contour
    if (videoContour && videoUrl) {
      await onGenerateVideoScore({
        videoContour,
        videoUrl,
        videoAudioBuffer: videoAudioBuffer || undefined,
        mood: scoringMood,
        tempo: videoContour.suggestedTempo,
        trackSource: scoringTrackSource,
        volumeFollowMode: scoringVolumeMode,
        influenceStrength: scoringInfluence,
      });
    }
    // For YouTube URLs (no contour, manual sync)
    else if (youtubeVideoId) {
      // Create a minimal contour for YouTube (no frame analysis)
      const minimalContour: VideoContourAnalysis = {
        points: [],
        segments: [],
        totalDuration: 0,
        overallMood: scoringMood,
        paceProfile: 'moderate',
        suggestedTempo: 80,
        keyframes: [],
      };

      await onGenerateVideoScore({
        videoContour: minimalContour,
        videoUrl: '',
        youtubeUrl: youtubeUrl,
        mood: scoringMood,
        tempo: 80,
        trackSource: scoringTrackSource,
        volumeFollowMode: scoringVolumeMode,
        influenceStrength: scoringInfluence,
      });
    }
  }, [videoContour, videoUrl, videoAudioBuffer, youtubeVideoId, youtubeUrl, scoringMood, scoringTrackSource, scoringVolumeMode, scoringInfluence, onGenerateVideoScore]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      ...params,
      selectedInstruments: selectedInstruments.length > 0 ? selectedInstruments : undefined,
      referenceFile: referenceFile || undefined,
      referenceTags: selectedLibraryTrack?.tags?.length ? selectedLibraryTrack.tags : undefined,
      detectedInstruments: detectedInstruments.length > 0 ? detectedInstruments : undefined,
    });
  };

  const toggleMidiRole = (role: MidiInstrumentRole) => {
    setParams(prev => {
      const has = prev.midiRoles.includes(role);
      if (has) {
        // Don't allow removing all roles
        if (prev.midiRoles.length <= 1) return prev;
        return { ...prev, midiRoles: prev.midiRoles.filter(r => r !== role) };
      } else {
        return { ...prev, midiRoles: [...prev.midiRoles, role] };
      }
    });
  };

  const showMidiOptions = params.trackSource === 'midi' || params.trackSource === 'hybrid';

  return (
    <div className="w-full max-w-3xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-100">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
          {mode === 'generate' ? 'What Do You Need?' : scoringMediaType === 'audio' ? 'Score Your Audio' : 'Score Your Video'}
        </h2>
        <p className="text-slate-400 text-lg">
          {mode === 'generate'
            ? 'Choose your intention and describe the feeling you\'re seeking.'
            : scoringMediaType === 'audio'
              ? 'Upload audio and generate music that follows its dynamics.'
              : 'Upload video and generate music that matches the visual action.'}
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center">
        <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl">
          <button
            type="button"
            onClick={() => setMode('generate')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all",
              mode === 'generate'
                ? "bg-white text-black"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            )}
          >
            <Wand2 className="w-4 h-4" />
            Generate Session
          </button>
          <button
            type="button"
            onClick={() => setMode('score')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all",
              mode === 'score'
                ? "bg-[#F97316] text-white"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            )}
          >
            <FileAudio className="w-4 h-4" />
            AI Scoring
          </button>
        </div>
      </div>

      {/* Skip to DAW + Saved Projects */}
      <div className="flex flex-col items-center gap-3">
        {onSkipToDAW && (
          <button
            type="button"
            onClick={onSkipToDAW}
            className="text-white/30 hover:text-white/50 text-sm transition-colors underline underline-offset-2"
          >
            Skip to empty DAW
          </button>
        )}
        {savedProjects.length > 0 && onLoadProject && (
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/20">Recent Projects</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {savedProjects.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onLoadProject(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 hover:text-white/80 hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  <FolderOpen className="w-3 h-3" />
                  <span className="max-w-[120px] truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {mode === 'generate' ? (
      <form onSubmit={handleSubmit} className="grid gap-8">
        {/* Track source selection */}
        <div className="space-y-4">
          <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">Sound Sources</Label>
          <div className="grid grid-cols-3 gap-3">
            {TRACK_SOURCE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = params.trackSource === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setParams(prev => ({ ...prev, trackSource: option.id }))}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 cursor-pointer",
                    isActive
                      ? "bg-purple-500/30 border-purple-400 ring-1 ring-purple-400/50"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <Icon size={20} className={isActive ? "text-purple-400" : "text-slate-400"} />
                  <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-300'}`}>{option.label}</span>
                  <span className="text-[10px] text-slate-500 text-center">{option.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MIDI instrument selection (shown when MIDI or hybrid is selected) */}
        {showMidiOptions && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">
              {params.genre ? 'Instruments' : params.trackSource === 'midi' ? 'MIDI Instruments' : 'MIDI Instruments (samples fill the rest)'}
            </Label>

            {params.genre && selectedInstruments.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {selectedInstruments.map((program) => (
                    <button
                      key={program}
                      type="button"
                      onClick={() => {
                        if (selectedInstruments.length <= 1) return;
                        setSelectedInstruments(prev => prev.filter(p => p !== program));
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all group",
                        "bg-violet-500/30 border-violet-400 text-violet-300 ring-1 ring-violet-400/50",
                        selectedInstruments.length > 1 && "hover:bg-red-500/20 hover:border-red-400 hover:text-red-300"
                      )}
                    >
                      {GM_INSTRUMENT_NAMES[program] || `Program ${program}`}
                      {selectedInstruments.length > 1 && (
                        <X className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowInstrumentBrowser(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    More
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 ml-1">
                  Click an instrument to remove it. Use "+ More" to add from the full library.
                </p>
                <InstrumentSelectDialog
                  open={showInstrumentBrowser}
                  onOpenChange={setShowInstrumentBrowser}
                  suggestedPrograms={GENRE_OPTIONS.find(g => g.id === params.genre)?.suggestedInstruments}
                  currentProgram={-1}
                  onSelect={(program) => {
                    if (!selectedInstruments.includes(program)) {
                      setSelectedInstruments(prev => [...prev, program]);
                    }
                    setShowInstrumentBrowser(false);
                  }}
                />
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {MIDI_ROLE_OPTIONS.map((option) => {
                    const isActive = params.midiRoles.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleMidiRole(option.id)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200 cursor-pointer",
                          isActive
                            ? "bg-violet-500/30 border-violet-400 ring-1 ring-violet-400/50"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        )}
                      >
                        <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>{option.label}</span>
                        <span className="text-[9px] text-slate-500">{option.description}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 ml-1">
                  {params.trackSource === 'hybrid'
                    ? `MIDI will generate ${params.midiRoles.join(', ')}. Samples will fill remaining roles.`
                    : `All tracks will be MIDI: ${params.midiRoles.join(', ')}.`}
                </p>
              </>
            )}
          </div>
        )}

        {/* Genre Selection */}
        <div className="space-y-4">
          <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">Genre <span className="normal-case text-white/20">(optional)</span></Label>
          <div className="space-y-3">
            {Object.entries(GENRE_CATEGORIES).map(([category, genres]) => (
              <div key={category}>
                <span className="text-[9px] text-white/30 uppercase tracking-wider ml-1 font-semibold">{category}</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {genres.map((genre) => (
                    <button
                      key={genre.id}
                      type="button"
                      onClick={() => {
                        const isActive = params.genre === genre.id;
                        const mid = Math.round((genre.bpmRange[0] + genre.bpmRange[1]) / 2);
                        setParams(prev => ({
                          ...prev,
                          genre: isActive ? undefined : genre.id,
                          tempo: isActive ? prev.tempo : mid,
                        }));
                        setSelectedInstruments(isActive ? [] : [...genre.suggestedInstruments]);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                        params.genre === genre.id
                          ? "bg-purple-500/30 border-purple-400 text-purple-300 ring-1 ring-purple-400/50"
                          : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70"
                      )}
                    >
                      {genre.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vibe, Atmosphere, BPM row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">The Vibe</Label>
            <div className="relative">
              <Input
                placeholder="e.g. Moonlight over a still lake..."
                value={params.prompt}
                onChange={(e) => setParams({...params, prompt: e.target.value})}
                className="pl-12 h-14 text-sm rounded-2xl border-white/10 bg-white/5 focus-visible:ring-primary/40 focus-visible:bg-white/10 transition-all placeholder:text-slate-600 text-white"
                required={!referenceFile}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-3">
              <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">Atmosphere</Label>
              <Select value={params.mood} onValueChange={(v) => setParams({...params, mood: v})}>
                <SelectTrigger className="rounded-2xl h-14 bg-white/5 border-white/10 text-slate-200">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-slate-200 max-h-[300px]">
                  {Object.entries(MOOD_GROUPS).map(([group, moods]) => (
                    <SelectGroup key={group}>
                      <SelectLabelUI className="text-[9px] text-white/30 uppercase tracking-wider">{group}</SelectLabelUI>
                      {moods.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">BPM</Label>
              <Select value={params.tempo.toString()} onValueChange={(v) => setParams({...params, tempo: parseInt(v)})}>
                <SelectTrigger className="rounded-2xl h-14 bg-white/5 border-white/10 text-slate-200">
                  <SelectValue placeholder="BPM" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-slate-200">
                  <SelectItem value="40">40 Zen</SelectItem>
                  <SelectItem value="60">60 Slow</SelectItem>
                  <SelectItem value="80">80 Flow</SelectItem>
                  <SelectItem value="100">100 Active</SelectItem>
                  <SelectItem value="120">120 Energized</SelectItem>
                  <SelectItem value="140">140 Driving</SelectItem>
                  <SelectItem value="160">160 Fast</SelectItem>
                  <SelectItem value="180">180 Intense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">Duration</Label>
              <Select value={(params.duration || 30).toString()} onValueChange={(v) => setParams({...params, duration: parseInt(v)})}>
                <SelectTrigger className="rounded-2xl h-14 bg-white/5 border-white/10 text-slate-200">
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-slate-200">
                  <SelectItem value="30">30s Short</SelectItem>
                  <SelectItem value="60">60s Medium</SelectItem>
                  <SelectItem value="120">2min Long</SelectItem>
                  <SelectItem value="240">4min Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Collapsible Lyrics Section */}
        <div className="border border-white/10 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setLyricsOpen(!lyricsOpen)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest font-bold">
              <Type size={14} />
              Lyrics (optional)
            </span>
            <ChevronDown size={16} className={cn("text-white/30 transition-transform", lyricsOpen && "rotate-180")} />
          </button>
          {lyricsOpen && (
            <div className="px-5 pb-4 space-y-2">
              <textarea
                value={params.lyrics || ''}
                onChange={(e) => setParams({...params, lyrics: e.target.value})}
                placeholder={"[Verse]\nYour lyrics here...\n\n[Chorus]\nChorus lyrics..."}
                rows={6}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
              />
              <p className="text-[10px] text-white/30 ml-1">Use [Verse], [Chorus], [Bridge] markers. Leave empty for instrumental.</p>
            </div>
          )}
        </div>

        {/* Collapsible Reference Audio Section */}
        <div className="border border-white/10 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setReferenceOpen(!referenceOpen)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest font-bold">
              <Disc3 size={14} />
              Reference Audio (optional)
            </span>
            <ChevronDown size={16} className={cn("text-white/30 transition-transform", referenceOpen && "rotate-180")} />
          </button>
          {referenceOpen && (
            <div className="px-5 pb-4">
              <ReferenceAnalysisPanel
                referenceFile={referenceFile}
                onReferenceFileChange={(file) => {
                  setReferenceFile(file);
                  if (!file) setSelectedLibraryTrack(null);
                }}
                onAutoApply={handleReferenceAutoApply}
                onGenerateFromAnalysis={(analysisParams) => {
                  onGenerate({
                    prompt: '',
                    mood: analysisParams.mood,
                    tempo: analysisParams.bpm,
                    trackSource: 'samples',
                    midiRoles: [],
                    duration: analysisParams.duration,
                    referenceFile: analysisParams.referenceFile,
                    detectedInstruments: analysisParams.instruments,
                    genre: analysisParams.genre || undefined,
                  });
                }}
                isGenerating={isLoading}
                onOpenLibrary={() => setReferenceLibraryOpen(true)}
                libraryTrack={selectedLibraryTrack}
                onClearLibraryTrack={() => {
                  setSelectedLibraryTrack(null);
                  setReferenceFile(null);
                }}
              />
            </div>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
          className="w-full h-16 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-primary/20 transition-all duration-300 bg-white text-black hover:bg-slate-200 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-3 border-black/30 border-t-black rounded-full animate-spin" />
              Building Your Session...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Wand2 className="h-6 w-6" />
              Generate Session
            </div>
          )}
        </Button>
      </form>
      ) : (
      /* AI Scoring Mode */
      <div className="grid gap-6">
        {/* Media Type Toggle (Audio/Video) */}
        <div className="flex justify-center">
          <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
            <button
              type="button"
              onClick={() => setScoringMediaType('audio')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                scoringMediaType === 'audio'
                  ? "bg-[#F97316] text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <FileAudio className="w-4 h-4" />
              Audio
            </button>
            <button
              type="button"
              onClick={() => setScoringMediaType('video')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                scoringMediaType === 'video'
                  ? "bg-purple-500 text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <Video className="w-4 h-4" />
              Video
            </button>
          </div>
        </div>

        {/* Audio Scoring */}
        {scoringMediaType === 'audio' && (
        <div className="grid gap-6">
        {/* File Upload Area */}
        {!scoringFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center cursor-pointer hover:border-[#F97316] hover:bg-[#F97316]/5 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Upload className="w-12 h-12 mx-auto mb-4 text-white/30" />
            <p className="text-lg text-white/60 mb-2">Drop your audio file here</p>
            <p className="text-sm text-white/30 mb-4">or click to browse</p>
            <p className="text-xs text-white/20">Supports MP3, WAV, OGG, M4A, FLAC • Speech, meditation, podcasts</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Info */}
            <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
              <FileAudio className="w-8 h-8 text-[#F97316] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-lg text-white truncate">{scoringFile.name}</p>
                <p className="text-sm text-white/40">
                  {(scoringFile.size / (1024 * 1024)).toFixed(1)} MB
                  {scoringBuffer && ` • ${Math.floor(scoringBuffer.duration / 60)}:${Math.floor(scoringBuffer.duration % 60).toString().padStart(2, '0')}`}
                </p>
              </div>
              <button
                onClick={handleClearFile}
                className="p-2 text-white/40 hover:text-white/70 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Analysis Progress */}
            {scoringAnalyzing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#F97316]" />
                  <span className="text-sm text-white/60">Analyzing audio contour...</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F97316] transition-all duration-300"
                    style={{ width: `${scoringAnalysisProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Contour Visualization & Settings */}
            {scoringContour && scoringBuffer && (
              <>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <ContourVisualization
                    buffer={scoringBuffer}
                    contour={scoringContour}
                    width={640}
                    height={120}
                    showSegments
                    showWaveform
                  />
                </div>

                {/* Stats */}
                <ContourStats contour={scoringContour} />

                {/* Segment Preview */}
                <div>
                  <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold mb-2 block">
                    Detected Segments ({scoringContour.segments.length})
                  </Label>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <ContourSegmentList segments={scoringContour.segments} compact />
                  </div>
                </div>

                {/* Generation Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Mood Selector */}
                  <div className="space-y-3">
                    <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">Music Mood</Label>
                    <Select value={scoringMood} onValueChange={setScoringMood}>
                      <SelectTrigger className="rounded-2xl h-14 bg-white/5 border-white/10 text-slate-200">
                        <SelectValue placeholder="Select mood" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10 text-slate-200 max-h-[300px]">
                        {Object.entries(MOOD_GROUPS).map(([group, moods]) => (
                          <SelectGroup key={group}>
                            <SelectLabelUI className="text-[9px] text-white/30 uppercase tracking-wider">{group}</SelectLabelUI>
                            {moods.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Track Source */}
                  <div className="space-y-3">
                    <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">Music Source</Label>
                    <div className="flex gap-2">
                      {(['midi', 'samples', 'hybrid'] as const).map((source) => (
                        <button
                          key={source}
                          type="button"
                          onClick={() => setScoringTrackSource(source)}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-sm font-semibold border transition-all",
                            scoringTrackSource === source
                              ? "bg-[#F97316]/20 border-[#F97316] text-[#F97316]"
                              : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                          )}
                        >
                          {source === 'midi' ? 'MIDI' : source === 'samples' ? 'Samples' : 'Both'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Volume Following Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Volume Follow Mode */}
                  <div className="space-y-3">
                    <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">Volume Following</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setScoringVolumeMode('duck')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all",
                          scoringVolumeMode === 'duck'
                            ? "bg-blue-500/20 border-blue-400 text-blue-400"
                            : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                        )}
                      >
                        <VolumeX className="w-4 h-4" />
                        Duck
                      </button>
                      <button
                        type="button"
                        onClick={() => setScoringVolumeMode('swell')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all",
                          scoringVolumeMode === 'swell'
                            ? "bg-green-500/20 border-green-400 text-green-400"
                            : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                        )}
                      >
                        <Volume2 className="w-4 h-4" />
                        Swell
                      </button>
                    </div>
                    <p className="text-xs text-white/30 ml-1">
                      {scoringVolumeMode === 'duck'
                        ? 'Music quiets when speech is loud'
                        : 'Music intensifies with speech'}
                    </p>
                  </div>

                  {/* Influence Strength */}
                  <div className="space-y-3">
                    <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">
                      Influence: {Math.round(scoringInfluence * 100)}%
                    </Label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={scoringInfluence}
                      onChange={(e) => setScoringInfluence(parseFloat(e.target.value))}
                      className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#F97316] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg mt-4"
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  type="button"
                  size="lg"
                  disabled={isLoading || !scoringContour}
                  onClick={handleGenerateScore}
                  className="w-full h-16 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-[#F97316]/20 transition-all duration-300 bg-[#F97316] text-white hover:bg-[#F97316]/90 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Generating Score...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Wand2 className="h-6 w-6" />
                      Generate Music Score
                    </div>
                  )}
                </Button>
              </>
            )}
          </div>
        )}
        </div>
        )}

        {/* Video Scoring */}
        {scoringMediaType === 'video' && (
        <div className="grid gap-6">
          {/* Video Input Mode Toggle */}
          <div className="flex justify-center">
            <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setVideoInputMode('upload')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  videoInputMode === 'upload'
                    ? "bg-purple-500 text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                )}
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setVideoInputMode('url')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  videoInputMode === 'url'
                    ? "bg-purple-500 text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                )}
              >
                <Link className="w-4 h-4" />
                YouTube URL
              </button>
            </div>
          </div>

          {/* Video Upload Mode */}
          {videoInputMode === 'upload' && (
            <>
              {!videoFile ? (
                <div
                  onDrop={handleVideoDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => videoFileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-500/5 transition-all"
                >
                  <input
                    ref={videoFileInputRef}
                    type="file"
                    accept="video/*,.mp4,.webm,.mov,.avi"
                    onChange={handleVideoFileInputChange}
                    className="hidden"
                  />
                  <Video className="w-12 h-12 mx-auto mb-4 text-white/30" />
                  <p className="text-lg text-white/60 mb-2">Drop your video file here</p>
                  <p className="text-sm text-white/30 mb-4">or click to browse</p>
                  <p className="text-xs text-white/20">Supports MP4, WebM, MOV • Max 100MB, 5 min</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Video Info */}
                  <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <Video className="w-8 h-8 text-purple-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-lg text-white truncate">{videoFile.name}</p>
                      <p className="text-sm text-white/40">
                        {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                        {videoContour && ` • ${Math.floor(videoContour.totalDuration / 60)}:${Math.floor(videoContour.totalDuration % 60).toString().padStart(2, '0')}`}
                        {videoAudioBuffer && ` • Audio extracted`}
                      </p>
                    </div>
                    <button
                      onClick={handleClearVideo}
                      className="p-2 text-white/40 hover:text-white/70 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Analysis Progress */}
                  {videoAnalyzing && videoAnalysisProgress && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                        <span className="text-sm text-white/60">{videoAnalysisProgress.message}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all duration-300"
                          style={{ width: `${videoAnalysisProgress.progress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Video Contour Results */}
                  {videoContour && (
                    <>
                      {/* Video Preview */}
                      <div className="aspect-video bg-black rounded-2xl overflow-hidden">
                        <video
                          src={videoUrl}
                          className="w-full h-full object-contain"
                          controls
                        />
                      </div>

                      {/* Contour Visualization */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <VideoContourVisualization
                          contour={videoContour}
                          width={640}
                          height={100}
                          showKeyframes
                          showSegments
                        />
                      </div>

                      {/* Stats */}
                      <VideoContourStats contour={videoContour} />

                      {/* Segments */}
                      <div>
                        <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold mb-2 block">
                          Detected Scenes ({videoContour.segments.length})
                        </Label>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                          <VideoSegmentList segments={videoContour.segments} compact />
                        </div>
                      </div>

                      {/* Generation Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">Music Mood</Label>
                          <Select value={scoringMood} onValueChange={setScoringMood}>
                            <SelectTrigger className="rounded-2xl h-14 bg-white/5 border-white/10 text-slate-200">
                              <SelectValue placeholder="Select mood" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-white/10 text-slate-200 max-h-[300px]">
                              {Object.entries(MOOD_GROUPS).map(([group, moods]) => (
                                <SelectGroup key={group}>
                                  <SelectLabelUI className="text-[9px] text-white/30 uppercase tracking-wider">{group}</SelectLabelUI>
                                  {moods.map(m => (
                                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">Music Source</Label>
                          <div className="flex gap-2">
                            {(['midi', 'samples', 'hybrid'] as const).map((source) => (
                              <button
                                key={source}
                                type="button"
                                onClick={() => setScoringTrackSource(source)}
                                className={cn(
                                  "flex-1 py-3 rounded-xl text-sm font-semibold border transition-all",
                                  scoringTrackSource === source
                                    ? "bg-purple-500/20 border-purple-400 text-purple-400"
                                    : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                                )}
                              >
                                {source === 'midi' ? 'MIDI' : source === 'samples' ? 'Samples' : 'Both'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Volume Following */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">Motion Following</Label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setScoringVolumeMode('duck')}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all",
                                scoringVolumeMode === 'duck'
                                  ? "bg-blue-500/20 border-blue-400 text-blue-400"
                                  : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                              )}
                            >
                              <VolumeX className="w-4 h-4" />
                              Subtle
                            </button>
                            <button
                              type="button"
                              onClick={() => setScoringVolumeMode('swell')}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all",
                                scoringVolumeMode === 'swell'
                                  ? "bg-green-500/20 border-green-400 text-green-400"
                                  : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                              )}
                            >
                              <Volume2 className="w-4 h-4" />
                              Dynamic
                            </button>
                          </div>
                          <p className="text-xs text-white/30 ml-1">
                            {scoringVolumeMode === 'duck'
                              ? 'Music stays subtle during action'
                              : 'Music intensifies with action'}
                          </p>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">
                            Influence: {Math.round(scoringInfluence * 100)}%
                          </Label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={scoringInfluence}
                            onChange={(e) => setScoringInfluence(parseFloat(e.target.value))}
                            className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg mt-4"
                          />
                        </div>
                      </div>

                      {/* Generate Button */}
                      <Button
                        type="button"
                        size="lg"
                        disabled={isLoading || !videoContour}
                        onClick={handleGenerateVideoScore}
                        className="w-full h-16 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 bg-purple-500 text-white hover:bg-purple-500/90 disabled:opacity-50"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Generating Score...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Wand2 className="h-6 w-6" />
                            Generate Video Score
                          </div>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* YouTube URL Mode */}
          {videoInputMode === 'url' && (
            <div className="space-y-6">
              {/* URL Input */}
              <div className="space-y-3">
                <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">YouTube URL</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => handleYouTubeUrlChange(e.target.value)}
                    className="flex-1 h-14 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-600"
                  />
                  {youtubeUrl && (
                    <button
                      onClick={handleClearYouTube}
                      className="px-4 text-white/40 hover:text-white/70 hover:bg-white/10 rounded-2xl transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* YouTube Preview */}
              {youtubeVideoId && (
                <>
                  <div className="aspect-video bg-black rounded-2xl overflow-hidden">
                    <iframe
                      src={getYouTubeEmbedUrl(youtubeVideoId)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 text-sm text-purple-300">
                    <p className="font-medium mb-1">Manual Sync Mode</p>
                    <p className="text-purple-300/70">
                      YouTube videos use manual sync. Position the video where you want the music to start,
                      then generate your score. During playback, control the video manually.
                    </p>
                  </div>

                  {/* Generation Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">Music Mood</Label>
                      <Select value={scoringMood} onValueChange={setScoringMood}>
                        <SelectTrigger className="rounded-2xl h-14 bg-white/5 border-white/10 text-slate-200">
                          <SelectValue placeholder="Select mood" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-white/10 text-slate-200">
                          <SelectItem value="cinematic">Cinematic</SelectItem>
                          <SelectItem value="dramatic">Dramatic</SelectItem>
                          <SelectItem value="uplifting">Uplifting</SelectItem>
                          <SelectItem value="tense">Tense</SelectItem>
                          <SelectItem value="peaceful">Peaceful</SelectItem>
                          <SelectItem value="melancholic">Melancholic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-400 text-xs uppercase tracking-widest ml-1 font-bold">Music Source</Label>
                      <div className="flex gap-2">
                        {(['midi', 'samples', 'hybrid'] as const).map((source) => (
                          <button
                            key={source}
                            type="button"
                            onClick={() => setScoringTrackSource(source)}
                            className={cn(
                              "flex-1 py-3 rounded-xl text-sm font-semibold border transition-all",
                              scoringTrackSource === source
                                ? "bg-purple-500/20 border-purple-400 text-purple-400"
                                : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                            )}
                          >
                            {source === 'midi' ? 'MIDI' : source === 'samples' ? 'Samples' : 'Both'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button
                    type="button"
                    size="lg"
                    disabled={isLoading}
                    onClick={handleGenerateVideoScore}
                    className="w-full h-16 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 bg-purple-500 text-white hover:bg-purple-500/90 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Generating Score...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-6 w-6" />
                        Generate Music for Video
                      </div>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        )}
      </div>
      )}

      {/* Reference Library Dialog */}
      <ReferenceLibraryDialog
        open={referenceLibraryOpen}
        onOpenChange={setReferenceLibraryOpen}
        onSelect={handleLibrarySelect}
      />
    </div>
  );
};

export default AIPromptPanel;
