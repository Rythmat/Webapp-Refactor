import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DAWHeader from '@/studio-daw/components/DAWHeader';
import DAWTimeline from '@/studio-daw/components/DAWTimeline';
import DAWTrackControls from '@/studio-daw/components/DAWTrackControls';
import AIPromptPanel, { GenerationParams, ScoringParams as AIPromptScoringParams, VideoScoringParams, GENRE_OPTIONS } from '@/studio-daw/components/AIPromptPanel';
import SaveProjectDialog from '@/studio-daw/components/SaveProjectDialog';
import AddTrackDialog, { type ScoringParams } from '@/studio-daw/components/AddTrackDialog';
import VideoPreview from '@/studio-daw/components/VideoPreview';
import { useAudioEngine, Track, TrackType } from '@/studio-daw/hooks/use-audio-engine';
import { useExport } from '@/studio-daw/hooks/use-export';
import { useProjects, loadProjectTracks } from '@/studio-daw/hooks/use-projects';
import { assessCompatibility } from '@/studio-daw/audio/compatibility';
import { showSuccess, showError } from '@/studio-daw/utils/toast';
import { generateSession, generateTrackFromPrompt, generateExtension, generateInstrumentStem, searchSoundEffect, generateScoreFromContour, type CuratedTrack } from '../services/ai-curation';
import { uploadToGradio } from '@/studio-daw/services/gradio-upload';
import { audioBufferToWavBlob } from '@/studio-daw/utils/audio-buffer-to-blob';
import ExtendClipDialog from '@/studio-daw/components/ExtendClipDialog';
import ExtendAllDialog from '@/studio-daw/components/ExtendAllDialog';
import type { ExtendAllResult } from '@/studio-daw/components/ExtendAllDialog';
import { generateScoreFromVideo } from '@/studio-daw/services/video-analysis';
import { type VideoContourAnalysis } from '@/studio-daw/audio/video-contour-analysis';
import { analyzeContour } from '@/studio-daw/audio/contour-analysis';
import { extractAudioFromVideo } from '@/studio-daw/utils/video-keyframes';
import { useAuthActions } from '@/contexts/AuthContext/hooks/useAuthActions';
import MidiPianoRoll from '@/studio-daw/components/MidiPianoRoll';
import SynthPanel from '@/studio-daw/components/SynthPanel';
import InstrumentSelectDialog from '@/studio-daw/components/InstrumentSelectDialog';
import { encodeDrumKitProgram } from '@/studio-daw/audio/midi-engine';
import DeviceSelectDialog from '@/studio-daw/components/DeviceSelectDialog';
import ReferenceLibraryDialog from '@/studio-daw/components/ReferenceLibraryDialog';
import StemSeparationDialog from '@/studio-daw/components/StemSeparationDialog';
import GenerateStemDialog from '@/studio-daw/components/GenerateStemDialog';
import type { StemGenerationParams } from '@/studio-daw/components/GenerateStemDialog';
import { separateStems, type StemType } from '@/studio-daw/services/stem-separation';
import { generateAutoMix } from '@/studio-daw/audio/auto-mixer';
import { generateMasteringChain } from '@/studio-daw/audio/auto-master';
import type { ReferenceTrack } from '@/studio-daw/types/reference-library';
import { useRecording } from '@/studio-daw/hooks/use-recording';
import { useSynthEngine } from '@/studio-daw/hooks/use-synth-engine';
import type { MidiClipData } from '@/studio-daw/audio/midi-engine';
import type { SynthPreset } from '@/studio-daw/audio/synth-engine';
import { convertAudioToMidi } from '@/studio-daw/audio/pitch-detection';

/** Slice an AudioBuffer from startSec to endSec, returning a new buffer */
function sliceAudioBuffer(buffer: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const startSample = Math.floor(startSec * sampleRate);
  const endSample = Math.min(Math.floor(endSec * sampleRate), buffer.length);
  const length = endSample - startSample;
  if (length <= 0) return buffer;

  const ctx = new OfflineAudioContext(buffer.numberOfChannels, length, sampleRate);
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, length, sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = newBuffer.getChannelData(ch);
    dst.set(src.subarray(startSample, endSample));
  }
  return newBuffer;
}

/** Apply a short fade-in ramp to smooth extension transitions */
function applyFadeIn(buffer: AudioBuffer, fadeSec: number): void {
  const fadeSamples = Math.min(Math.floor(fadeSec * buffer.sampleRate), buffer.length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < fadeSamples; i++) {
      data[i] *= i / fadeSamples;
    }
  }
}

const ROLE_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  harmonic: 'Harmonic',
  melodic: 'Melodic',
  rhythmic: 'Rhythmic',
  atmosphere: 'Atmosphere',
};

