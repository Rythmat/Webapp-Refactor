import * as Tone from 'tone';

const EP_SAMPLE_MAP: Record<string, string> = {
  A0: 'A0.mp3',
  C1: 'C1.mp3',
  Eb1: 'Eb1.mp3',
  Gb1: 'Gb1.mp3',
  A1: 'A1.mp3',
  C2: 'C2.mp3',
  Eb2: 'Eb2.mp3',
  Gb2: 'Gb2.mp3',
  A2: 'A2.mp3',
  C3: 'C3.mp3',
  Eb3: 'Eb3.mp3',
  Gb3: 'Gb3.mp3',
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  Eb4: 'Eb4.mp3',
  Gb4: 'Gb4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
  Eb5: 'Eb5.mp3',
  Gb5: 'Gb5.mp3',
  A5: 'A5.mp3',
  C6: 'C6.mp3',
  Eb6: 'Eb6.mp3',
  Gb6: 'Gb6.mp3',
  A6: 'A6.mp3',
  C7: 'C7.mp3',
  Eb7: 'Eb7.mp3',
  Gb7: 'Gb7.mp3',
  A7: 'A7.mp3',
  C8: 'C8.mp3',
};

const EP_BASE_URL =
  'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_piano_1-mp3/';

let samplerInstance: Tone.Sampler | null = null;
let samplerPromise: Promise<Tone.Sampler> | null = null;

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
    } catch {
      /* ignore */
    }
  }
  return context.state === 'running';
};

const ensureSamplerLoaded = async () => {
  const sampler = await getEpSampler();
  if (!sampler.loaded) {
    await Tone.loaded();
  }
  return sampler;
};

export const startEpSampler = async () => {
  if (Tone.getContext().state !== 'running') {
    await Tone.start();
  }
  await resumeContextIfNeeded();
  await ensureSamplerLoaded();
};

const getEpSampler = async (): Promise<Tone.Sampler> => {
  if (samplerInstance) return samplerInstance;
  if (!samplerPromise) {
    samplerPromise = (async () => {
      const sampler = new Tone.Sampler({
        urls: EP_SAMPLE_MAP,
        baseUrl: EP_BASE_URL,
      }).toDestination();
      samplerInstance = sampler;
      await Tone.loaded();
      return sampler;
    })();
  }
  return samplerPromise;
};

export const triggerEpAttackRelease = async (
  note: string,
  duration: number,
  velocity?: number,
): Promise<void> => {
  const isRunning = await resumeContextIfNeeded();
  if (!isRunning) return;
  const sampler = await ensureSamplerLoaded();
  sampler.triggerAttackRelease(
    note,
    duration,
    undefined,
    normalizeVelocity(velocity),
  );
};
