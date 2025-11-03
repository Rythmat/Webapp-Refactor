import { useState, useEffect, useCallback, useRef } from "react";
import * as Tone from "tone";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { showError, showSuccess, showLoading, dismissToast } from "@/components/utils/toast";
import Transport from "@/components/studio/Transport";
import Tracks from "@/components/studio/Tracks";
import NewTrackDialog from "@/components/studio/NewTrackDialog";
import { PlusCircle, Music4, MousePointer, Pencil, ZoomIn, ZoomOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Track, Clip, InstrumentType, Note, MidiClipType,  AudioClipType} from "@/types";
import { useMidiKeyboard } from "@/hooks/useMidiKeyboard";
import { useMidiInput } from "@/hooks/useMidiInput";
import { getBlobDuration, transcodeToMp3 } from "@/components/utils/audio";

function aiTracksToAppTracks(aiTracks: { name: string; instrument: InstrumentType; notes: Omit<Note, 'id'>[] }[]): Track[] {
  return aiTracks.map((aiTrack) => ({
    id: uuidv4(),
    name: aiTrack.name,
    trackType: 'midi',
    instrument: aiTrack.instrument,
    volume: 0, pan: 0, isMuted: false, isSoloed: false,
    clips: [{
      id: uuidv4(), type: 'midi', start: 0, duration: 4,
      notes: aiTrack.notes.map(note => ({ ...note, id: uuidv4() })),
    }],
  }));
}

const createDrumKit = () => {
  const kit = {
    kick: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 10, oscillator: { type: "sine" }, envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4, attackCurve: "exponential" } }),
    snare: new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.0 } }),
    hihat: new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.1, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }),
  };
  return { ...kit, connect: (dest: any) => Object.values(kit).forEach(s => s.connect(dest)), dispose: () => Object.values(kit).forEach(s => s.dispose()) };
};

const createInstrument = (instrumentType: InstrumentType) => {
  let instrument;
  switch (instrumentType) {
    case 'synth': instrument = new Tone.PolySynth(Tone.FMSynth, { envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 } }); break;
    case 'bass': instrument = new Tone.MonoSynth({ oscillator: { type: 'fmsquare' }, envelope: { attack: 0.05, decay: 0.3, sustain: 0.1, release: 0.8 }, filterEnvelope: { attack: 0.001, decay: 0.01, sustain: 0.5, baseFrequency: 200, octaves: 2.6 } }); break;
    case 'keys': instrument = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 3.01, modulationIndex: 14, envelope: { attack: 0.01, decay: 0.2, release: 0.5 } }); break;
    case 'guitar': instrument = new Tone.PluckSynth({ attackNoise: 1, dampening: 4000, resonance: 0.7 }); break;
    case 'drums': return createDrumKit();
    default: instrument = new Tone.PolySynth(Tone.Synth);
  }
  return instrument;
};

const dbToGain = (db: number) => Math.pow(10, db / 20);

