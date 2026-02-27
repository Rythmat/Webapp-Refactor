import { useState, useCallback, useRef, useEffect } from 'react';

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  groupId: string;
}

export type AudioPermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';

interface UseAudioRecordingOptions {
  audioContext: AudioContext | null;
}

export interface UseAudioRecordingReturn {
  // Device management
  devices: AudioDeviceInfo[];
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string) => void;
  refreshDevices: () => Promise<void>;
  permissionState: AudioPermissionState;
  requestPermission: () => Promise<boolean>;

  // Recording state
  isRecording: boolean;
  recordingDuration: number;

  // Recording controls
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<AudioBuffer | null>;
  cancelRecording: () => void;

  // Input monitoring
  inputLevel: number;
  isMonitoring: boolean;
  setIsMonitoring: (enabled: boolean) => void;

  // Error handling
  error: string | null;
  clearError: () => void;
}

/** Pick the best supported recording MIME type */
function getRecordingMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return ''; // let the browser pick
}

export function useAudioRecording(
  options: UseAudioRecordingOptions,
): UseAudioRecordingReturn {
  const [devices, setDevices] = useState<AudioDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<AudioPermissionState>('prompt');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [inputLevel, setInputLevel] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelRafRef = useRef<number>(0);
  const resolveStopRef = useRef<((buffer: AudioBuffer | null) => void) | null>(null);

  // Check initial API availability
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionState('unavailable');
    }
  }, []);

  // Enumerate audio input devices
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices) return;
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
          groupId: d.groupId,
        }));
      setDevices(audioInputs);

      // Auto-select first device if none selected
      if (!selectedDeviceId && audioInputs.length > 0) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('[AudioRecording] Failed to enumerate devices:', err);
    }
  }, [selectedDeviceId]);

  // Listen for device changes (USB hot-plug)
  useEffect(() => {
    if (!navigator.mediaDevices) return;

    const handleDeviceChange = () => {
      refreshDevices();
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    // Initial enumeration
    refreshDevices();

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [refreshDevices]);

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState('unavailable');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately — we just needed the permission
      stream.getTracks().forEach(t => t.stop());
      setPermissionState('granted');
      await refreshDevices(); // re-enumerate to get labels
      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
      } else {
        setError(`Microphone error: ${err.message}`);
      }
      return false;
    }
  }, [refreshDevices]);

  // Input level metering loop
  const startLevelMetering = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.fftSize);

    const tick = () => {
      analyser.getByteTimeDomainData(dataArray);

      // Compute RMS
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const sample = (dataArray[i] - 128) / 128;
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      setInputLevel(Math.min(1, rms * 3)); // scale up for visibility

      levelRafRef.current = requestAnimationFrame(tick);
    };

    levelRafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopLevelMetering = useCallback(() => {
    cancelAnimationFrame(levelRafRef.current);
    setInputLevel(0);
  }, []);

  // Cleanup helper
  const cleanupRecording = useCallback(() => {
    stopLevelMetering();

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch {}
      sourceNodeRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch {}
      analyserRef.current = null;
    }
    if (monitorGainRef.current) {
      try { monitorGainRef.current.disconnect(); } catch {}
      monitorGainRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, [stopLevelMetering]);

  // Start recording
  const startRecording = useCallback(async () => {
    const ctx = options.audioContext;
    if (!ctx) {
      setError('Audio context not initialized');
      return;
    }

    if (ctx.state === 'suspended') await ctx.resume();

    setError(null);
    chunksRef.current = [];
    setRecordingDuration(0);

    // Get the media stream with selected device
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      sampleRate: ctx.sampleRate,
    };
    if (selectedDeviceId) {
      audioConstraints.deviceId = { exact: selectedDeviceId };
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      setPermissionState('granted');
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setError('Microphone access denied. Please allow it in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
        setError('Selected audio device not found. Try refreshing devices.');
        await refreshDevices();
      } else {
        setError(`Recording failed: ${err.message}`);
      }
      return;
    }

    mediaStreamRef.current = stream;

    // Build audio graph: stream → source → analyser → monitorGain → destination
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    const monitorGain = ctx.createGain();
    monitorGain.gain.value = isMonitoring ? 0.7 : 0;

    source.connect(analyser);
    analyser.connect(monitorGain);
    monitorGain.connect(ctx.destination);

    sourceNodeRef.current = source;
    analyserRef.current = analyser;
    monitorGainRef.current = monitorGain;

    // Start level metering
    startLevelMetering();

    // Handle device disconnection during recording
    stream.getAudioTracks().forEach(track => {
      track.addEventListener('ended', () => {
        if (isRecording) {
          console.warn('[AudioRecording] Audio track ended unexpectedly (device disconnected?)');
          // Force-stop and save whatever we have
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }
      });
    });

    // Create MediaRecorder
    const mimeType = getRecordingMimeType();
    const recorderOptions: MediaRecorderOptions = {};
    if (mimeType) recorderOptions.mimeType = mimeType;

    const recorder = new MediaRecorder(stream, recorderOptions);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = async () => {
      const resolve = resolveStopRef.current;
      resolveStopRef.current = null;

      if (chunksRef.current.length === 0) {
        cleanupRecording();
        setIsRecording(false);
        resolve?.(null);
        return;
      }

      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      cleanupRecording();
      setIsRecording(false);

      // Decode to AudioBuffer
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const audioCtx = options.audioContext || new AudioContext();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        if (audioBuffer.duration < 0.1) {
          resolve?.(null);
          return;
        }

        resolve?.(audioBuffer);
      } catch (err) {
        console.error('[AudioRecording] Failed to decode recorded audio:', err);
        setError('Failed to process recording. The audio format may not be supported.');
        resolve?.(null);
      }
    };

    recorder.start(100); // 100ms timeslices

    // Start duration timer
    const startedAt = Date.now();
    durationTimerRef.current = setInterval(() => {
      setRecordingDuration((Date.now() - startedAt) / 1000);
    }, 100);

    setIsRecording(true);
  }, [
    options.audioContext, selectedDeviceId, isMonitoring,
    startLevelMetering, cleanupRecording, refreshDevices, isRecording,
  ]);

  // Stop recording — returns the AudioBuffer
  const stopRecording = useCallback((): Promise<AudioBuffer | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state !== 'recording') {
        cleanupRecording();
        setIsRecording(false);
        resolve(null);
        return;
      }

      resolveStopRef.current = resolve;
      recorder.stop();
    });
  }, [cleanupRecording]);

  // Cancel recording — discards data
  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      resolveStopRef.current = null;
      chunksRef.current = []; // discard
      recorder.stop();
    }
    cleanupRecording();
    setIsRecording(false);
    setRecordingDuration(0);
  }, [cleanupRecording]);

  // Update monitor gain when monitoring state changes
  useEffect(() => {
    if (monitorGainRef.current && options.audioContext) {
      monitorGainRef.current.gain.setTargetAtTime(
        isMonitoring ? 0.7 : 0,
        options.audioContext.currentTime,
        0.05,
      );
    }
  }, [isMonitoring, options.audioContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

  const clearError = useCallback(() => setError(null), []);

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    refreshDevices,
    permissionState,
    requestPermission,
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    inputLevel,
    isMonitoring,
    setIsMonitoring,
    error,
    clearError,
  };
}
