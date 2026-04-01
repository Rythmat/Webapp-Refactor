import { DIFFICULTY_PRESETS, type DifficultyPreset } from './constants';
import type { Note } from './types';

/**
 * Generate a sequence of falling notes for Major Arcanum.
 * Uses difficulty presets to control tempo, density, and rhythm complexity.
 * Melody mode uses stepwise motion for more musical phrases.
 */
export function generateSong(
  bpm: number,
  gameMode: 'Melody' | 'Harmony',
  keyboardMapping: Record<string, number>,
  scaleNotes: number[],
  keyRootVal: number,
  difficulty = 3,
): Note[] {
  const song: Note[] = [];
  const preset = DIFFICULTY_PRESETS[difficulty] ?? DIFFICULTY_PRESETS[3];
  const totalBeats = preset.totalBeats;
  const beatTime = 60 / bpm;
  const playableNotes = Object.values(keyboardMapping).sort((a, b) => a - b);
  const availableNotes = playableNotes.length > 0 ? playableNotes : scaleNotes;

  if (gameMode === 'Harmony') {
    return generateHarmony(song, totalBeats, beatTime, availableNotes, preset);
  }
  return generateMelody(
    song,
    totalBeats,
    beatTime,
    availableNotes,
    keyRootVal,
    preset,
  );
}

function generateHarmony(
  song: Note[],
  totalBeats: number,
  beatTime: number,
  availableNotes: number[],
  _preset: DifficultyPreset,
): Note[] {
  const PROGRESSIONS = [
    [0, 3, 4, 0], // I - IV - V - I
    [0, 5, 3, 4], // I - vi - IV - V
    [0, 4, 5, 3], // I - V - vi - IV
    [1, 4, 0, 0], // ii - V - I - I
    [5, 3, 0, 4], // vi - IV - I - V
  ];

  let lastProgIdx = -1;
  let currentBeat = 4.0;
  while (currentBeat < totalBeats) {
    // Avoid repeating the same progression consecutively
    let progIdx = Math.floor(Math.random() * PROGRESSIONS.length);
    if (progIdx === lastProgIdx && PROGRESSIONS.length > 1) {
      progIdx = (progIdx + 1) % PROGRESSIONS.length;
    }
    lastProgIdx = progIdx;
    const prog = PROGRESSIONS[progIdx];
    const duration = Math.random() > 0.4 ? 4 : 2;

    for (let ci = 0; ci < prog.length; ci++) {
      const degreeIdx = prog[ci];
      if (currentBeat >= totalBeats) break;
      const time = currentBeat * beatTime;
      const chordIntervals = [0, 2, 4];

      // Voice leading: if not the first chord, try to move each voice minimally
      chordIntervals.forEach((interval) => {
        const targetIndex = degreeIdx + interval;
        const finalIndex =
          ((targetIndex % availableNotes.length) + availableNotes.length) %
          availableNotes.length;

        song.push({
          time,
          midi: availableNotes[finalIndex],
          hit: false,
          missed: false,
          lost: false,
          completed: false,
          isChord: true,
          duration,
          isHolding: false,
          lastHoldScoreTime: 0,
          lastParticleTime: 0,
        });
      });
      currentBeat += duration;
    }
  }

  song.sort((a, b) => a.time - b.time);
  return song;
}

function generateMelody(
  song: Note[],
  totalBeats: number,
  beatTime: number,
  availableNotes: number[],
  rootVal: number,
  preset: DifficultyPreset,
): Note[] {
  const pentatonicIntervals = [0, 2, 4, 7, 9];
  const pentatonicNotes = availableNotes.filter((note) => {
    const interval = ((note % 12) - rootVal + 12) % 12;
    return pentatonicIntervals.includes(interval);
  });

  // Track last note index for stepwise motion
  let lastNoteIdx = Math.floor(availableNotes.length / 2);

  const pickMelodyNote = () => {
    const pool =
      Math.random() < 0.85 && pentatonicNotes.length > 0
        ? pentatonicNotes
        : availableNotes;

    // Stepwise motion bias
    const r = Math.random();
    let targetIdx: number;
    if (r < 0.6) {
      // Step: +/- 1 scale degree
      const step = Math.random() < 0.5 ? -1 : 1;
      targetIdx = lastNoteIdx + step;
    } else if (r < 0.85) {
      // Small leap: +/- 2 scale degrees
      const step = Math.random() < 0.5 ? -2 : 2;
      targetIdx = lastNoteIdx + step;
    } else {
      // Free leap
      targetIdx = Math.floor(Math.random() * pool.length);
      lastNoteIdx = targetIdx;
      return pool[Math.max(0, Math.min(pool.length - 1, targetIdx))];
    }

    // Clamp to available range
    targetIdx = Math.max(0, Math.min(availableNotes.length - 1, targetIdx));
    lastNoteIdx = targetIdx;

    // Find the closest note in our preferred pool
    const targetMidi = availableNotes[targetIdx];
    let closest = pool[0];
    let closestDist = Math.abs(pool[0] - targetMidi);
    for (let i = 1; i < pool.length; i++) {
      const dist = Math.abs(pool[i] - targetMidi);
      if (dist < closestDist) {
        closest = pool[i];
        closestDist = dist;
      }
    }
    return closest;
  };

  let currentBeat = 4.0;
  let currentBar = -1;
  let attacksInBar = 0;

  while (currentBeat < totalBeats) {
    const bar = Math.floor(currentBeat / 4);
    if (bar > currentBar) {
      currentBar = bar;
      attacksInBar = 0;
    }

    // Duration selection based on difficulty
    const r = Math.random();
    let duration = 1;
    if (r < preset.holdNoteChance) {
      duration = Math.random() < 0.3 ? 4 : 2;
    } else if (r < preset.holdNoteChance + preset.eighthNoteChance) {
      duration = 0.5;
    } else {
      duration = 1;
    }

    if (duration === 4 && currentBeat % 4 !== 0) duration = 1;
    if (duration === 2 && currentBeat % 2 !== 0) duration = 1;
    if (currentBeat + duration > totalBeats) duration = 1;

    const notesToAdd = duration === 0.5 ? 2 : 1;
    let generate = false;
    if (attacksInBar + notesToAdd <= 4) {
      if (Math.random() > 0.2) generate = true;
    }

    if (!generate) {
      currentBeat += duration === 0.5 ? 1 : duration;
      continue;
    }

    const makeNote = (time: number, dur: number): Note => ({
      time,
      midi: pickMelodyNote(),
      hit: false,
      missed: false,
      lost: false,
      completed: false,
      isChord: false,
      duration: dur,
      isHolding: false,
      lastHoldScoreTime: 0,
      lastParticleTime: 0,
    });

    if (duration === 0.5) {
      attacksInBar++;
      song.push(makeNote(currentBeat * beatTime, 0.5));
      attacksInBar++;
      song.push(makeNote((currentBeat + 0.5) * beatTime, 0.5));
      currentBeat += 1;
    } else {
      attacksInBar++;
      song.push(makeNote(currentBeat * beatTime, duration));
      currentBeat += duration;
    }
  }

  song.sort((a, b) => a.time - b.time);
  return song;
}

/**
 * Calculate the total song duration in seconds.
 */
export function getSongDuration(bpm: number, difficulty = 3): number {
  const preset = DIFFICULTY_PRESETS[difficulty] ?? DIFFICULTY_PRESETS[3];
  return (preset.totalBeats * 60) / bpm;
}