export const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [bpm, setBpm] = useState(120);
  const [isAudioReady, setIsAudioReady] = useState(Tone.context.state === 'running');
  const [progress, setProgress] = useState(0);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(4);
  const [totalMeasures] = useState(16);
  const [isNewTrackDialogOpen, setIsNewTrackDialogOpen] = useState(false);
  const [selectedNoteDuration] = useState("16n");
  const [isRecording, setIsRecording] = useState(false); // record-armed
  const [armedTrackId, setArmedTrackId] = useState<string | null>(null);
  const [isLooping, setIsLooping] = useState(true);
  const [recordInLoopOnly, setRecordInLoopOnly] = useState(false);
  const [recordingGainDb, setRecordingGainDb] = useState(0);


  // Edit tool
  const [editTool, setEditTool] = useState<"select" | "pencil">("select");

  // Zoom (measure width in pixels)
  const MIN_MEASURE_WIDTH = 40;
  const MAX_MEASURE_WIDTH = 200;
  const [measureWidth, setMeasureWidth] = useState<number>(80);
  const zoomOut = () => setMeasureWidth((w) => Math.max(MIN_MEASURE_WIDTH, Math.round(w / 1.25)));
  const zoomIn = () => setMeasureWidth((w) => Math.min(MAX_MEASURE_WIDTH, Math.round(w * 1.25)));

  // Loop recording behavior
  const [loopRecordMode, setLoopRecordMode] = useState<"single" | "continuous">("single");
  const [preRollOneLoop, setPreRollOneLoop] = useState(false);

  const instrumentsRef = useRef<Map<string, any>>(new Map());
  const recordingSessionRef = useRef<{ clipId?: string; trackId: string; clipStart: number; notes?: Note[] } | null>(null);

  // Mic + processing
  const userMediaRef = useRef<Tone.UserMedia | null>(null);
  const preampRef = useRef<Tone.Gain | null>(null);
  const compRef = useRef<Tone.Compressor | null>(null);
  const limiterRef = useRef<Tone.Limiter | null>(null);
  const mediaDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Recorders
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const toneRecorderRef = useRef<Tone.Recorder | null>(null);

  // Meter
  const audioMetersRef = useRef<Map<string, Tone.Meter>>(new Map());
  const [audioLevels, setAudioLevels] = useState<Record<string, number>>({});

  // Loop-only helpers
  const recStopTimeoutRef = useRef<number | null>(null);
  const recStartTimeoutRef = useRef<number | null>(null);
  const hasRecordedThisPlayRef = useRef(false);

  const handleAIGeneratedTracks = (aiTracks: any[], mode: "add" | "overwrite") =>
    setTracks(p => mode === "overwrite" ? aiTracksToAppTracks(aiTracks) : [...p, ...aiTracksToAppTracks(aiTracks)]);



  useEffect(() => {
    if (location.state?.from === '/learn' && location.state?.newTracksData) {
      const { newTracksData, newBpm } = location.state;
      handleAIGeneratedTracks(newTracksData, "add");
      if (newBpm) {
        setBpm(newBpm);
      }
      // Clear the state to prevent re-adding on refresh
      navigate('.', { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    const onStateChange = () => {
      setIsAudioReady(Tone.context.state === 'running');
    };
    Tone.context.on('statechange', onStateChange);
    return () => {
      Tone.context.off('statechange', onStateChange);
    };
  }, []);

  const canRecord = (() => {
    if (!isAudioReady) return false;
    if (armedTrackId) {
      const armedTrack = tracks.find((t) => t.id === armedTrackId);
      if (armedTrack?.trackType === "audio") {
        return !!userMediaRef.current && userMediaRef.current.state === "started";
      }
      return true;
    }
    return false;
  })();

  useEffect(() => {
    if (!isAudioReady) return;
    const meterInterval = setInterval(() => {
      const newLevels: Record<string, number> = {};
      audioMetersRef.current.forEach((meter, trackId) => {
        if (!meter.disposed) {
          newLevels[trackId] = meter.getValue() as number;
        }
      });
      setAudioLevels(newLevels);
    }, 100);
    return () => clearInterval(meterInterval);
  }, [isAudioReady]);

  // Update preamp gain live
  useEffect(() => {
    if (preampRef.current) {
      preampRef.current.gain.value = dbToGain(recordingGainDb);
    }
  }, [recordingGainDb]);

  useEffect(() => {
    if (!isAudioReady) {
      if (instrumentsRef.current.size > 0) {
        instrumentsRef.current.forEach(inst => inst.dispose());
        instrumentsRef.current.clear();
      }
      return;
    }

    const currentInstruments = instrumentsRef.current;
    const activeTrackIds = new Set(tracks.map(t => t.id));

    tracks.forEach(track => {
      if (track.trackType === 'midi' && track.instrument && !currentInstruments.has(track.id)) {
        const instrument = createInstrument(track.instrument);
        currentInstruments.set(track.id, instrument);
      }
    });

    for (const trackId of currentInstruments.keys()) {
      if (!activeTrackIds.has(trackId)) {
        currentInstruments.get(trackId)?.dispose();
        currentInstruments.delete(trackId);
      }
    }
  }, [tracks, isAudioReady]);

  const handleStartAudio = async () => {
    try {
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }
      Tone.Transport.bpm.value = bpm;
      Tone.Transport.loop = true;
      Tone.Transport.loopStart = `${loopStart}m`;
      Tone.Transport.loopEnd = `${loopEnd}m`;
    } catch {
      showError("Failed to start audio context. Please click the Start Audio button again.");
    }
  };

  useEffect(() => {
    if (!isAudioReady) return;
    Tone.Transport.bpm.value = bpm;
    Tone.Transport.loopStart = `${loopStart}m`;
    Tone.Transport.loopEnd = `${loopEnd}m`;
  }, [bpm, loopStart, loopEnd, isAudioReady]);

  const animationFrameRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isAudioReady) return;
    let isMounted = true;
    const updatePlayhead = () => {
      if (!isMounted) return;
      const totalDurationSeconds = Tone.Time(`${totalMeasures}m`).toSeconds();
      const currentSeconds = Tone.Transport.seconds;
      let progressValue = 0;

      if (isLooping) {
        const loopStartTime = Tone.Time(Tone.Transport.loopStart).toSeconds();
        const loopEndTime = Tone.Time(Tone.Transport.loopEnd).toSeconds();
        const loopDuration = loopEndTime - loopStartTime;
        if (loopDuration > 0) {
          const elapsedInLoop = (currentSeconds - loopStartTime + loopDuration) % loopDuration;
          progressValue = (loopStartTime + elapsedInLoop) / totalDurationSeconds;
        }
      } else {
        if (currentSeconds >= totalDurationSeconds) {
          Tone.Transport.stop();
          progressValue = 1;
        } else {
          progressValue = currentSeconds / totalDurationSeconds;
        }
      }

      setProgress(Math.min(1, progressValue));
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    };
    const onStart = () => {
      hasRecordedThisPlayRef.current = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);

      // If record-in-loop, schedule start properly based on current transport position
      if (isRecording && recordInLoopOnly && isLooping) {
        if (recStartTimeoutRef.current !== null) {
          clearTimeout(recStartTimeoutRef.current);
          recStartTimeoutRef.current = null;
        }
        const cur = Tone.Transport.seconds;
        const loopStartSec = Tone.Time(`${loopStart}m`).toSeconds();
        const loopEndSec = Tone.Time(`${loopEnd}m`).toSeconds();

        let delayMs = 0;
        if (cur < loopStartSec) {
          delayMs = (loopStartSec - cur) * 1000;
        } else if (cur >= loopStartSec && cur < loopEndSec) {
          delayMs = preRollOneLoop ? (loopEndSec - cur) * 1000 : 0;
        } else {
          const loopLen = loopEndSec - loopStartSec;
          delayMs = (loopLen - ((cur - loopStartSec) % loopLen)) * 1000;
        }

        recStartTimeoutRef.current = window.setTimeout(() => {
          beginRecordingAtCurrentPosition();
        }, Math.max(0, Math.floor(delayMs)));
      } else if (isRecording && !recordInLoopOnly) {
        beginRecordingAtCurrentPosition();
      }
    };
    const onStopOrPause = () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      const newProgress = Tone.Time(Tone.Transport.position).toSeconds() / Tone.Time(`${totalMeasures}m`).toSeconds();
      setProgress(newProgress);

      if (mediaRecorderRef.current || toneRecorderRef.current || recordingSessionRef.current) {
        stopRecordingAndCommit();
      }
      if (recStopTimeoutRef.current !== null) {
        clearTimeout(recStopTimeoutRef.current);
        recStopTimeoutRef.current = null;
      }
      if (recStartTimeoutRef.current !== null) {
        clearTimeout(recStartTimeoutRef.current);
        recStartTimeoutRef.current = null;
      }
    };

    Tone.Transport.on("start", onStart);
    Tone.Transport.on("stop", onStopOrPause);
    Tone.Transport.on("pause", onStopOrPause);

    return () => {
      isMounted = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      Tone.Transport.off("start", onStart);
      Tone.Transport.off("stop", onStopOrPause);
      Tone.Transport.off("pause", onStopOrPause);
    };
  }, [isAudioReady, totalMeasures, loopStart, loopEnd, isLooping, isRecording, recordInLoopOnly, preRollOneLoop, loopRecordMode]);



  const handleCreateTrack = (name: string, type: 'midi' | 'audio', instrument?: InstrumentType) =>
    setTracks(p => [...p, { id: uuidv4(), name, trackType: type, instrument: type === 'midi' ? instrument : undefined, volume: 0, pan: 0, isMuted: false, isSoloed: false, clips: [] }]);
  const handleTrackUpdate = (updatedTrack: Partial<Track> & { id: string }) =>
    setTracks(p => p.map(t => t.id === updatedTrack.id ? { ...t, ...updatedTrack } : t));
  const handleTrackDelete = (trackId: string) =>
    setTracks(p => p.filter(t => t.id !== trackId));
  const handleClipAdd = (trackId: string, newClip: Clip) =>
    setTracks(p => p.map(t => t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t));
  const handleClipUpdate = (trackId: string, updatedClip: Clip) =>
    setTracks(p => p.map(t => t.id === trackId ? { ...t, clips: t.clips.map(c => c.id === updatedClip.id ? updatedClip : c) } : t));
  const handleClipDuplicate = (trackId: string, clipId: string) =>
    setTracks(p => p.map(t => {
      if (t.id !== trackId) return t;
      const c = t.clips.find(c => c.id === clipId);
      if (!c) return t;
      return { ...t, clips: [...t.clips, { ...c, id: uuidv4(), start: c.start + c.duration }] };
    }));
  const handleClipDelete = (trackId: string, clipId: string) =>
    setTracks(p => p.map(t => t.id === trackId ? { ...t, clips: t.clips.filter(c => c.id !== clipId) } : t));

  const handleClipSplitAt = (trackId: string, clipId: string, splitMeasure: number) =>
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      const clip = t.clips.find(c => c.id === clipId);
      if (!clip || clip.type !== 'audio') return t;

      const start = clip.start;
      const end = clip.start + clip.duration;
      if (splitMeasure <= start || splitMeasure >= end) return t;

      const left: AudioClipType = {
        ...(clip as AudioClipType),
        id: uuidv4(),
        start,
        duration: splitMeasure - start,
      };
      const right: AudioClipType = {
        ...(clip as AudioClipType),
        id: uuidv4(),
        start: splitMeasure,
        duration: end - splitMeasure,
      };

      const newClips = t.clips.filter(c => c.id !== clipId).concat([left, right]);
      newClips.sort((a, b) => a.start - b.start);
      return { ...t, clips: newClips };
    }));

  const teardownMicChain = () => {
    try {
      if (mediaRecorderRef.current) {
        try { mediaRecorderRef.current.stop(); } catch {}
        mediaRecorderRef.current = null;
      }
      if (toneRecorderRef.current) {
        try { toneRecorderRef.current.dispose(); } catch {}
        toneRecorderRef.current = null;
      }
      mediaChunksRef.current = [];

      if (armedTrackId && audioMetersRef.current.has(armedTrackId)) {
        audioMetersRef.current.get(armedTrackId)?.dispose();
        audioMetersRef.current.delete(armedTrackId);
      }

      preampRef.current?.dispose();
      preampRef.current = null;
      compRef.current?.dispose();
      compRef.current = null;
      limiterRef.current?.dispose();
      limiterRef.current = null;

      mediaDestRef.current = null;

      if (userMediaRef.current) {
        userMediaRef.current.close();
        userMediaRef.current.dispose();
        userMediaRef.current = null;
      }
    } catch {
      // noop
    }
  };

  const setupMicChain = async (trackId: string) => {
    userMediaRef.current = new Tone.UserMedia();
    await userMediaRef.current.open();

    preampRef.current = new Tone.Gain(dbToGain(recordingGainDb));
    compRef.current = new Tone.Compressor({ threshold: -18, ratio: 3, attack: 0.01, release: 0.25 });
    limiterRef.current = new Tone.Limiter(-1);

    userMediaRef.current.connect(preampRef.current);
    preampRef.current.connect(compRef.current!);
    compRef.current!.connect(limiterRef.current!);

    const meter = new Tone.Meter();
    limiterRef.current!.connect(meter);
    audioMetersRef.current.set(trackId, meter);

    const rawCtx = (Tone.getContext() as any).rawContext as AudioContext;
    mediaDestRef.current = rawCtx.createMediaStreamDestination();
    limiterRef.current!.connect(mediaDestRef.current);
  };

  const handleArmTrack = async (trackId: string) => {
    const newArmedId = armedTrackId === trackId ? null : trackId;

    teardownMicChain();
    setAudioLevels({});
    setArmedTrackId(newArmedId);

    if (newArmedId) {
      const track = tracks.find(t => t.id === newArmedId);
      if (track?.trackType === 'audio') {
        try {
          await setupMicChain(newArmedId);
        } catch {
          showError("Microphone access denied or not available.");
          setArmedTrackId(null);
        }
      }
    }
  };


  const canUseMediaRecorder = () => {
    const MR: any = (window as any).MediaRecorder;
    if (!MR) return false;
    if (typeof MR.isTypeSupported === "function") {
      return MR.isTypeSupported("audio/webm;codecs=opus") || MR.isTypeSupported("audio/webm");
    }
    return true;
  };

  const beginRecordingAtCurrentPosition = async () => {
    if (!canRecord || !armedTrackId) return;

    const armedTrack = tracks.find(t => t.id === armedTrackId);
    if (!armedTrack) return;

    const [m] = Tone.Time(Tone.Transport.position).toBarsBeatsSixteenths().split(':').map(parseFloat);

    if (armedTrack.trackType === 'midi') {
      const durationMeasures = (recordInLoopOnly && isLooping)
        ? Math.max(1, loopEnd - m)
        : Math.max(1, loopEnd - loopStart);
      const newClip: MidiClipType = { id: uuidv4(), type: 'midi', start: m, duration: durationMeasures, notes: [] };
      handleClipAdd(armedTrackId, newClip);
      recordingSessionRef.current = { clipId: newClip.id, trackId: armedTrackId, clipStart: m, notes: [] };
    } else {
      if (canUseMediaRecorder() && mediaDestRef.current) {
        try {
          mediaChunksRef.current = [];
          const mr = new MediaRecorder(mediaDestRef.current.stream, { mimeType: "audio/webm;codecs=opus" });
          mr.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) mediaChunksRef.current.push(e.data);
          };
          mediaRecorderRef.current = mr;
          mr.start(250);
          showSuccess("Recording audio...");
          recordingSessionRef.current = { trackId: armedTrackId, clipStart: m };
        } catch {
          const rec = new Tone.Recorder();
          toneRecorderRef.current = rec;
          limiterRef.current?.connect(rec);
          rec.start();
          showSuccess("Recording audio (fallback)...");
          recordingSessionRef.current = { trackId: armedTrackId, clipStart: m };
        }
      } else {
        const rec = new Tone.Recorder();
        toneRecorderRef.current = rec;
        limiterRef.current?.connect(rec);
        rec.start();
        showSuccess("Recording audio (fallback)...");
        recordingSessionRef.current = { trackId: armedTrackId, clipStart: m };
      }
    }

    if (recordInLoopOnly && isLooping) {
      const currentSec = Tone.Transport.seconds;
      const loopStartSec = Tone.Time(`${loopStart}m`).toSeconds();
      const loopEndSec = Tone.Time(`${loopEnd}m`).toSeconds();
      let remainingSec = (currentSec >= loopStartSec && currentSec < loopEndSec)
        ? loopEndSec - currentSec
        : (loopEndSec - loopStartSec);

      if (recStopTimeoutRef.current !== null) {
        clearTimeout(recStopTimeoutRef.current);
        recStopTimeoutRef.current = null;
      }

      recStopTimeoutRef.current = window.setTimeout(async () => {
        await stopRecordingAndCommit();
        if (isRecording && loopRecordMode === "continuous") {
          beginRecordingAtCurrentPosition();
        } else {
          hasRecordedThisPlayRef.current = true;
        }
      }, Math.max(10, remainingSec * 1000));
    }
  };

  const stopRecordingAndCommit = async () => {
    if (recStopTimeoutRef.current !== null) {
      clearTimeout(recStopTimeoutRef.current);
      recStopTimeoutRef.current = null;
    }

    const session = recordingSessionRef.current;
    if (!session) return;

    const armedTrack = tracks.find(t => t.id === session.trackId);

    // MIDI
    if (armedTrack?.trackType === 'midi' && session.notes) {
      handleClipUpdate(session.trackId, {
        id: session.clipId!,
        type: 'midi',
        start: session.clipStart,
        duration: Math.max(1, loopEnd - loopStart),
        notes: session.notes
      });
      recordingSessionRef.current = null;
      return;
    }

    // AUDIO
    try {
      let recordedBlob: Blob | null = null;

      if (mediaRecorderRef.current) {
        const mr = mediaRecorderRef.current;
        recordedBlob = await new Promise<Blob>((resolve, reject) => {
          let done = false;
          mr.onstop = () => {
            done = true;
            resolve(new Blob(mediaChunksRef.current, { type: "audio/webm" }));
          };
          mr.onerror = (e: any) => reject(e?.error || new Error("MediaRecorder error"));
          try { mr.stop(); } catch (e) { if (!done) reject(e as any); }
        }).catch(() => null);
        mediaRecorderRef.current = null;
        mediaChunksRef.current = [];
      } else if (toneRecorderRef.current) {
        recordedBlob = await toneRecorderRef.current.stop();
        toneRecorderRef.current.dispose();
        toneRecorderRef.current = null;
      }

      if (!recordedBlob || recordedBlob.size === 0) {
        throw new Error("Recording resulted in an empty audio file.");
      }

      const durationInSeconds = await getBlobDuration(recordedBlob);
      if (!isFinite(durationInSeconds) || durationInSeconds === 0) {
        throw new Error("Recorded audio is empty or invalid.");
      }

      let finalBlob = recordedBlob;
      try {
        finalBlob = await transcodeToMp3(recordedBlob, 128);
      } catch {
        // keep original
      }

      const localUrl = URL.createObjectURL(finalBlob);
      const secondsPerMeasure = (60 / bpm) * 4;
      const durationInMeasures = durationInSeconds / secondsPerMeasure;

      const newClipId = uuidv4();
      const newClip: AudioClipType = {
        id: newClipId,
        type: 'audio',
        start: session.clipStart,
        duration: Math.max(1, Math.ceil(durationInMeasures)),
        audioUrl: localUrl,
        gainDb: 0,
      };
      handleClipAdd(session.trackId, newClip);

      const savingToast = showLoading("Uploading recording...");
      dismissToast(savingToast);
    } catch (error: any) {
      showError(error?.message || "Failed to finalize recording.");
    } finally {
      recordingSessionRef.current = null;
    }
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      if (!canRecord) {
        showError("Cannot record. Please arm an audio track and ensure microphone is enabled.");
        return;
      }
      setIsRecording(true);

      if (Tone.Transport.state === "started") {
        if (recordInLoopOnly && isLooping) {
          const cur = Tone.Transport.seconds;
          const loopStartSec = Tone.Time(`${loopStart}m`).toSeconds();
          const loopEndSec = Tone.Time(`${loopEnd}m`).toSeconds();

          let delayMs = 0;
          if (cur < loopStartSec) {
            delayMs = (loopStartSec - cur) * 1000;
          } else if (cur >= loopStartSec && cur < loopEndSec) {
            delayMs = preRollOneLoop ? (loopEndSec - cur) * 1000 : 0;
          } else {
            const loopLen = loopEndSec - loopStartSec;
            delayMs = (loopLen - ((cur - loopStartSec) % loopLen)) * 1000;
          }
          if (recStartTimeoutRef.current !== null) {
            clearTimeout(recStartTimeoutRef.current);
          }
          recStartTimeoutRef.current = window.setTimeout(() => {
            beginRecordingAtCurrentPosition();
          }, Math.max(0, Math.floor(delayMs)));
        } else {
          await beginRecordingAtCurrentPosition();
        }
      }
    } else {
      if (mediaRecorderRef.current || toneRecorderRef.current || recordingSessionRef.current) {
        await stopRecordingAndCommit();
      }
      if (recStopTimeoutRef.current !== null) {
        clearTimeout(recStopTimeoutRef.current);
        recStopTimeoutRef.current = null;
      }
      if (recStartTimeoutRef.current !== null) {
        clearTimeout(recStartTimeoutRef.current);
        recStartTimeoutRef.current = null;
      }
      setIsRecording(false);
    }
  };

  const handleNoteOn = useCallback((note: string) => {
    if (!armedTrackId) return;
    const instrument = instrumentsRef.current.get(armedTrackId);
    if (instrument) {
      if (instrument.kick) {
        if (note.startsWith('C')) instrument.kick.triggerAttack('C1', Tone.now());
        else if (note.startsWith('D')) instrument.snare.triggerAttack(Tone.now());
        else instrument.hihat.triggerAttack(Tone.now());
      } else {
        instrument.triggerAttack(note, Tone.now());
      }
    }
    const session = recordingSessionRef.current;
    if (isRecording && session && session.trackId === armedTrackId && session.notes) {
      const [m, b, s] = Tone.Time(Tone.Transport.position).toBarsBeatsSixteenths().split(':').map(parseFloat);
      const relativeMeasure = m - session.clipStart;
      if (relativeMeasure >= 0) {
        session.notes.push({ id: uuidv4(), time: `${relativeMeasure}:${b}:${Math.floor(s)}`, note, duration: selectedNoteDuration });
      }
    }
  }, [armedTrackId, isRecording, selectedNoteDuration, loopEnd, loopStart]);

  const handleNoteOff = useCallback((note: string) => {
    if (!armedTrackId) return;
    const instrument = instrumentsRef.current.get(armedTrackId);
    if (instrument) {
      if (instrument.kick) {
        if (note.startsWith('C')) instrument.kick.triggerRelease(Tone.now());
        else if (note.startsWith('D')) instrument.snare.triggerRelease(Tone.now());
        else instrument.hihat.triggerRelease(Tone.now());
      } else if (typeof instrument.triggerRelease === 'function') {
        instrument.triggerRelease(note, Tone.now());
      }
    }
  }, [armedTrackId]);

  useMidiKeyboard({ onNoteOn: handleNoteOn, onNoteOff: handleNoteOff });
  const { devices, selectedDeviceId, setSelectedDeviceId, isSupported } = useMidiInput({ onNoteOn: handleNoteOn, onNoteOff: handleNoteOff, enabled: isAudioReady });

  if (!isAudioReady) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-white mb-4">Atlas AI DAW</h1>
        <Button size="lg" onClick={handleStartAudio} className="text-lg px-8 py-4">Start Audio</Button>
        <p className="text-white mt-4 text-center max-w-md">
          <b>Click "Start Audio" to enable sound, recording, and playback.</b><br />
          This is required by your browser for security reasons.
        </p>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-between border-b px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsNewTrackDialogOpen(true)}><PlusCircle className="h-4 w-4 mr-1" /> New Track</Button>
        </div>
        <div className="flex items-center gap-2">
          {/* Edit Tool Toggle */}
          <ToggleGroup type="single" value={editTool} onValueChange={(v:string)=>{if(v==="select"||v==="pencil"){setEditTool(v);}}} className="hidden md:inline-flex">
            <ToggleGroupItem value="select" aria-label="Select tool" className="px-2">
              <MousePointer className="h-4 w-4 mr-1" /> Select
            </ToggleGroupItem>
            <ToggleGroupItem value="pencil" aria-label="Pencil tool" className="px-2">
              <Pencil className="h-4 w-4 mr-1" /> Pencil
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" aria-label="Zoom out" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" aria-label="Zoom in" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {isSupported && devices.length > 0 && (
            <UiSelect value={selectedDeviceId || ""} onValueChange={setSelectedDeviceId}>
              <SelectTrigger className="w-44"><Music4 className="h-4 w-4 mr-1" /><SelectValue placeholder="Select MIDI Device" /></SelectTrigger>
              <SelectContent>{devices.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}</SelectContent>
            </UiSelect>
          )}
        </div>
      </header>
      <Transport
        isAudioReady={isAudioReady}
        bpm={bpm}
        loopStart={loopStart}
        loopEnd={loopEnd}
        onBpmChange={setBpm}
        onLoopStartChange={setLoopStart}
        onLoopEndChange={setLoopEnd}
        onPositionChange={() => {}}
        isRecording={isRecording}
        onToggleRecording={async () => { await toggleRecording(); }}
        isLooping={isLooping}
        onLoopingChange={setIsLooping}
        canRecord={canRecord}
        recordingGainDb={recordingGainDb}
        onRecordingGainDbChange={setRecordingGainDb}
        recordInLoopOnly={recordInLoopOnly}
        onRecordInLoopOnlyChange={setRecordInLoopOnly}
        loopRecordMode={loopRecordMode}
        onLoopRecordModeChange={setLoopRecordMode}
        preRollOneLoop={preRollOneLoop}
        onPreRollOneLoopChange={setPreRollOneLoop}
      />
      <main className="flex flex-1 min-h-0">
        <Tracks
          tracks={tracks}
          totalMeasures={totalMeasures}
          onTrackUpdate={handleTrackUpdate}
          onTrackDelete={handleTrackDelete}
          onClipAdd={handleClipAdd}
          onClipUpdate={handleClipUpdate}
          onClipDuplicate={handleClipDuplicate}
          onClipDelete={handleClipDelete}
          onClipSplitAt={handleClipSplitAt}
          progress={progress}
          loopStart={loopStart}
          loopEnd={loopEnd}
          isAudioReady={isAudioReady}
          noteDuration={selectedNoteDuration}
          instruments={instrumentsRef.current}
          armedTrackId={armedTrackId}
          onArmTrack={handleArmTrack}
          audioLevels={audioLevels}
          editTool={editTool}
          measureWidth={measureWidth}
        />
      </main>
      <NewTrackDialog open={isNewTrackDialogOpen} onOpenChange={setIsNewTrackDialogOpen} onCreate={handleCreateTrack} />
      <Toaster />
    </div>
  );
};

export default Index;