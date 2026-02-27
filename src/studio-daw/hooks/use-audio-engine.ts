import { useState, useCallback, useRef, useEffect } from 'react';
import { buildEffectChain, TrackEffect, EffectType, EffectParams, DEFAULT_EFFECT_PARAMS } from '@/studio-daw/audio/effect-chain';
import { analyzeBuffer, AudioAnalysis } from '@/studio-daw/audio/audio-analysis';
import { pitchShift, tempoMatch, applyFilter } from '@/studio-daw/audio/transforms';
import { type MidiClipData, renderMidiToAudioBuffer, isDrumKitProgram, decodeDrumKitProgram } from '@/studio-daw/audio/midi-engine';
import { type ContourAnalysis, getContourAtTime } from '@/studio-daw/audio/contour-analysis';
import { type SynthClipData, type SynthPreset, DEFAULT_SYNTH_PRESET } from '@/studio-daw/audio/synth-engine';

// Re-export types used by other components
export type { TrackEffect, EffectType, EffectParams } from '@/studio-daw/audio/effect-chain';
export type { AudioAnalysis } from '@/studio-daw/audio/audio-analysis';
export type { MidiClipData } from '@/studio-daw/audio/midi-engine';
export type { SynthClipData, SynthPreset } from '@/studio-daw/audio/synth-engine';
export type { ContourAnalysis, ContourSegment, ContourPoint } from '@/studio-daw/audio/contour-analysis';

// Ableton-style track color palette
export const TRACK_COLORS = [
  '#FF6B6B', // coral red
  '#C9A84C', // gold
  '#7EC850', // green
  '#50C8A8', // teal
  '#5B8DEF', // blue
  '#A675E2', // purple
  '#E86DB0', // pink
  '#E8956D', // orange
  '#6DC8E8', // sky blue
  '#B8D458', // lime
];

const generateId = () => Math.random().toString(36).substr(2, 9);

export type TrackType = 'audio' | 'midi' | 'reference' | 'synth';

/** Volume following mode for reference tracks */
export type VolumeFollowMode = 'duck' | 'swell';

/** Data specific to reference tracks (speech/meditation for AI scoring) */
export interface ReferenceTrackData {
  contour: ContourAnalysis;
  volumeFollowEnabled: boolean;
  volumeFollowMode: VolumeFollowMode;
  influenceStrength: number;  // 0-1, how much the contour affects music volume
  linkedTrackIds: string[];   // IDs of music tracks that follow this reference
}

export interface Clip {
  id: string;
  buffer?: AudioBuffer;
  url: string;
  name: string;
  startTime: number;
  duration: number;
  offset: number;
  fadeInDuration: number;   // seconds, 0 = no fade
  fadeOutDuration: number;  // seconds, 0 = no fade
  analysis?: AudioAnalysis;
  role?: string;
  midiData?: MidiClipData;
  synthData?: SynthClipData;
  referenceData?: ReferenceTrackData;
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  clips: Clip[];
  volume: number;
  pan: number;
  muted: boolean;
  soloed?: boolean;
  color: string;
  effects: TrackEffect[];
}

export type TransportState = 'stopped' | 'playing' | 'paused';

/** Total timeline span of all clips on a track */
export function getTrackDuration(track: Track): number {
  if (track.clips.length === 0) return 0;
  return Math.max(...track.clips.map(c => c.startTime + c.duration));
}

interface ActiveClipNode {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
}

interface ActiveTrackChain {
  trackGain: GainNode;
  panNode: StereoPannerNode;
  effectNodes: AudioNode[];
  inputNode: AudioNode;
  /** Sidechain gain nodes on this track that need external modulation */
  sidechainGains?: Map<string, { gain: GainNode; params: import('@/studio-daw/audio/effect-chain').EffectParams }>;
}

interface ActiveSidechainLink {
  analyser: AnalyserNode;
  duckGain: GainNode;
  amount: number;       // 0-1 max reduction
  threshold: number;    // dB
  attack: number;       // seconds
  release: number;      // seconds
  envelope: number;     // current envelope value 0-1
}