const Index = () => {
  const { signOut } = useAuthActions();
  const {
    tracks, setTracks, transportState, isPlaying, currentTime,
    play, pause, stop, seekForward, seekBackward, seekTo,
    addTrack, addMidiTrack, addReferenceTrack, updateReferenceTrackSettings, linkTracksToReference,
    addEmptyTrack, removeTrack,
    splitClip, duplicateClip, deleteClip, moveClip, updateMidiClip, updateClipFades,
    addEffect, removeEffect, updateEffect, toggleEffect,
    applyTransformToClip,
    loadTrackBuffer,
    changeMidiInstrument,
    masterEffects, setMasterEffects,
    addMasterEffect, removeMasterEffect, updateMasterEffect, toggleMasterEffect,
    addRecordedTrack, addRecordedClipToTrack, getAudioContext,
    loopEnabled, loopStart, loopEnd, toggleLoop, setLoopRegion, setLoopEnabled,
  } = useAudioEngine();
  const { exportAsWav, exportAsZip, shareMix } = useExport();
  const { savedProjects, saveProject, deleteProject } = useProjects();
  const { updateSynthPreset, updateSynthNotes } = useSynthEngine({ setTracks });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingTrack, setIsGeneratingTrack] = useState(false);
  const [hasProject, setHasProject] = useState(false);
  const [currentProjectName, setCurrentProjectName] = useState("My Session");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [addTrackDialogOpen, setAddTrackDialogOpen] = useState(false);
  const [refLibraryDialogOpen, setRefLibraryDialogOpen] = useState(false);
  const [projectBPM, setProjectBPM] = useState(60);
  const [projectGenre, setProjectGenre] = useState<string | undefined>(undefined);
  const [pianoRollState, setPianoRollState] = useState<{ trackId: string; clipId: string } | null>(null);
  const [synthPanelState, setSynthPanelState] = useState<{ trackId: string; clipId: string } | null>(null);
  const [instrumentSelectState, setInstrumentSelectState] = useState<{ trackId: string; clipId: string } | null>(null);
  const [stemSeparationState, setStemSeparationState] = useState<{ trackId: string; clipId: string } | null>(null);
  const [generateStemDialogOpen, setGenerateStemDialogOpen] = useState(false);
  const [videoPreviewData, setVideoPreviewData] = useState<{
    videoUrl?: string;
    youtubeUrl?: string;
    videoContour?: VideoContourAnalysis;
  } | null>(null);
  const compatCheckDone = useRef(false);

  const recording = useRecording({
    getAudioContext,
    transportState,
    currentTime,
    tracks,
    bpm: projectBPM,
    play,
    stop,
    loopEnabled,
    setLoopEnabled,
    addEmptyTrack,
    removeTrack,
    addRecordedTrack,
    addRecordedClipToTrack,
    setTracks,
  });

  // Run compatibility check once analysis data is available
  useEffect(() => {
    if (!hasProject || compatCheckDone.current) return;
    const analyses = tracks.map(t => t.clips[0]?.analysis);
    const hasAnalyses = analyses.filter(Boolean).length >= 2;
    if (!hasAnalyses) return;

    compatCheckDone.current = true;
    const report = assessCompatibility(analyses);
    if (report.overallScore < 70 && report.issues.length > 0) {
      const topIssue = report.issues[0];
      showError(`Mix compatibility: ${report.overallScore}/100 — ${topIssue.description}`);
    }
  }, [tracks, hasProject]);

  const handleGenerate = async (params: GenerationParams) => {
    setIsGenerating(true);
    compatCheckDone.current = false;
    setProjectBPM(params.tempo);
    setProjectGenre(params.genre);
    try {
      const curated = await generateSession(params);
      if (curated.length === 0) throw new Error("No matching sounds found");

      setTracks([]);

      // Track results for applying volume/pan after all tracks are created
      const trackResults: { index: number; curated: CuratedTrack }[] = [];

      for (let i = 0; i < curated.length; i++) {
        const item = curated[i];
        const roleName = item.role ? ROLE_LABELS[item.role] || item.role : '';
        const trackName = roleName ? `${roleName} — ${item.name}` : item.name;

        if (item.type === 'midi') {
          // Create MIDI track
          const midiData: MidiClipData = {
            notes: item.notes,
            program: item.program,
            bankMSB: 0,
            bankLSB: 0,
            totalDuration: item.totalDuration,
          };
          await addMidiTrack(trackName, midiData, item.role);
          trackResults.push({ index: i, curated: item });
        } else {
          // Create audio track (default for items without type or type: 'audio')
          await addTrack(trackName, item.url, item.role);
          trackResults.push({ index: i, curated: item });
        }
      }

      // Apply AI-suggested volume and pan
      setTracks(prev => prev.map((track, i) => {
        const result = trackResults[i];
        if (!result) return track;
        const suggestion = result.curated;
        return {
          ...track,
          volume: suggestion.suggestedVolume ?? track.volume,
          pan: suggestion.suggestedPan ?? track.pan,
        };
      }));

      setHasProject(true);
      const midiCount = curated.filter(t => t.type === 'midi').length;
      const audioCount = curated.filter(t => t.type !== 'midi').length;
      showSuccess(`Session generated! ${midiCount > 0 ? `${midiCount} MIDI` : ''}${midiCount > 0 && audioCount > 0 ? ' + ' : ''}${audioCount > 0 ? `${audioCount} audio` : ''} tracks`);
    } catch (err: any) {
      showError(err.message || "Failed to curate sounds. Check your API keys.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProject = () => {
    if (tracks.length === 0) return;
    setSaveDialogOpen(true);
  };

  const handleConfirmSave = async (name: string) => {
    setCurrentProjectName(name);
    const saved = await saveProject(
      name,
      tracks,
      videoPreviewData ? {
        youtubeUrl: videoPreviewData.youtubeUrl,
        videoContour: videoPreviewData.videoContour,
      } : undefined,
      projectBPM,
      masterEffects,
      currentProjectId,
    );
    if (saved?.id) {
      setCurrentProjectId(saved.id);
    }
  };

  const handleShare = async () => {
    if (tracks.length === 0 || isSharing) return;
    setIsSharing(true);
    try {
      const url = await shareMix(tracks, currentProjectName, masterEffects);
      if (url) {
        await navigator.clipboard.writeText(url);
        showSuccess("Share link copied to clipboard!");
      } else {
        showError("Failed to create share link");
      }
    } catch (err) {
      console.error('[Share] Error:', err);
      showError("Failed to create share link");
    } finally {
      setIsSharing(false);
    }
  };

  // ── Stem Separation ──
  const handleStemSeparationConfirm = async (selectedStems: StemType[]) => {
    if (!stemSeparationState) return;
    const track = tracks.find(t => t.id === stemSeparationState.trackId);
    const clip = track?.clips.find(c => c.id === stemSeparationState.clipId);
    if (!clip?.buffer) return;

    const wavBlob = audioBufferToWavBlob(clip.buffer);
    const result = await separateStems(wavBlob, `${track!.name}.wav`);
    if (!result) {
      showError('Stem separation failed — the AI service may be busy');
      throw new Error('Stem separation failed');
    }

    const stemNames: Record<StemType, string> = {
      vocals: `Vocals - ${track!.name}`,
      drums: `Drums - ${track!.name}`,
      bass: `Bass - ${track!.name}`,
      other: `Other - ${track!.name}`,
    };

    let added = 0;
    for (const stem of selectedStems) {
      const url = result[stem];
      if (url) {
        await addTrack(stemNames[stem], url, stem);
        added++;
      }
    }

    if (added > 0) {
      showSuccess(`Separated into ${added} stems!`);
    } else {
      showError('No stems were returned');
    }
  };

  // ── AI Stem Generation (multi-instrument) ──
  const [stemGenProgress, setStemGenProgress] = useState('');
  const handleGenerateStem = async (params: StemGenerationParams) => {
    setIsGeneratingTrack(true);
    setStemGenProgress('');
    try {
      // SFX mode: search Freesound for real sound effects
      if (params.sfxQuery) {
        setStemGenProgress(`Searching for "${params.sfxQuery}"...`);
        const result = await searchSoundEffect(params.sfxQuery);
        if (result) {
          await addTrack(result.name, result.url);
          showSuccess(`Found sound effect: ${result.name}`);
        } else {
          showError(`No sound effects found for "${params.sfxQuery}"`);
        }
        return;
      }

      // Instrument stem mode
      let referenceAudio = null;
      if (params.referenceTrackId) {
        const refTrack = tracks.find(t => t.id === params.referenceTrackId);
        const refClip = refTrack?.clips[0];
        if (refClip?.buffer) {
          setStemGenProgress('Uploading reference audio...');
          const blob = audioBufferToWavBlob(refClip.buffer);
          referenceAudio = await uploadToGradio(blob, `${refTrack!.name}.wav`);
        }
      }

      const firstAnalysis = tracks.find(t => t.clips[0]?.analysis)?.clips[0]?.analysis;
      const sharedContext = {
        bpm: projectBPM,
        key: firstAnalysis?.key ?? undefined,
        genre: projectGenre,
        duration: params.duration,
        referenceAudio,
        styleGuidance: params.styleGuidance,
      };

      let successCount = 0;
      for (let i = 0; i < params.instruments.length; i++) {
        const instrument = params.instruments[i];
        setStemGenProgress(`Generating ${instrument} (${i + 1}/${params.instruments.length})...`);

        const result = await generateInstrumentStem(instrument, {
          ...sharedContext,
          onProgress: (stage) => setStemGenProgress(`${instrument} (${i + 1}/${params.instruments.length}): ${stage}`),
        });
        if (result) {
          await addTrack(`${instrument} - AI`, result.url, instrument);
          successCount++;
        }
      }

      if (successCount > 0) {
        showSuccess(`Generated ${successCount} stem${successCount !== 1 ? 's' : ''}!`);
      } else {
        showError('AI stem generation failed — try again');
      }
    } catch (err) {
      console.error('[GenerateStem]', err);
      showError('AI stem generation failed');
    } finally {
      setIsGeneratingTrack(false);
      setStemGenProgress('');
    }
  };

  // ── Auto Mix ──
  const handleAutoMix = useCallback(() => {
    const { suggestions, summary } = generateAutoMix(tracks);
    setTracks(prev => prev.map(track => {
      const suggestion = suggestions.find(s => s.trackId === track.id);
      if (!suggestion) return track;
      // Remove previous automix effects before applying new ones
      const nonAutoEffects = track.effects.filter(e => !e.id.startsWith('automix-'));
      return {
        ...track,
        volume: suggestion.volume,
        pan: suggestion.pan,
        effects: [...nonAutoEffects, ...suggestion.eqEffects],
      };
    }));
    showSuccess(`Auto Mix: ${summary}`);
  }, [tracks, setTracks]);

  // ── Auto Master ──
  const handleAutoMaster = useCallback(() => {
    const { effects, description } = generateMasteringChain('moderate');
    setMasterEffects(effects);
    showSuccess(`Mastering applied: ${description}`);
  }, [setMasterEffects]);

  const handleLoadProject = async (project: any) => {
    try {
      compatCheckDone.current = false;
      const result = await loadProjectTracks(project, loadTrackBuffer);
      setTracks(result.tracks);
      setHasProject(true);
      setCurrentProjectName(project.name);
      setCurrentProjectId(project.id);

      // Restore video preview data if saved
      if (result.videoData) {
        setVideoPreviewData({
          youtubeUrl: result.videoData.youtubeUrl,
          videoContour: result.videoData.videoContour,
          // videoUrl (blob URL) can't be restored - user can re-attach video file
        });
      }

      // Restore BPM
      if (result.bpm) {
        setProjectBPM(result.bpm);
      }

      // Restore master effects
      setMasterEffects(result.masterEffects ?? []);

      showSuccess(`Loaded: ${project.name}`);
    } catch (err: any) {
      showError("Failed to load project");
      console.error(err);
    }
  };

  const handleUpdateTrack = (id: string, updates: Partial<Track>) => {
    setTracks(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
  };

  const handleDeleteTrack = (id: string) => {
    removeTrack(id);
  };

  const handleAddTrackWithAudio = async (name: string, url: string) => {
    try {
      await addTrack(name, url);
      showSuccess(`Added track: ${name}`);
    } catch (err: any) {
      showError("Failed to load audio for new track");
    }
  };

  const handleAddEmptyTrack = (trackType: TrackType = 'audio', midiProgram?: number) => {
    const { trackId, clipId } = addEmptyTrack(trackType, midiProgram);
    if (trackType === 'midi' && clipId) {
      // Auto-open the piano roll for new MIDI tracks
      setPianoRollState({ trackId, clipId });
    }
    if (trackType === 'synth' && clipId) {
      // Auto-open the synth panel + piano roll for new synth tracks
      setSynthPanelState({ trackId, clipId });
      setPianoRollState({ trackId, clipId });
    }
  };

  const handleAddMidiTrack = async (name: string, midiData: MidiClipData) => {
    try {
      const result = await addMidiTrack(name, midiData);
      showSuccess(`Added MIDI track: ${name}`);
      if (result) {
        setPianoRollState({ trackId: result.trackId, clipId: result.clipId });
      }
    } catch (err: any) {
      showError("Failed to create MIDI track");
    }
  };

  const handleGenerateTrack = async (prompt: string, trackType: 'audio' | 'midi', options?: { lyrics?: string; duration?: number }) => {
    setIsGeneratingTrack(true);
    try {
      // Gather context from existing tracks
      const existingRoles = tracks
        .flatMap(t => t.clips.map(c => c.role))
        .filter(Boolean) as string[];
      const firstAnalysis = tracks.find(t => t.clips[0]?.analysis)?.clips[0]?.analysis;

      const result = await generateTrackFromPrompt(prompt, trackType, {
        bpm: projectBPM,
        key: firstAnalysis?.key || undefined,
        existingRoles,
        genre: projectGenre,
        lyrics: options?.lyrics,
        duration: options?.duration,
      });

      if (result.type === 'audio') {
        await addTrack(result.name, result.url);
        showSuccess(`Added AI audio track: ${result.name}`);
      } else if (result.type === 'midi') {
        const midiData: MidiClipData = {
          notes: result.notes,
          program: result.program,
          bankMSB: 0,
          bankLSB: 0,
          totalDuration: result.totalDuration,
        };
        const midiResult = await addMidiTrack(result.name, midiData);
        showSuccess(`Added AI MIDI track: ${result.name}`);
        if (midiResult) {
          setPianoRollState({ trackId: midiResult.trackId, clipId: midiResult.clipId });
        }
      }
    } catch (err: any) {
      showError(err.message || "Failed to generate track");
    } finally {
      setIsGeneratingTrack(false);
    }
  };

  const handleGenerateScore = async (params: ScoringParams) => {
    setIsGeneratingTrack(true);
    try {
      // 1. Add reference track with the uploaded audio and contour
      const refResult = addReferenceTrack(
        'Reference Audio',
        params.buffer,
        params.contour
      );

      // 2. Update reference track settings
      updateReferenceTrackSettings(refResult.trackId, {
        volumeFollowEnabled: true,
        volumeFollowMode: params.volumeFollowMode,
        influenceStrength: params.influenceStrength,
      });

      // 3. Generate music tracks from contour
      const scoreResult = await generateScoreFromContour({
        contour: params.contour,
        mood: params.mood,
        tempo: params.tempo,
        trackSource: params.trackSource,
      });

      // 4. Add generated tracks and link them to the reference
      const generatedTrackIds: string[] = [];

      for (const track of scoreResult.tracks) {
        if (track.type === 'midi' && track.notes && track.totalDuration) {
          const midiData: MidiClipData = {
            notes: track.notes,
            program: track.program ?? 89,
            bankMSB: 0,
            bankLSB: 0,
            totalDuration: track.totalDuration,
          };
          const midiResult = await addMidiTrack(track.name, midiData, track.role);
          if (midiResult) {
            generatedTrackIds.push(midiResult.trackId);
            // Apply suggested volume
            if (track.suggestedVolume) {
              setTracks(prev => prev.map(t =>
                t.id === midiResult.trackId ? { ...t, volume: track.suggestedVolume! } : t
              ));
            }
          }
        } else if (track.type === 'audio' && track.url) {
          await addTrack(track.name, track.url, track.role);
          // Note: We can't get the track ID from addTrack, but it's still added
        }
      }

      // 5. Link generated tracks to the reference track
      if (generatedTrackIds.length > 0) {
        linkTracksToReference(refResult.trackId, generatedTrackIds);
      }

      setHasProject(true);
      setProjectBPM(params.tempo);
      showSuccess(`AI Score generated! ${scoreResult.tracks.length} music track(s) + reference`);
    } catch (err: any) {
      showError(err.message || "Failed to generate score");
    } finally {
      setIsGeneratingTrack(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  // Handler for AI Scoring from the initial screen
  const handleGenerateScoreFromPrompt = async (params: AIPromptScoringParams) => {
    setIsGenerating(true);
    try {
      // Reuse the existing score generation logic
      const refResult = addReferenceTrack(
        'Reference Audio',
        params.buffer,
        params.contour
      );

      updateReferenceTrackSettings(refResult.trackId, {
        volumeFollowEnabled: true,
        volumeFollowMode: params.volumeFollowMode,
        influenceStrength: params.influenceStrength,
      });

      const scoreResult = await generateScoreFromContour({
        contour: params.contour,
        mood: params.mood,
        tempo: params.tempo,
        trackSource: params.trackSource,
      });

      const generatedTrackIds: string[] = [];

      for (const track of scoreResult.tracks) {
        if (track.type === 'midi' && track.notes && track.totalDuration) {
          const midiData: MidiClipData = {
            notes: track.notes,
            program: track.program ?? 89,
            bankMSB: 0,
            bankLSB: 0,
            totalDuration: track.totalDuration,
          };
          const midiResult = await addMidiTrack(track.name, midiData, track.role);
          if (midiResult) {
            generatedTrackIds.push(midiResult.trackId);
            if (track.suggestedVolume) {
              setTracks(prev => prev.map(t =>
                t.id === midiResult.trackId ? { ...t, volume: track.suggestedVolume! } : t
              ));
            }
          }
        } else if (track.type === 'audio' && track.url) {
          await addTrack(track.name, track.url, track.role);
        }
      }

      if (generatedTrackIds.length > 0) {
        linkTracksToReference(refResult.trackId, generatedTrackIds);
      }

      setHasProject(true);
      setProjectBPM(params.tempo);
      showSuccess(`AI Score generated! ${scoreResult.tracks.length} music track(s) + reference`);
    } catch (err: any) {
      showError(err.message || "Failed to generate score");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler for video-based AI scoring
  const handleGenerateVideoScore = async (params: VideoScoringParams) => {
    setIsGenerating(true);
    try {
      let referenceTrackId: string | null = null;
      const generatedTrackIds: string[] = [];

      // If we have video audio, add it as a reference track
      if (params.videoAudioBuffer) {
        // Analyze the video audio for contour following
        const audioContour = await analyzeContour(params.videoAudioBuffer);

        // Add as reference track
        const refResult = addReferenceTrack(
          'Video Audio',
          params.videoAudioBuffer,
          audioContour
        );
        referenceTrackId = refResult.trackId;

        // Configure reference track settings
        updateReferenceTrackSettings(refResult.trackId, {
          volumeFollowEnabled: true,
          volumeFollowMode: params.volumeFollowMode,
          influenceStrength: params.influenceStrength,
        });
      }

      // Generate music tracks from video contour
      const scoreResult = await generateScoreFromVideo(params.videoContour, {
        mood: params.mood,
        tempo: params.tempo,
        trackSource: params.trackSource,
      });

      // Add generated tracks
      for (const track of scoreResult.tracks) {
        if (track.type === 'midi' && track.notes && track.totalDuration) {
          const midiData: MidiClipData = {
            notes: track.notes,
            program: track.program ?? 89,
            bankMSB: 0,
            bankLSB: 0,
            totalDuration: track.totalDuration,
          };
          const midiResult = await addMidiTrack(track.name, midiData, track.role);
          if (midiResult) {
            generatedTrackIds.push(midiResult.trackId);
            if (track.suggestedVolume) {
              setTracks(prev => prev.map(t =>
                t.id === midiResult.trackId ? { ...t, volume: track.suggestedVolume! } : t
              ));
            }
          }
        } else if (track.type === 'audio' && track.url) {
          await addTrack(track.name, track.url, track.role);
        }
      }

      // Link generated tracks to the reference track for volume following
      if (referenceTrackId && generatedTrackIds.length > 0) {
        linkTracksToReference(referenceTrackId, generatedTrackIds);
      }

      // Show video preview for synced playback
      setVideoPreviewData({
        videoUrl: params.videoUrl,
        youtubeUrl: params.youtubeUrl,
        videoContour: params.videoContour,
      });

      setHasProject(true);
      setProjectBPM(params.tempo);

      const hasAudio = params.videoAudioBuffer ? ' + video audio' : '';
      showSuccess(`Video Score generated! ${scoreResult.tracks.length} music track(s)${hasAudio}`);
    } catch (err: any) {
      showError(err.message || "Failed to generate video score");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDoubleClickClip = (trackId: string, clipId: string) => {
    const track = tracks.find(t => t.id === trackId);
    const clip = track?.clips.find(c => c.id === clipId);
    if (track?.type === 'synth' && clip?.synthData) {
      setSynthPanelState({ trackId, clipId });
      setPianoRollState({ trackId, clipId });
    } else if (clip?.midiData) {
      setPianoRollState({ trackId, clipId });
    }
  };

  const handleChangeMidiInstrument = (trackId: string, clipId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track?.type === 'midi') {
      setInstrumentSelectState({ trackId, clipId });
    }
  };

  // Extend clip state
  const [extendClipState, setExtendClipState] = useState<{ trackId: string; clipId: string } | null>(null);
  const extendClip = extendClipState
    ? tracks.find(t => t.id === extendClipState.trackId)?.clips.find(c => c.id === extendClipState.clipId)
    : null;
  const extendTrack = extendClipState
    ? tracks.find(t => t.id === extendClipState.trackId)
    : null;

  const handleExtendClip = (trackId: string, clipId: string) => {
    setExtendClipState({ trackId, clipId });
  };

  const handleConvertToMidi = useCallback(async (trackId: string, clipId: string) => {
    const track = tracks.find(t => t.id === trackId);
    const clip = track?.clips.find(c => c.id === clipId);
    if (!clip?.buffer) return;

    try {
      showSuccess('Analyzing audio for pitch detection...');
      const midiData = await convertAudioToMidi(clip.buffer);

      if (midiData.notes.length === 0) {
        showError('No pitched content detected in this clip');
        return;
      }

      const result = await addMidiTrack(`${clip.name} (MIDI)`, midiData);
      if (result) {
        showSuccess(`Converted to MIDI: ${midiData.notes.length} notes detected`);
      }
    } catch (err) {
      console.error('[ConvertToMidi] Error:', err);
      showError('Failed to convert audio to MIDI');
    }
  }, [tracks, addMidiTrack]);

  const handleExtendConfirm = async (targetDuration: number, prompt: string) => {
    if (!extendClip?.buffer || !extendTrack || !extendClipState) throw new Error('No audio buffer');

    const wavBlob = audioBufferToWavBlob(extendClip.buffer);
    const fileRef = await uploadToGradio(wavBlob, `${extendTrack.name}.wav`);
    if (!fileRef) throw new Error('Failed to upload audio to server');

    const analysis = extendClip.analysis;
    const result = await generateExtension(
      fileRef,
      extendClip.duration,
      targetDuration,
      prompt || extendTrack.name,
      {
        bpm: projectBPM,
        genre: projectGenre,
        key: analysis?.key || undefined,
        rmsLevel: analysis?.rmsLevel,
        spectralCentroid: analysis?.spectralCentroid,
      }
    );
    if (!result) throw new Error('AI extension failed');

    // Slice out only the new portion and append as a new clip on the same track
    const fullBuffer = await loadTrackBuffer(result.url);
    console.log('[Extend] Full buffer:', fullBuffer.duration.toFixed(1), 's, clip was:', extendClip.duration.toFixed(1), 's');

    const originalEnd = extendClip.startTime + extendClip.duration;
    const extensionBuffer = sliceAudioBuffer(fullBuffer, extendClip.duration, fullBuffer.duration);
    console.log('[Extend] Extension buffer:', extensionBuffer.duration.toFixed(1), 's');

    // Apply fade-in to smooth the transition from original to extension
    applyFadeIn(extensionBuffer, 0.15);

    const { trackId } = extendClipState;
    const newClipId = Math.random().toString(36).substr(2, 9);
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        clips: [...t.clips, {
          id: newClipId,
          buffer: extensionBuffer,
          url: result.url,
          name: `${t.name} (ext)`,
          startTime: originalEnd,
          duration: extensionBuffer.duration,
          offset: 0,
          fadeInDuration: 0,
          fadeOutDuration: 0,
        }],
      };
    }));
    showSuccess('Track extended!');
    setExtendClipState(null);
  };

  // Extend All tracks
  const [extendAllDialogOpen, setExtendAllDialogOpen] = useState(false);

  const handleExtendAllConfirm = async (
    result: ExtendAllResult,
    onTrackProgress: (trackId: string, status: 'pending' | 'uploading' | 'extending' | 'done' | 'failed') => void
  ): Promise<{ succeeded: number; failed: number }> => {
    let succeeded = 0;
    let failed = 0;

    const promises = result.trackIds.map(async (trackId) => {
      const track = tracks.find(t => t.id === trackId);
      const clip = track?.clips[0];
      if (!track || !clip?.buffer) {
        onTrackProgress(trackId, 'failed');
        failed++;
        return;
      }

      try {
        onTrackProgress(trackId, 'uploading');
        const wavBlob = audioBufferToWavBlob(clip.buffer);
        const fileRef = await uploadToGradio(wavBlob, `${track.name}.wav`);
        if (!fileRef) throw new Error('Upload failed');

        onTrackProgress(trackId, 'extending');
        const clipAnalysis = clip.analysis;
        const extended = await generateExtension(
          fileRef,
          clip.duration,
          result.targetDuration,
          result.prompt || track.name,
          {
            bpm: projectBPM,
            genre: projectGenre,
            key: clipAnalysis?.key || undefined,
            rmsLevel: clipAnalysis?.rmsLevel,
            spectralCentroid: clipAnalysis?.spectralCentroid,
          }
        );
        if (!extended) throw new Error('Extension failed');

        // Slice out only the new portion and append as a new clip on the same track
        const fullBuffer = await loadTrackBuffer(extended.url);
        console.log(`[ExtendAll] "${track.name}" full buffer: ${fullBuffer.duration.toFixed(1)}s, clip was: ${clip.duration.toFixed(1)}s`);

        const originalEnd = clip.startTime + clip.duration;
        const extensionBuffer = sliceAudioBuffer(fullBuffer, clip.duration, fullBuffer.duration);
        console.log(`[ExtendAll] "${track.name}" extension buffer: ${extensionBuffer.duration.toFixed(1)}s`);

        // Apply fade-in to smooth the transition
        applyFadeIn(extensionBuffer, 0.15);

        const newClipId = Math.random().toString(36).substr(2, 9);
        setTracks(prev => prev.map(t => {
          if (t.id !== trackId) return t;
          return {
            ...t,
            clips: [...t.clips, {
              id: newClipId,
              buffer: extensionBuffer,
              url: extended.url,
              name: `${t.name} (ext)`,
              startTime: originalEnd,
              duration: extensionBuffer.duration,
              offset: 0,
              fadeInDuration: 0,
              fadeOutDuration: 0,
            }],
          };
        }));
        onTrackProgress(trackId, 'done');
        succeeded++;
      } catch (err) {
        console.error(`[ExtendAll] Failed for track "${track.name}":`, err);
        onTrackProgress(trackId, 'failed');
        failed++;
      }
    });

    await Promise.all(promises);

    if (succeeded > 0) {
      showSuccess(`Extended ${succeeded}/${result.trackIds.length} track${succeeded !== 1 ? 's' : ''}`);
    }
    if (failed > 0) {
      showError(`${failed} track${failed !== 1 ? 's' : ''} failed to extend`);
    }

    return { succeeded, failed };
  };

  const handleInstrumentSelect = async (program: number) => {
    if (instrumentSelectState) {
      await changeMidiInstrument(instrumentSelectState.trackId, program);
      showSuccess(`Instrument changed`);
    }
    setInstrumentSelectState(null);
  };

  // Get current instrument program for the dialog
  const instrumentSelectClip = instrumentSelectState
    ? tracks.find(t => t.id === instrumentSelectState.trackId)?.clips.find(c => c.id === instrumentSelectState.clipId)
    : null;

  // Get active piano roll data
  const pianoRollClip = pianoRollState
    ? tracks.find(t => t.id === pianoRollState.trackId)?.clips.find(c => c.id === pianoRollState.clipId)
    : null;
  const pianoRollTrack = pianoRollState
    ? tracks.find(t => t.id === pianoRollState.trackId)
    : null;

  // Get active synth panel data
  const synthPanelClip = synthPanelState
    ? tracks.find(t => t.id === synthPanelState.trackId)?.clips.find(c => c.id === synthPanelState.clipId)
    : null;

  // Handle re-attaching a video file (after loading a saved project)
  const handleVideoReattach = useCallback(async (file: File) => {
    const blobUrl = URL.createObjectURL(file);
    setVideoPreviewData(prev => prev ? { ...prev, videoUrl: blobUrl } : null);

    // Re-extract audio from the video and update the reference track
    try {
      const audioBuffer = await extractAudioFromVideo(file);
      const audioContour = await analyzeContour(audioBuffer);

      // Find the existing video audio reference track and update its buffer
      const refTrack = tracks.find(t => t.type === 'reference' && t.name === 'Video Audio');
      if (refTrack && refTrack.clips[0]) {
        setTracks(prev => prev.map(t => {
          if (t.id !== refTrack.id) return t;
          return {
            ...t,
            clips: t.clips.map(c => ({
              ...c,
              buffer: audioBuffer,
              referenceData: c.referenceData ? {
                ...c.referenceData,
                contour: audioContour,
              } : undefined,
            })),
          };
        }));
      }
    } catch (err) {
      console.warn('Could not extract audio from re-attached video:', err);
    }
  }, [tracks, setTracks]);

  // Auto-close piano roll if clip/track is deleted
  useEffect(() => {
    if (pianoRollState && (!pianoRollClip || !pianoRollTrack)) {
      setPianoRollState(null);
    }
  }, [pianoRollState, pianoRollClip, pianoRollTrack]);

  // Auto-close synth panel if clip/track is deleted
  useEffect(() => {
    if (synthPanelState && !synthPanelClip) {
      setSynthPanelState(null);
    }
  }, [synthPanelState, synthPanelClip]);

  // Total song duration — max end of all clips across all tracks
  const totalDuration = useMemo(() => {
    const ends = tracks.flatMap(t => t.clips.map(c => c.startTime + c.duration));
    return ends.length > 0 ? Math.max(...ends) : 0;
  }, [tracks]);

  return (
    <div className="dark h-screen bg-[#191919] flex flex-col overflow-hidden text-slate-100 selection:bg-primary/30">
      <DAWHeader
        transportState={transportState}
        currentTime={currentTime}
        onPlay={play}
        onPause={pause}
        onStop={stop}
        onSeekForward={seekForward}
        onSeekBackward={seekBackward}
        onExport={(type) => type === 'wav' ? exportAsWav(tracks, currentProjectName, masterEffects) : exportAsZip(tracks, currentProjectName, projectBPM, masterEffects)}
        onGenerate={() => { setHasProject(false); setCurrentProjectId(null); }}
        onSave={handleSaveProject}
        savedProjects={savedProjects}
        onLoadProject={handleLoadProject}
        onDeleteProject={deleteProject}
        onLogout={handleLogout}
        bpm={projectBPM}
        onBPMChange={setProjectBPM}
        recordingState={recording.recordingState}
        recordingMode={recording.recordingMode}
        recordingDuration={recording.recordingDuration}
        inputLevel={recording.inputLevel}
        recordingSettings={recording.settings}
        onUpdateRecordingSettings={recording.updateSettings}
        onArmRecording={recording.armRecording}
        onStopRecording={recording.stopRecording}
        onCancelRecording={recording.cancelRecording}
        onOpenDeviceDialog={() => recording.setDeviceDialogOpen(true)}
        audioPermissionState={recording.audioPermissionState}
        isMidiSupported={recording.isMidiSupported}
        hasAudioDevices={recording.audioDevices.length > 0}
        hasMidiDevices={recording.midiDevices.length > 0}
        loopEnabled={loopEnabled}
        onToggleLoop={() => {
          // When toggling loop ON with no region set, auto-set to full timeline
          if (!loopEnabled && loopEnd <= loopStart) {
            const maxEnd = Math.max(...tracks.flatMap(t => t.clips.map(c => c.startTime + c.duration)), 10);
            setLoopRegion(0, maxEnd);
          }
          toggleLoop();
        }}
        loopStart={loopStart}
        loopEnd={loopEnd}
        onSetLoopRegion={setLoopRegion}
        onExtendAll={hasProject ? () => setExtendAllDialogOpen(true) : undefined}
        onShare={hasProject ? handleShare : undefined}
        isSharing={isSharing}
        onGenerateStem={hasProject ? () => setGenerateStemDialogOpen(true) : undefined}
        onAutoMix={hasProject && tracks.length >= 2 ? handleAutoMix : undefined}
        onAutoMaster={hasProject && tracks.length >= 1 ? handleAutoMaster : undefined}
        totalDuration={totalDuration}
      />

      <main className="flex-1 flex overflow-hidden bg-[#191919]">
        {!hasProject ? (
          <div className="flex-1 overflow-y-auto">
            <div className="min-h-full flex items-center justify-center py-8">
              <AIPromptPanel
                onGenerate={handleGenerate}
                onGenerateScore={handleGenerateScoreFromPrompt}
                onGenerateVideoScore={handleGenerateVideoScore}
                isLoading={isGenerating}
                onSkipToDAW={() => setHasProject(true)}
                savedProjects={savedProjects}
                onLoadProject={handleLoadProject}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <DAWTrackControls
              tracks={tracks}
              onUpdate={handleUpdateTrack}
              onDelete={handleDeleteTrack}
              onAddTrack={() => setAddTrackDialogOpen(true)}
              onAddEffect={addEffect}
              onRemoveEffect={removeEffect}
              onToggleEffect={toggleEffect}
              onUpdateEffect={updateEffect}
              onApplyTransform={(trackId, clipId, transform, params) => {
                void applyTransformToClip(trackId, clipId, transform as 'pitch_shift' | 'tempo_match' | 'filter', params);
              }}
              onEditMidiClip={(trackId, clipId) => setPianoRollState({ trackId, clipId })}
                onEditSynthPreset={(trackId, clipId) => {
                  setSynthPanelState({ trackId, clipId });
                  setPianoRollState({ trackId, clipId });
                }}
              onUpdateReferenceSettings={updateReferenceTrackSettings}
              projectBPM={projectBPM}
              masterEffects={masterEffects}
              onAddMasterEffect={addMasterEffect}
              onRemoveMasterEffect={removeMasterEffect}
              onToggleMasterEffect={toggleMasterEffect}
              onUpdateMasterEffect={updateMasterEffect}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
              <DAWTimeline
                tracks={tracks}
                currentTime={currentTime}
                isPlaying={isPlaying}
                bpm={projectBPM}
                onSplitClip={splitClip}
                onDuplicateClip={duplicateClip}
                onDeleteClip={deleteClip}
                onMoveClip={moveClip}
                onDoubleClickClip={handleDoubleClickClip}
                onChangeMidiInstrument={handleChangeMidiInstrument}
                onExtendClip={handleExtendClip}
                onSeparateStems={(trackId, clipId) => setStemSeparationState({ trackId, clipId })}
                onUpdateClipFades={updateClipFades}
                onConvertToMidi={handleConvertToMidi}
                onSeekTo={seekTo}
                loopEnabled={loopEnabled}
                loopStart={loopStart}
                loopEnd={loopEnd}
                onSetLoopRegion={setLoopRegion}
                recordingTrackId={recording.armedTrackId}
                recordingNotes={recording.capturedNotes}
                recordingStartTime={recording.recordingStartTime}
                recordingInputLevel={recording.inputLevel}
                isRecording={recording.recordingState === 'recording'}
                recordingMode={recording.recordingMode}
              />
              {/* Synth Panel */}
              {synthPanelState && synthPanelClip?.synthData && (
                <SynthPanel
                  preset={synthPanelClip.synthData.preset}
                  onPresetChange={(newPreset: SynthPreset) => {
                    updateSynthPreset(synthPanelState.trackId, synthPanelState.clipId, newPreset);
                  }}
                  onClose={() => setSynthPanelState(null)}
                />
              )}
              {/* Piano Roll — for MIDI and synth tracks */}
              {pianoRollState && pianoRollTrack && (
                (() => {
                  // Synth tracks: use synthData.notes as midiData
                  const isSynth = pianoRollTrack.type === 'synth' && pianoRollClip?.synthData;
                  const midiData: MidiClipData | undefined = isSynth
                    ? {
                        notes: pianoRollClip!.synthData!.notes,
                        program: 0,
                        bankMSB: 0,
                        bankLSB: 0,
                        totalDuration: pianoRollClip!.synthData!.totalDuration,
                      }
                    : pianoRollClip?.midiData;

                  if (!midiData) return null;

                  return (
                    <MidiPianoRoll
                      trackId={pianoRollState.trackId}
                      clipId={pianoRollState.clipId}
                      midiData={midiData}
                      trackColor={pianoRollTrack.color}
                      bpm={projectBPM}
                      onUpdate={isSynth
                        ? async (trackId, clipId, newMidiData) => {
                            await updateSynthNotes(trackId, clipId, newMidiData.notes, newMidiData.totalDuration);
                          }
                        : updateMidiClip
                      }
                      onClose={() => setPianoRollState(null)}
                    />
                  );
                })()
              )}
            </div>
          </div>
        )}
      </main>

      <SaveProjectDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        defaultName={currentProjectName}
        onSave={handleConfirmSave}
      />

      <AddTrackDialog
        open={addTrackDialogOpen}
        onOpenChange={setAddTrackDialogOpen}
        onAddTrackWithAudio={handleAddTrackWithAudio}
        onAddEmptyTrack={handleAddEmptyTrack}
        onAddMidiTrack={handleAddMidiTrack}
        onGenerateTrack={handleGenerateTrack}
        onGenerateScore={handleGenerateScore}
        isGenerating={isGeneratingTrack}
        onStartRecording={(mode, midiProgram) => {
          recording.updateSettings({ mode, ...(midiProgram !== undefined ? { midiProgram } : {}) });
          recording.armRecording();
        }}
        audioDevices={recording.audioDevices}
        midiDevices={recording.midiDevices}
        isMidiSupported={recording.isMidiSupported}
        midiRecordProgram={recording.settings.midiProgram}
        onMidiRecordProgramChange={(p) => recording.updateSettings({ midiProgram: p })}
        onOpenReferenceLibrary={() => setRefLibraryDialogOpen(true)}
      />

      <ReferenceLibraryDialog
        open={refLibraryDialogOpen}
        onOpenChange={setRefLibraryDialogOpen}
        onSelect={(_track: ReferenceTrack) => {
          // When selecting from library in the AddTrack context,
          // just close the dialog — the reference is used in AIPromptPanel's flow
          setRefLibraryDialogOpen(false)
        }}
      />

      <InstrumentSelectDialog
        open={instrumentSelectState !== null}
        onOpenChange={(open) => !open && setInstrumentSelectState(null)}
        currentProgram={instrumentSelectClip?.midiData
          ? (instrumentSelectClip.midiData.bankMSB === 128
            ? encodeDrumKitProgram(instrumentSelectClip.midiData.program)
            : instrumentSelectClip.midiData.program)
          : undefined}
        onSelect={handleInstrumentSelect}
        suggestedPrograms={projectGenre ? GENRE_OPTIONS.find(g => g.id === projectGenre)?.suggestedInstruments : undefined}
      />

      <ExtendClipDialog
        open={extendClipState !== null}
        onOpenChange={(open) => !open && setExtendClipState(null)}
        clipName={extendTrack?.name || 'Audio Clip'}
        clipDuration={extendClip?.duration || 30}
        onExtend={handleExtendConfirm}
      />

      <ExtendAllDialog
        open={extendAllDialogOpen}
        onOpenChange={setExtendAllDialogOpen}
        tracks={tracks}
        onExtend={handleExtendAllConfirm}
      />

      <StemSeparationDialog
        open={stemSeparationState !== null}
        onOpenChange={(open) => { if (!open) setStemSeparationState(null); }}
        clipName={stemSeparationState ? (tracks.find(t => t.id === stemSeparationState.trackId)?.clips.find(c => c.id === stemSeparationState.clipId)?.name || 'Clip') : ''}
        onSeparate={handleStemSeparationConfirm}
      />

      <GenerateStemDialog
        open={generateStemDialogOpen}
        onOpenChange={setGenerateStemDialogOpen}
        existingTracks={tracks}
        bpm={projectBPM}
        genre={projectGenre}
        onGenerate={handleGenerateStem}
        isGenerating={isGeneratingTrack}
        generatingProgress={stemGenProgress}
      />

      <DeviceSelectDialog
        open={recording.isDeviceDialogOpen}
        onOpenChange={recording.setDeviceDialogOpen}
        audioDevices={recording.audioDevices}
        selectedAudioDeviceId={recording.selectedAudioDeviceId}
        onSelectAudioDevice={recording.setSelectedAudioDeviceId}
        audioPermissionState={recording.audioPermissionState}
        onRequestAudioPermission={recording.requestAudioPermission}
        inputLevel={recording.inputLevel}
        isMidiSupported={recording.isMidiSupported}
        midiDevices={recording.midiDevices}
        selectedMidiDeviceId={recording.selectedMidiDeviceId}
        onSelectMidiDevice={recording.setSelectedMidiDeviceId}
        midiProgram={recording.settings.midiProgram}
        onMidiProgramChange={(p) => recording.updateSettings({ midiProgram: p })}
        countInBars={recording.settings.countInBars}
        onCountInBarsChange={(bars) => recording.updateSettings({ countInBars: bars })}
        metronomeEnabled={recording.settings.metronomeEnabled}
        onMetronomeEnabledChange={(v) => recording.updateSettings({ metronomeEnabled: v })}
        metronomeVolume={recording.settings.metronomeVolume}
        onMetronomeVolumeChange={(v) => recording.updateSettings({ metronomeVolume: v })}
        loopWhileRecording={recording.settings.loopWhileRecording}
        onLoopWhileRecordingChange={(v) => recording.updateSettings({ loopWhileRecording: v })}
      />

      {/* Video Preview for video scoring */}
      {videoPreviewData && (
        <VideoPreview
          videoUrl={videoPreviewData.videoUrl}
          youtubeUrl={videoPreviewData.youtubeUrl}
          videoContour={videoPreviewData.videoContour}
          currentTime={currentTime}
          isPlaying={isPlaying}
          position="floating"
          onClose={() => setVideoPreviewData(null)}
          onVideoReattach={handleVideoReattach}
        />
      )}

      <footer className="h-5 border-t border-[#333] bg-[#1a1a1a] flex items-center px-3 justify-between text-[9px] font-mono text-white/25 tracking-tight">
        <div className="flex items-center gap-3">
          <span>WebAudio + SpessaSynth</span>
          <span>44100Hz</span>
          <span>Buf: 4096</span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            {tracks.filter(t => t.type === 'audio' || !t.type).length}A /
            {tracks.filter(t => t.type === 'midi').length}M /
            {tracks.filter(t => t.type === 'reference').length}R Tracks
          </span>
          <span>{projectBPM} BPM</span>
          <span className={
            recording.recordingState === 'recording' ? "text-[#FF4444]"
            : recording.recordingState === 'counting-in' ? "text-[#FF4444] animate-pulse"
            : transportState === 'playing' ? "text-[#7EC850]"
            : transportState === 'paused' ? "text-[#ff6a14]"
            : ""
          }>
            {recording.recordingState === 'recording' ? "Recording"
             : recording.recordingState === 'counting-in' ? "Count-in..."
             : transportState === 'playing' ? "Playing"
             : transportState === 'paused' ? "Paused"
             : "Stopped"}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
