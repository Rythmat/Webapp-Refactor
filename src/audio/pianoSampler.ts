import * as Tone from 'tone';
import {
  trackAudioTrigger,
  trackAudioRelease,
} from '@/telemetry/hooks/useTelemetryAudio';

const NOTE_SEQUENCE = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

const buildPianoSampleUrls = () => {
  const urls: Record<string, string> = {};
  for (let octave = 1; octave <= 7; octave += 1) {
    NOTE_SEQUENCE.forEach((note) => {
      const fileNote = note.replace('#', 's');
      urls[`${note}${octave}`] = `${fileNote}${octave}.mp3`;
    });
  }
  urls.C8 = 'C8.mp3';
  return urls;
};

let samplerInstance: Tone.Sampler | null = null;
let samplerPromise: Promise<Tone.Sampler> | null = null;
let volumeDb = 0;
const activeNotes = new Set<string>();

const normalizeVelocity = (velocity?: number) => {
  if (typeof velocity !== 'number') return 0.8;
  const normalized = velocity > 1 ? velocity / 127 : velocity;
  return Math.max(0, Math.min(1, normalized));
};

const resumeContextIfNeeded = async () => {
  const context = Tone.getContext();
  if (context.state !== 'running') {
    try {
      await context.resume();
    } catch (error) {
      console.warn('Failed to resume Tone.js audio context', error);
    }
  }
  return context.state === 'running';
};

const ensureSamplerLoaded = async () => {
  const sampler = await getPianoSampler();
  if (!sampler.loaded) {
    await Tone.loaded();
  }
  return sampler;
};

export const startPianoSampler = async () => {
  if (Tone.getContext().state !== 'running') {
    await Tone.start();
  }
  await resumeContextIfNeeded();
  await ensureSamplerLoaded();
};

export const getPianoSampler = async (): Promise<Tone.Sampler> => {
  if (samplerInstance) {
    return samplerInstance;
  }
  if (!samplerPromise) {
    samplerPromise = (async () => {
      const sampler = new Tone.Sampler({
        urls: buildPianoSampleUrls(),
        baseUrl: '/samples/piano/',
      }).toDestination();
      sampler.volume.value = volumeDb;
      samplerInstance = sampler;
      await Tone.loaded();
      return sampler;
    })();
  }
  return samplerPromise;
};

export const setPianoSamplerVolume = (db: number) => {
  volumeDb = db;
  if (samplerInstance) {
    samplerInstance.volume.value = db;
  }
};

export const getPianoSamplerVolume = () => volumeDb;

export const releaseAllPianoNotes = async () => {
  if (activeNotes.size === 0) return;
  const isRunning = await resumeContextIfNeeded();
  if (!isRunning) {
    activeNotes.clear();
    return;
  }
  const sampler = await ensureSamplerLoaded();
  activeNotes.forEach((note) => sampler.triggerRelease(note));
  activeNotes.clear();
};

export const triggerPianoAttack = async (
  note: string,
  velocity?: number,
  time?: number,
): Promise<void> => {
  const start = performance.now();
  const isRunning = await resumeContextIfNeeded();
  if (!isRunning) {
    trackAudioTrigger(note, false);
    return;
  }
  const sampler = await ensureSamplerLoaded();
  sampler.triggerAttack(note, time, normalizeVelocity(velocity));
  activeNotes.add(note);
  trackAudioTrigger(note, true, performance.now() - start);
};

export const triggerPianoRelease = async (
  note: string,
  time?: number,
): Promise<void> => {
  const isRunning = await resumeContextIfNeeded();
  if (!isRunning) {
    activeNotes.delete(note);
    trackAudioRelease(note, false);
    return;
  }
  const sampler = await ensureSamplerLoaded();
  sampler.triggerRelease(note, time);
  activeNotes.delete(note);
  trackAudioRelease(note, true);
};

export const triggerPianoAttackRelease = async (
  note: string,
  duration: number,
  velocity?: number,
  time?: number,
): Promise<void> => {
  const isRunning = await resumeContextIfNeeded();
  if (!isRunning) return;
  const sampler = await ensureSamplerLoaded();
  sampler.triggerAttackRelease(
    note,
    duration,
    time,
    normalizeVelocity(velocity),
  );
  activeNotes.add(note);
  window.setTimeout(
    () => {
      activeNotes.delete(note);
    },
    Math.max(0, duration) * 1000,
  );
};