export const useAudioEngine = () => {
  const [transportState, setTransportState] = useState<TransportState>('stopped');
  const [currentTime, setCurrentTime] = useState(0);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [masterEffects, setMasterEffects] = useState<TrackEffect[]>([]);

  // Loop state
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const activeClipNodesRef = useRef<Map<string, ActiveClipNode>>(new Map());
  const activeTrackChainsRef = useRef<Map<string, ActiveTrackChain>>(new Map());
  const activeMasterFxNodesRef = useRef<AudioNode[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const masterGainRef = useRef<GainNode | null>(null);
  // Refs for loop state accessible inside rAF callback
  const loopEnabledRef = useRef(false);
  const loopStartRef = useRef(0);
  const loopEndRef = useRef(0);

  // Sidechain modulation state
  const activeSidechainsRef = useRef<ActiveSidechainLink[]>([]);
  const sidechainRafRef = useRef<number>(0);

  // Derived for backward compat
  const isPlaying = transportState === 'playing';

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const masterGain = ctx.createGain();
      masterGain.gain.value = 1.2;
      masterGain.connect(ctx.destination);
      audioContextRef.current = ctx;
      masterGainRef.current = masterGain;
    }
    return audioContextRef.current;
  }, []);

  // Keep loop refs in sync with state
  useEffect(() => { loopEnabledRef.current = loopEnabled; }, [loopEnabled]);
  useEffect(() => { loopStartRef.current = loopStart; }, [loopStart]);
  useEffect(() => { loopEndRef.current = loopEnd; }, [loopEnd]);

  // Ref to schedulePlayback for use inside rAF callback (avoids stale closures)
  const schedulePlaybackRef = useRef<((from: number) => void) | null>(null);

  // Playhead animation
  const updatePlayhead = useCallback(() => {
    if (transportState !== 'playing') return;
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === 'running') {
      const pos = ctx.currentTime - startTimeRef.current;

      // Loop boundary check
      if (loopEnabledRef.current && loopEndRef.current > loopStartRef.current && pos >= loopEndRef.current) {
        // Stop all current nodes and reschedule from loop start
        activeClipNodesRef.current.forEach((node) => {
          try { node.source.stop(); } catch (e) {}
          try { node.source.disconnect(); } catch (e) {}
          try { node.gainNode.disconnect(); } catch (e) {}
        });
        activeClipNodesRef.current.clear();
        activeTrackChainsRef.current.forEach((chain) => {
          try { chain.trackGain.disconnect(); } catch (e) {}
          try { chain.panNode.disconnect(); } catch (e) {}
          chain.effectNodes.forEach(n => { try { n.disconnect(); } catch (e) {} });
        });
        activeTrackChainsRef.current.clear();
        activeMasterFxNodesRef.current.forEach(n => { try { n.disconnect(); } catch (e) {} });
        activeMasterFxNodesRef.current = [];

        schedulePlaybackRef.current?.(loopStartRef.current);
        setCurrentTime(loopStartRef.current);
      } else {
        setCurrentTime(pos);
      }
    }
    requestRef.current = requestAnimationFrame(updatePlayhead);
  }, [transportState]);

  useEffect(() => {
    if (transportState === 'playing') {
      requestRef.current = requestAnimationFrame(updatePlayhead);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [transportState, updatePlayhead]);

  // Buffer loading with validation
  const loadTrackBuffer = useCallback(async (url: string) => {
    const ctx = initAudio();
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      throw new Error(`URL returned ${contentType} instead of audio: ${url}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength < 100) {
      throw new Error(`Response too small (${arrayBuffer.byteLength} bytes), likely not audio: ${url}`);
    }

    return await ctx.decodeAudioData(arrayBuffer);
  }, [initAudio]);

  // === Playback scheduling ===

  const stopAllNodes = useCallback(() => {
    activeClipNodesRef.current.forEach((node) => {
      try { node.source.stop(); } catch (e) {}
      try { node.source.disconnect(); } catch (e) {}
      try { node.gainNode.disconnect(); } catch (e) {}
    });
    activeClipNodesRef.current.clear();

    activeTrackChainsRef.current.forEach((chain) => {
      try { chain.trackGain.disconnect(); } catch (e) {}
      try { chain.panNode.disconnect(); } catch (e) {}
      chain.effectNodes.forEach(n => { try { n.disconnect(); } catch (e) {} });
    });
    activeTrackChainsRef.current.clear();

    // Disconnect master effect nodes
    activeMasterFxNodesRef.current.forEach(n => { try { n.disconnect(); } catch (e) {} });
    activeMasterFxNodesRef.current = [];

    // Clear sidechain links
    activeSidechainsRef.current.forEach(sc => {
      try { sc.analyser.disconnect(); } catch (e) {}
    });
    activeSidechainsRef.current = [];
    cancelAnimationFrame(sidechainRafRef.current);
  }, []);

  const schedulePlayback = useCallback((fromPosition: number) => {
    const ctx = initAudio();
    if (!masterGainRef.current) return;

    startTimeRef.current = ctx.currentTime - fromPosition;

    // Build master effects chain: tracks → masterFx → masterGain → destination
    const { inputNode: masterFxInput, outputNode: masterFxOutput, effectNodes: masterFxNodes } =
      buildEffectChain(ctx, masterEffects);
    masterFxOutput.connect(masterGainRef.current);
    activeMasterFxNodesRef.current = masterFxNodes;

    const soloedTracks = tracks.filter(t => t.soloed);
    const isSoloActive = soloedTracks.length > 0;

    for (const track of tracks) {
      // Build per-track signal chain
      const trackGain = ctx.createGain();
      const panNode = ctx.createStereoPanner();
      const shouldBeSilent = track.muted || (isSoloActive && !track.soloed);
      trackGain.gain.value = shouldBeSilent ? 0 : track.volume;
      panNode.pan.value = track.pan;

      // Build effects chain
      const { inputNode, outputNode, effectNodes, sidechainGains } = buildEffectChain(ctx, track.effects);

      outputNode.connect(trackGain);
      trackGain.connect(panNode);
      panNode.connect(masterFxInput); // Route through master effects

      activeTrackChainsRef.current.set(track.id, {
        trackGain, panNode, effectNodes, inputNode, sidechainGains,
      });

      // Schedule each clip
      for (const clip of track.clips) {
        if (!clip.buffer) continue;

        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd <= fromPosition) continue;

        const source = ctx.createBufferSource();
        const clipGain = ctx.createGain();
        source.buffer = clip.buffer;
        source.loop = false;

        source.connect(clipGain);
        clipGain.connect(inputNode);

        const fadeIn = clip.fadeInDuration || 0;
        const fadeOut = clip.fadeOutDuration || 0;

        if (clip.startTime >= fromPosition) {
          const delay = clip.startTime - fromPosition;
          const schedTime = ctx.currentTime + delay;
          const endTime = schedTime + clip.duration;

          // Apply fade-in envelope
          if (fadeIn > 0) {
            clipGain.gain.setValueAtTime(0, schedTime);
            clipGain.gain.linearRampToValueAtTime(1.0, schedTime + fadeIn);
          } else {
            clipGain.gain.setValueAtTime(1.0, schedTime);
          }

          // Apply fade-out envelope
          if (fadeOut > 0) {
            clipGain.gain.setValueAtTime(1.0, endTime - fadeOut);
            clipGain.gain.linearRampToValueAtTime(0, endTime);
          }

          source.start(schedTime, clip.offset, clip.duration);
        } else {
          const elapsed = fromPosition - clip.startTime;
          const remaining = clip.duration - elapsed;
          const schedTime = ctx.currentTime;

          // Calculate initial gain based on where we are in the fade envelope
          let initialGain = 1.0;
          if (fadeIn > 0 && elapsed < fadeIn) {
            initialGain = elapsed / fadeIn;
          }
          clipGain.gain.setValueAtTime(initialGain, schedTime);

          // Schedule remaining fade-in if still in it
          if (fadeIn > 0 && elapsed < fadeIn) {
            clipGain.gain.linearRampToValueAtTime(1.0, schedTime + (fadeIn - elapsed));
          }

          // Schedule fade-out
          if (fadeOut > 0) {
            const fadeOutStart = clip.duration - fadeOut;
            if (elapsed < fadeOutStart) {
              clipGain.gain.setValueAtTime(1.0, schedTime + (fadeOutStart - elapsed));
              clipGain.gain.linearRampToValueAtTime(0, schedTime + remaining);
            } else {
              // Already in fade-out region
              const fadeOutElapsed = elapsed - fadeOutStart;
              const fadeOutGain = 1.0 - (fadeOutElapsed / fadeOut);
              clipGain.gain.setValueAtTime(Math.max(0, fadeOutGain), schedTime);
              clipGain.gain.linearRampToValueAtTime(0, schedTime + remaining);
            }
          }

          source.start(schedTime, clip.offset + elapsed, remaining);
        }

        activeClipNodesRef.current.set(clip.id, { source, gainNode: clipGain });
      }
    }

    // Wire up sidechain modulation: connect analyser to source tracks
    const sidechainLinks: ActiveSidechainLink[] = [];
    activeTrackChainsRef.current.forEach((chain) => {
      if (!chain.sidechainGains) return;
      chain.sidechainGains.forEach(({ gain: duckGain, params }) => {
        const sourceTrackId = params.sidechainSourceTrackId;
        if (!sourceTrackId) return;
        const sourceChain = activeTrackChainsRef.current.get(sourceTrackId);
        if (!sourceChain) return;

        // Tap into the source track's signal with an analyser
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3;
        sourceChain.trackGain.connect(analyser);

        sidechainLinks.push({
          analyser,
          duckGain,
          amount: params.sidechainAmount ?? 0.8,
          threshold: params.threshold ?? -30,
          attack: params.attack ?? 0.01,
          release: params.release ?? 0.15,
          envelope: 0,
        });
      });
    });
    activeSidechainsRef.current = sidechainLinks;

    // Start sidechain modulation loop if any links exist
    if (sidechainLinks.length > 0) {
      const dataBuffer = new Float32Array(128);
      const modulateSidechain = () => {
        for (const sc of activeSidechainsRef.current) {
          // Read source RMS level
          sc.analyser.getFloatTimeDomainData(dataBuffer);
          let rms = 0;
          for (let i = 0; i < dataBuffer.length; i++) {
            rms += dataBuffer[i] * dataBuffer[i];
          }
          rms = Math.sqrt(rms / dataBuffer.length);
          const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -100;

          // Calculate target gain reduction
          const aboveThreshold = rmsDb > sc.threshold;
          const target = aboveThreshold ? 1.0 : 0.0;

          // Simple envelope follower (attack/release smoothing)
          const dt = 1 / 60; // ~60fps
          const coeff = target > sc.envelope
            ? 1 - Math.exp(-dt / Math.max(sc.attack, 0.001))
            : 1 - Math.exp(-dt / Math.max(sc.release, 0.01));
          sc.envelope += (target - sc.envelope) * coeff;

          // Apply gain: when envelope is 1 (source is loud), reduce by amount
          const gainValue = 1.0 - sc.envelope * sc.amount;
          sc.duckGain.gain.setTargetAtTime(Math.max(0, gainValue), ctx.currentTime, 0.005);
        }
        sidechainRafRef.current = requestAnimationFrame(modulateSidechain);
      };
      sidechainRafRef.current = requestAnimationFrame(modulateSidechain);
    }
  }, [tracks, masterEffects, initAudio]);

  // Keep ref in sync for loop rAF callback
  useEffect(() => { schedulePlaybackRef.current = schedulePlayback; }, [schedulePlayback]);

  // === Transport controls ===

  const play = useCallback(() => {
    if (transportState === 'recording') return; // recording has priority
    const ctx = initAudio();
    if (ctx.state === 'suspended') ctx.resume();

    if (transportState === 'playing') return;

    const startFrom = transportState === 'paused' ? pausedAtRef.current : 0;
    stopAllNodes();
    schedulePlayback(startFrom);
    setTransportState('playing');
  }, [transportState, initAudio, stopAllNodes, schedulePlayback]);

  const pause = useCallback(() => {
    if (transportState !== 'playing') return;
    const ctx = audioContextRef.current;
    pausedAtRef.current = ctx ? ctx.currentTime - startTimeRef.current : 0;
    stopAllNodes();
    setTransportState('paused');
  }, [transportState, stopAllNodes]);

  const stop = useCallback(() => {
    stopAllNodes();
    pausedAtRef.current = 0;
    setCurrentTime(0);
    setTransportState('stopped');
  }, [stopAllNodes]);

  const seekForward = useCallback(() => {
    const newPos = currentTime + 5;
    if (transportState === 'playing') {
      stopAllNodes();
      schedulePlayback(newPos);
    } else {
      pausedAtRef.current = newPos;
      setCurrentTime(newPos);
      if (transportState === 'stopped') setTransportState('paused');
    }
  }, [currentTime, transportState, stopAllNodes, schedulePlayback]);

  const seekBackward = useCallback(() => {
    const newPos = Math.max(0, currentTime - 5);
    if (transportState === 'playing') {
      stopAllNodes();
      schedulePlayback(newPos);
    } else {
      pausedAtRef.current = newPos;
      setCurrentTime(newPos);
      if (transportState === 'stopped' && newPos > 0) setTransportState('paused');
    }
  }, [currentTime, transportState, stopAllNodes, schedulePlayback]);

  /** Seek to an absolute time position */
  const seekTo = useCallback((time: number) => {
    const newPos = Math.max(0, time);
    if (transportState === 'playing') {
      stopAllNodes();
      schedulePlayback(newPos);
    } else {
      pausedAtRef.current = newPos;
      setCurrentTime(newPos);
      if (transportState === 'stopped' && newPos > 0) setTransportState('paused');
    }
  }, [transportState, stopAllNodes, schedulePlayback]);

  const toggleLoop = useCallback(() => {
    setLoopEnabled(prev => !prev);
  }, []);

  const setLoopRegion = useCallback((start: number, end: number) => {
    setLoopStart(Math.max(0, start));
    setLoopEnd(Math.max(0, end));
  }, []);

  // Real-time volume/mute/solo/pan updates during playback
  useEffect(() => {
    if (transportState !== 'playing') return;
    const soloedTracks = tracks.filter(t => t.soloed);
    const isSoloActive = soloedTracks.length > 0;
    const ctx = audioContextRef.current;
    if (!ctx) return;

    tracks.forEach(t => {
      const chain = activeTrackChainsRef.current.get(t.id);
      if (chain) {
        const shouldBeSilent = t.muted || (isSoloActive && !t.soloed);
        const targetGain = shouldBeSilent ? 0 : t.volume;
        chain.trackGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.05);
        chain.panNode.pan.setTargetAtTime(t.pan, ctx.currentTime, 0.05);
      }
    });
  }, [tracks, transportState]);

  // Real-time contour following for AI Scoring
  const contourFollowRef = useRef<number>(0);
  const lastContourUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (transportState !== 'playing') {
      cancelAnimationFrame(contourFollowRef.current);
      return;
    }

    const ctx = audioContextRef.current;
    if (!ctx) return;

    // Find reference tracks with volume following enabled
    const referenceTrack = tracks.find(t =>
      t.type === 'reference' &&
      t.clips[0]?.referenceData?.volumeFollowEnabled &&
      t.clips[0]?.referenceData?.contour
    );

    if (!referenceTrack) return;

    const refData = referenceTrack.clips[0].referenceData!;
    const contour = refData.contour;
    const mode = refData.volumeFollowMode;
    const influence = refData.influenceStrength;

    // Get linked tracks, or all non-reference tracks if none linked
    const linkedIds = refData.linkedTrackIds || [];
    const targetTracks = linkedIds.length > 0
      ? tracks.filter(t => linkedIds.includes(t.id))
      : tracks.filter(t => t.type !== 'reference');

    const updateContourGains = () => {
      if (transportState !== 'playing') return;

      const playheadTime = ctx.currentTime - startTimeRef.current;

      // Throttle to ~30fps for efficiency
      if (playheadTime - lastContourUpdateRef.current < 0.033) {
        contourFollowRef.current = requestAnimationFrame(updateContourGains);
        return;
      }
      lastContourUpdateRef.current = playheadTime;

      // Get contour values at current time
      const { amplitude, speechLikelihood } = getContourAtTime(contour, playheadTime);

      // Calculate gain multiplier based on mode
      let gainMultiplier: number;
      if (mode === 'duck') {
        // Duck mode: Higher amplitude/speech = lower music volume
        const duckFactor = 1 - (amplitude * influence * 0.6);
        const speechDuck = speechLikelihood > 0.5 ? (1 - influence * 0.3) : 1;
        gainMultiplier = Math.max(0.2, duckFactor * speechDuck);
      } else {
        // Swell mode: Higher amplitude = higher music volume
        const swellFactor = 0.4 + (amplitude * influence * 0.6);
        gainMultiplier = Math.min(1.2, swellFactor);
      }

      // Apply to target tracks
      const soloedTracks = tracks.filter(t => t.soloed);
      const isSoloActive = soloedTracks.length > 0;

      targetTracks.forEach(t => {
        const chain = activeTrackChainsRef.current.get(t.id);
        if (!chain) return;

        const shouldBeSilent = t.muted || (isSoloActive && !t.soloed);
        if (shouldBeSilent) return;

        const baseVolume = t.volume;
        const targetGain = baseVolume * gainMultiplier;

        // Smooth transition to prevent clicks
        try {
          chain.trackGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.1);
        } catch (e) {
          // Ignore if context is closed
        }
      });

      contourFollowRef.current = requestAnimationFrame(updateContourGains);
    };

    contourFollowRef.current = requestAnimationFrame(updateContourGains);

    return () => {
      cancelAnimationFrame(contourFollowRef.current);
    };
  }, [transportState, tracks]);

  // === Track operations ===

  const addTrack = useCallback(async (name: string, url: string, role?: string) => {
    try {
      const buffer = await loadTrackBuffer(url);
      const clipId = generateId();
      const trackId = generateId();
      const clip: Clip = {
        id: clipId,
        buffer,
        url,
        name,
        startTime: 0,
        duration: buffer.duration,
        offset: 0,
        fadeInDuration: 0,
        fadeOutDuration: 0,
        role,
      };
      setTracks(prev => {
        const color = TRACK_COLORS[prev.length % TRACK_COLORS.length];
        return [...prev, {
          id: trackId,
          name,
          type: 'audio' as TrackType,
          clips: [clip],
          volume: 1.0,
          pan: 0,
          muted: false,
          color,
          effects: [],
        }];
      });

      // Background analysis (non-blocking)
      analyzeBuffer(buffer).then(analysis => {
        setTracks(prev => prev.map(track => {
          if (track.id !== trackId) return track;
          return {
            ...track,
            clips: track.clips.map(c =>
              c.id === clipId ? { ...c, analysis } : c
            ),
          };
        }));
      }).catch(err => {
        console.warn("[AudioEngine] Analysis failed for clip:", err);
      });
    } catch (error) {
      console.error(`[AudioEngine] Failed to load track "${name}" from ${url}:`, error);
    }
  }, [loadTrackBuffer]);

  const addMidiTrack = useCallback(async (name: string, midiData: MidiClipData, role?: string): Promise<{ trackId: string; clipId: string } | null> => {
    try {
      const buffer = await renderMidiToAudioBuffer(midiData);
      const clipId = generateId();
      const trackId = generateId();
      const clip: Clip = {
        id: clipId,
        buffer,
        url: '',
        name,
        startTime: 0,
        duration: midiData.totalDuration,
        offset: 0,
        fadeInDuration: 0,
        fadeOutDuration: 0,
        midiData,
        role,
      };
      setTracks(prev => {
        const color = TRACK_COLORS[prev.length % TRACK_COLORS.length];
        return [...prev, {
          id: trackId,
          name,
          type: 'midi' as TrackType,
          clips: [clip],
          volume: 1.0,
          pan: 0,
          muted: false,
          color,
          effects: [],
        }];
      });

      // Background analysis
      analyzeBuffer(buffer).then(analysis => {
        setTracks(prev => prev.map(track => {
          if (track.id !== trackId) return track;
          return {
            ...track,
            clips: track.clips.map(c =>
              c.id === clipId ? { ...c, analysis } : c
            ),
          };
        }));
      }).catch(err => {
        console.warn("[AudioEngine] Analysis failed for MIDI clip:", err);
      });

      return { trackId, clipId };
    } catch (error) {
      console.error("[AudioEngine] Failed to create MIDI track:", error);
      return null;
    }
  }, []);

  const addReferenceTrack = useCallback((
    name: string,
    buffer: AudioBuffer,
    contour: ContourAnalysis
  ): { trackId: string; clipId: string } => {
    const clipId = generateId();
    const trackId = generateId();

    const referenceData: ReferenceTrackData = {
      contour,
      volumeFollowEnabled: true,
      volumeFollowMode: 'duck',
      influenceStrength: 0.5,
      linkedTrackIds: [],
    };

    const clip: Clip = {
      id: clipId,
      buffer,
      url: '',
      name,
      startTime: 0,
      duration: buffer.duration,
      offset: 0,
      fadeInDuration: 0,
      fadeOutDuration: 0,
      referenceData,
    };

    setTracks(prev => {
      const color = '#9CA3AF'; // Gray color for reference tracks
      return [...prev, {
        id: trackId,
        name,
        type: 'reference' as TrackType,
        clips: [clip],
        volume: 0.7, // Default lower volume for reference audio
        pan: 0,
        muted: false,
        color,
        effects: [],
      }];
    });

    return { trackId, clipId };
  }, []);

  const updateReferenceTrackSettings = useCallback((
    trackId: string,
    settings: Partial<Omit<ReferenceTrackData, 'contour'>>
  ) => {
    setTracks(prev => prev.map(track => {
      if (track.id !== trackId || track.type !== 'reference') return track;
      return {
        ...track,
        clips: track.clips.map(clip => {
          if (!clip.referenceData) return clip;
          return {
            ...clip,
            referenceData: { ...clip.referenceData, ...settings },
          };
        }),
      };
    }));
  }, []);

  const linkTracksToReference = useCallback((referenceTrackId: string, musicTrackIds: string[]) => {
    setTracks(prev => prev.map(track => {
      if (track.id !== referenceTrackId || track.type !== 'reference') return track;
      return {
        ...track,
        clips: track.clips.map(clip => {
          if (!clip.referenceData) return clip;
          return {
            ...clip,
            referenceData: { ...clip.referenceData, linkedTrackIds: musicTrackIds },
          };
        }),
      };
    }));
  }, []);

  const addEmptyTrack = useCallback((trackType: TrackType = 'audio', midiProgram?: number): { trackId: string; clipId?: string } => {
    const trackId = generateId();
    let clipId: string | undefined;

    if (trackType === 'midi') {
      // Create a blank MIDI clip so the user has something to draw on
      clipId = generateId();
      const defaultMidiData: MidiClipData = {
        notes: [],
        program: midiProgram ?? 89, // Pad 2 (warm) default
        bankMSB: 0,
        bankLSB: 0,
        totalDuration: 16, // 16 seconds default canvas
      };

      setTracks(prev => {
        const color = TRACK_COLORS[prev.length % TRACK_COLORS.length];
        return [...prev, {
          id: trackId,
          name: `Track ${prev.length + 1}`,
          type: trackType,
          clips: [{
            id: clipId!,
            buffer: undefined,
            url: '',
            name: 'New MIDI Clip',
            startTime: 0,
            duration: defaultMidiData.totalDuration,
            offset: 0,
            fadeInDuration: 0,
            fadeOutDuration: 0,
            midiData: defaultMidiData,
          }],
          volume: 1.0,
          pan: 0,
          muted: false,
          color,
          effects: [],
        }];
      });
    } else if (trackType === 'synth') {
      // Create a synth clip with default preset and empty notes
      clipId = generateId();
      const defaultSynthData: SynthClipData = {
        notes: [],
        preset: { ...DEFAULT_SYNTH_PRESET },
        totalDuration: 16,
      };

      setTracks(prev => {
        const color = TRACK_COLORS[prev.length % TRACK_COLORS.length];
        return [...prev, {
          id: trackId,
          name: `Synth ${prev.filter(t => t.type === 'synth').length + 1}`,
          type: trackType,
          clips: [{
            id: clipId!,
            buffer: undefined,
            url: '',
            name: 'New Synth Clip',
            startTime: 0,
            duration: defaultSynthData.totalDuration,
            offset: 0,
            fadeInDuration: 0,
            fadeOutDuration: 0,
            synthData: defaultSynthData,
          }],
          volume: 1.0,
          pan: 0,
          muted: false,
          color,
          effects: [],
        }];
      });
    } else {
      setTracks(prev => {
        const color = TRACK_COLORS[prev.length % TRACK_COLORS.length];
        return [...prev, {
          id: trackId,
          name: `Track ${prev.length + 1}`,
          type: trackType,
          clips: [],
          volume: 1.0,
          pan: 0,
          muted: false,
          color,
          effects: [],
        }];
      });
    }

    return { trackId, clipId };
  }, []);

  const addClipToTrack = useCallback(async (trackId: string, name: string, url: string) => {
    try {
      const buffer = await loadTrackBuffer(url);
      const clipId = generateId();
      const clip: Clip = {
        id: clipId,
        buffer,
        url,
        name,
        startTime: 0,
        duration: buffer.duration,
        offset: 0,
        fadeInDuration: 0,
        fadeOutDuration: 0,
      };
      setTracks(prev => prev.map(track => {
        if (track.id !== trackId) return track;
        const lastEnd = track.clips.length > 0
          ? Math.max(...track.clips.map(c => c.startTime + c.duration))
          : 0;
        return {
          ...track,
          clips: [...track.clips, { ...clip, startTime: lastEnd }],
        };
      }));
    } catch (error) {
      console.error("[AudioEngine] Failed to load clip:", error);
    }
  }, [loadTrackBuffer]);

  const removeTrack = useCallback((id: string) => {
    // Stop any active clips for this track
    const chain = activeTrackChainsRef.current.get(id);
    if (chain) {
      try { chain.trackGain.disconnect(); } catch (e) {}
      try { chain.panNode.disconnect(); } catch (e) {}
      chain.effectNodes.forEach(n => { try { n.disconnect(); } catch (e) {} });
      activeTrackChainsRef.current.delete(id);
    }
    setTracks(prev => {
      const track = prev.find(t => t.id === id);
      if (track) {
        track.clips.forEach(clip => {
          const node = activeClipNodesRef.current.get(clip.id);
          if (node) {
            try { node.source.stop(); } catch (e) {}
            try { node.source.disconnect(); } catch (e) {}
            try { node.gainNode.disconnect(); } catch (e) {}
            activeClipNodesRef.current.delete(clip.id);
          }
        });
      }
      return prev.filter(t => t.id !== id);
    });
  }, []);

  // === Clip operations ===

  const splitClip = useCallback((trackId: string, clipId: string, atTime: number) => {
    setTracks(prev => {
      const trackIndex = prev.findIndex(t => t.id === trackId);
      if (trackIndex === -1) return prev;
      const track = prev[trackIndex];
      const clipIndex = track.clips.findIndex(c => c.id === clipId);
      if (clipIndex === -1) return prev;
      const clip = track.clips[clipIndex];

      if (atTime <= clip.startTime || atTime >= clip.startTime + clip.duration) return prev;

      const splitPoint = atTime - clip.startTime;

      const leftClip: Clip = {
        id: generateId(),
        buffer: clip.buffer,
        url: clip.url,
        name: clip.name,
        startTime: clip.startTime,
        duration: splitPoint,
        offset: clip.offset,
        fadeInDuration: Math.min(clip.fadeInDuration, splitPoint),
        fadeOutDuration: 0,
      };

      const rightClip: Clip = {
        id: generateId(),
        buffer: clip.buffer,
        url: clip.url,
        name: clip.name,
        startTime: atTime,
        duration: clip.duration - splitPoint,
        offset: clip.offset + splitPoint,
        fadeInDuration: 0,
        fadeOutDuration: Math.min(clip.fadeOutDuration, clip.duration - splitPoint),
      };

      const newClips = [...track.clips];
      newClips.splice(clipIndex, 1, leftClip, rightClip);

      const newTracks = [...prev];
      newTracks[trackIndex] = { ...track, clips: newClips };
      return newTracks;
    });
  }, []);

  const duplicateClip = useCallback((trackId: string, clipId: string) => {
    setTracks(prev => {
      const trackIndex = prev.findIndex(t => t.id === trackId);
      if (trackIndex === -1) return prev;
      const track = prev[trackIndex];
      const clip = track.clips.find(c => c.id === clipId);
      if (!clip) return prev;

      const duplicate: Clip = {
        ...clip,
        id: generateId(),
        name: `${clip.name} (copy)`,
        startTime: clip.startTime + clip.duration + 0.5,
      };

      const newTracks = [...prev];
      newTracks[trackIndex] = { ...track, clips: [...track.clips, duplicate] };
      return newTracks;
    });
  }, []);

  const deleteClip = useCallback((trackId: string, clipId: string) => {
    // Stop active clip node if playing
    const node = activeClipNodesRef.current.get(clipId);
    if (node) {
      try { node.source.stop(); } catch (e) {}
      try { node.source.disconnect(); } catch (e) {}
      try { node.gainNode.disconnect(); } catch (e) {}
      activeClipNodesRef.current.delete(clipId);
    }
    setTracks(prev => {
      const trackIndex = prev.findIndex(t => t.id === trackId);
      if (trackIndex === -1) return prev;
      const track = prev[trackIndex];
      const newTracks = [...prev];
      newTracks[trackIndex] = { ...track, clips: track.clips.filter(c => c.id !== clipId) };
      return newTracks;
    });
  }, []);

  const moveClip = useCallback((trackId: string, clipId: string, newStartTime: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id !== trackId) return track;
      return {
        ...track,
        clips: track.clips.map(c =>
          c.id === clipId ? { ...c, startTime: Math.max(0, newStartTime) } : c
        ),
      };
    }));
  }, []);

  const updateClipFades = useCallback((trackId: string, clipId: string, fades: { fadeInDuration?: number; fadeOutDuration?: number }) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        clips: t.clips.map(c => {
          if (c.id !== clipId) return c;
          const fadeIn = Math.max(0, fades.fadeInDuration ?? c.fadeInDuration);
          const fadeOut = Math.max(0, fades.fadeOutDuration ?? c.fadeOutDuration);
          // Clamp so fades don't overlap
          const total = fadeIn + fadeOut;
          if (total > c.duration) {
            const scale = c.duration / total;
            return { ...c, fadeInDuration: fadeIn * scale, fadeOutDuration: fadeOut * scale };
          }
          return { ...c, fadeInDuration: fadeIn, fadeOutDuration: fadeOut };
        }),
      };
    }));
  }, []);

  // === Audio transforms ===

  const applyTransformToClip = useCallback(async (
    trackId: string,
    clipId: string,
    transform: 'pitch_shift' | 'tempo_match' | 'filter',
    params: Record<string, number>
  ) => {
    const track = tracks.find(t => t.id === trackId);
    const clip = track?.clips.find(c => c.id === clipId);
    if (!clip?.buffer) return;

    let newBuffer: AudioBuffer;
    try {
      switch (transform) {
        case 'pitch_shift':
          newBuffer = await pitchShift(clip.buffer, params.semitones);
          break;
        case 'tempo_match':
          newBuffer = await tempoMatch(clip.buffer, params.currentBPM, params.targetBPM);
          break;
        case 'filter':
          newBuffer = await applyFilter(
            clip.buffer,
            (['lowpass', 'highpass', 'bandpass'][params.type] || 'lowpass') as BiquadFilterType,
            params.frequency,
            params.Q || 1
          );
          break;
        default:
          return;
      }
    } catch (err) {
      console.error("[AudioEngine] Transform failed:", err);
      return;
    }

    // Update clip with new buffer
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        clips: t.clips.map(c => {
          if (c.id !== clipId) return c;
          return { ...c, buffer: newBuffer, duration: newBuffer.duration, offset: 0 };
        }),
      };
    }));

    // Re-analyze in background
    analyzeBuffer(newBuffer).then(analysis => {
      setTracks(prev => prev.map(t => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          clips: t.clips.map(c =>
            c.id === clipId ? { ...c, analysis } : c
          ),
        };
      }));
    }).catch(() => {});
  }, [tracks]);

  // === MIDI clip update ===

  const updateMidiClip = useCallback(async (
    trackId: string,
    clipId: string,
    newMidiData: MidiClipData,
  ) => {
    try {
      const buffer = await renderMidiToAudioBuffer(newMidiData);
      setTracks(prev => prev.map(track => {
        if (track.id !== trackId) return track;
        return {
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip;
            return {
              ...clip,
              midiData: newMidiData,
              buffer,
              duration: newMidiData.totalDuration,
            };
          }),
        };
      }));
    } catch (error) {
      console.error("[AudioEngine] Failed to update MIDI clip:", error);
    }
  }, []);

  // Change MIDI instrument (program) for a track
  const changeMidiInstrument = useCallback(async (trackId: string, newProgram: number) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track || track.type !== 'midi') return;

    const clip = track.clips[0];
    if (!clip?.midiData) return;

    try {
      // Decode drum kit virtual programs (>= 128) to bank 128 + actual program
      const isDrum = isDrumKitProgram(newProgram);
      const actualProgram = isDrum ? decodeDrumKitProgram(newProgram) : newProgram;
      const bankMSB = isDrum ? 128 : 0;
      const drumChannel = 9; // GM percussion channel

      const newMidiData: MidiClipData = {
        ...clip.midiData,
        program: actualProgram,
        bankMSB,
        bankLSB: 0,
        notes: isDrum
          ? clip.midiData.notes.map(n => ({ ...n, channel: drumChannel }))
          : clip.midiData.notes.map(n => ({ ...n, channel: 0 })),
      };

      const buffer = await renderMidiToAudioBuffer(newMidiData);

      setTracks(prev => prev.map(t => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          clips: t.clips.map(c => {
            if (c.id !== clip.id) return c;
            return {
              ...c,
              midiData: newMidiData,
              buffer,
            };
          }),
        };
      }));
    } catch (error) {
      console.error("[AudioEngine] Failed to change MIDI instrument:", error);
    }
  }, [tracks]);

  // === Recording integration ===

  const addRecordedTrack = useCallback((
    name: string,
    buffer: AudioBuffer,
    trackType: TrackType = 'audio',
    midiData?: MidiClipData,
    startTime: number = 0,
  ): { trackId: string; clipId: string } => {
    const trackId = generateId();
    const clipId = generateId();
    const clip: Clip = {
      id: clipId,
      buffer,
      url: '',
      name,
      startTime,
      duration: midiData?.totalDuration ?? buffer.duration,
      offset: 0,
      fadeInDuration: 0,
      fadeOutDuration: 0,
      midiData,
    };
    setTracks(prev => {
      const color = TRACK_COLORS[prev.length % TRACK_COLORS.length];
      return [...prev, {
        id: trackId,
        name,
        type: trackType,
        clips: [clip],
        volume: 1.0,
        pan: 0,
        muted: false,
        color,
        effects: [],
      }];
    });

    // Background analysis
    analyzeBuffer(buffer).then(analysis => {
      setTracks(prev => prev.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.id === clipId ? { ...c, analysis } : c
        ),
      })));
    }).catch(() => {});

    return { trackId, clipId };
  }, []);

  const addRecordedClipToTrack = useCallback((
    trackId: string,
    buffer: AudioBuffer,
    startTime: number,
    name: string,
    midiData?: MidiClipData,
  ): string => {
    const clipId = generateId();
    setTracks(prev => prev.map(track => {
      if (track.id !== trackId) return track;
      return {
        ...track,
        clips: [...track.clips, {
          id: clipId,
          buffer,
          url: '',
          name,
          startTime,
          duration: midiData?.totalDuration ?? buffer.duration,
          offset: 0,
          fadeInDuration: 0,
          fadeOutDuration: 0,
          midiData,
        }],
      };
    }));

    // Background analysis
    analyzeBuffer(buffer).then(analysis => {
      setTracks(prev => prev.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.id === clipId ? { ...c, analysis } : c
        ),
      })));
    }).catch(() => {});

    return clipId;
  }, []);

  // === Effect management ===

  const addEffect = useCallback((trackId: string, type: EffectType) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        effects: [...t.effects, {
          id: generateId(),
          type,
          enabled: true,
          params: { ...DEFAULT_EFFECT_PARAMS[type] },
        }],
      };
    }));
  }, []);

  const removeEffect = useCallback((trackId: string, effectId: string) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      return { ...t, effects: t.effects.filter(e => e.id !== effectId) };
    }));
  }, []);

  const updateEffect = useCallback((trackId: string, effectId: string, params: Partial<EffectParams>) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        effects: t.effects.map(e =>
          e.id === effectId ? { ...e, params: { ...e.params, ...params } } : e
        ),
      };
    }));
  }, []);

  const toggleEffect = useCallback((trackId: string, effectId: string) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        effects: t.effects.map(e =>
          e.id === effectId ? { ...e, enabled: !e.enabled } : e
        ),
      };
    }));
  }, []);

  // === Master effect management ===

  const addMasterEffect = useCallback((type: EffectType) => {
    setMasterEffects(prev => [...prev, {
      id: generateId(),
      type,
      enabled: true,
      params: { ...DEFAULT_EFFECT_PARAMS[type] },
    }]);
  }, []);

  const removeMasterEffect = useCallback((effectId: string) => {
    setMasterEffects(prev => prev.filter(e => e.id !== effectId));
  }, []);

  const updateMasterEffect = useCallback((effectId: string, params: Partial<EffectParams>) => {
    setMasterEffects(prev => prev.map(e =>
      e.id === effectId ? { ...e, params: { ...e.params, ...params } } : e
    ));
  }, []);

  const toggleMasterEffect = useCallback((effectId: string) => {
    setMasterEffects(prev => prev.map(e =>
      e.id === effectId ? { ...e, enabled: !e.enabled } : e
    ));
  }, []);

  return {
    tracks,
    setTracks,
    transportState,
    isPlaying,
    currentTime,
    // Transport
    play,
    pause,
    stop,
    seekForward,
    seekBackward,
    seekTo,
    // Track operations
    addTrack,
    addMidiTrack,
    addReferenceTrack,
    updateReferenceTrackSettings,
    linkTracksToReference,
    addEmptyTrack,
    addClipToTrack,
    removeTrack,
    // Clip operations
    splitClip,
    duplicateClip,
    deleteClip,
    moveClip,
    updateMidiClip,
    changeMidiInstrument,
    updateClipFades,
    // Effects
    addEffect,
    removeEffect,
    updateEffect,
    toggleEffect,
    // Master effects
    masterEffects,
    setMasterEffects,
    addMasterEffect,
    removeMasterEffect,
    updateMasterEffect,
    toggleMasterEffect,
    // Loop
    loopEnabled,
    loopStart,
    loopEnd,
    toggleLoop,
    setLoopRegion,
    setLoopEnabled,
    // Recording integration
    addRecordedTrack,
    addRecordedClipToTrack,
    getAudioContext: initAudio,
    // Transforms
    applyTransformToClip,
    // Buffer loading (for project loading)
    loadTrackBuffer,
  };
};
