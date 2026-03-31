import type { Note } from './types';

/**
 * Generate a sequence of falling notes for Major Arcanum.
 *
 * Currently uses procedural generation. Future: replace with curriculum
 * content selectors (usePrismStartContours for melody, usePrismChordProgressions
 * for harmony).
 */
export function generateSong(
  bpm: number,
  gameMode: string,
  keyboardMapping: Record<string, number>,
  scaleNotes: number[],
  keyRootVal: number,
): Note[] {
  const song: Note[] = [];
  const totalBeats = 120;
  const beatTime = 60 / bpm;
  const playableNotes = Object.values(keyboardMapping).sort((a, b) => a - b);
  const availableNotes =
    playableNotes.length > 0 ? playableNotes : scaleNotes;

  if (gameMode === 'Harmony') {
    return generateHarmony(song, totalBeats, beatTime, availableNotes);
  }
  return generateMelody(
    song,
    totalBeats,
    beatTime,
    availableNotes,
    keyRootVal,
  );
}

function generateHarmony(
  song: Note[],
  totalBeats: number,
  beatTime: number,
  availableNotes: number[],
): Note[] {
  const PROGRESSIONS = [
    [0, 3, 4, 0], // I - IV - V - I
    [0, 5, 3, 4], // I - vi - IV - V
    [0, 4, 5, 3], // I - V - vi - IV
    [1, 4, 0, 0], // ii - V - I - I
    [5, 3, 0, 4], // vi - IV - I - V
  ];

  let currentBeat = 4.0;
  while (currentBeat < totalBeats) {
    const prog = PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)];
    const duration = Math.random() > 0.4 ? 4 : 2;

    for (const degreeIdx of prog) {
      if (currentBeat >= totalBeats) break;
      const time = currentBeat * beatTime;
      const chordIntervals = [0, 2, 4];

      chordIntervals.forEach((interval) => {
        // Bug fix #4: safe modular indexing to prevent out-of-bounds
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
): Note[] {
  const pentatonicIntervals = [0, 2, 4, 7, 9];
  const pentatonicNotes = availableNotes.filter((note) => {
    const interval = ((note % 12) - rootVal + 12) % 12;
    return pentatonicIntervals.includes(interval);
  });

  const pickMelodyNote = () => {
    if (Math.random() < 0.85 && pentatonicNotes.length > 0) {
      return pentatonicNotes[Math.floor(Math.random() * pentatonicNotes.length)];
    }
    return availableNotes[Math.floor(Math.random() * availableNotes.length)];
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

    const r = Math.random();
    let duration = 1;
    if (r < 0.05) duration = 4;
    else if (r < 0.2) duration = 2;
    else if (r < 0.65) duration = 1;
    else duration = 0.5;

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
export function getSongDuration(bpm: number): number {
  return (120 * 60) / bpm;
}
