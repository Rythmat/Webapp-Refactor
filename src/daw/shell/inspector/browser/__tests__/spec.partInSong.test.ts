/**
 * A part dropped into a song lands in the song's key (milestone 2.14, the
 * library browser). These tests are written from the 15c contract, not from
 * the module, so they pin what the browser promises rather than how it does
 * it.
 *
 * scaleFit weighs each note by duration times velocity and asks how much of
 * that weight sits on the song key's scale. moveForSong reads the move from
 * the two keys, never from the notes: of the shifts in −6 … +5 it takes the
 * one that puts the most of the part's KEY scale on the song's scale, ties
 * going to the tonic's move and then to the smaller |shift|. So a D dorian
 * vamp dropped into C major stays D dorian (its scale is C major's) instead
 * of becoming C dorian. `fits` then says whether the moved notes sit on the
 * song's scale (90 % or more of their weight). preparedEvents is what a clip
 * gets: the part moved with its register kept, its swing and its played
 * offsets baked into the ticks, nothing before tick 0, channel 0.
 */
import { describe, expect, it } from 'vitest';
import { swingOnset } from '@/curriculum/engine/genreGeneration/swing';
import {
  blankPart,
  partTicks,
  playedTick,
  shiftBetween,
  transposePart,
  type InstrumentPart,
  type PartNote,
} from '@/curriculum/engine/parts/part';
import { listLiveParts } from '@/curriculum/engine/parts/registry';
import { ALL_MODES } from '@/daw/prism-engine/data/modes';
import {
  moveForSong,
  preparedEvents,
  scaleFit,
  type SongKey,
} from '../partInSong';

const note = (
  midi: number,
  tick = 0,
  patch: Partial<PartNote> = {},
): PartNote => ({ tick, duration: 480, midi, velocity: 100, ...patch });

/** One quarter note per pitch, back to back. */
const line = (midis: readonly number[]): PartNote[] =>
  midis.map((m, i) => note(m, i * 480));

const part = (patch: Partial<InstrumentPart> = {}): InstrumentPart => ({
  ...blankPart('spec-part', 'Spec part', 'piano'),
  status: 'live',
  ...patch,
});

const C_IONIAN: SongKey = { rootPc: 0, mode: 'ionian' };
const A_AEOLIAN: SongKey = { rootPc: 9, mode: 'aeolian' };

const shifted = (notes: readonly PartNote[], shift: number) =>
  notes.map((n) => ({ ...n, midi: n.midi + shift }));

// The white keys from D: D E F G A B C — every one on C major's scale.
const D_DORIAN_WHITE = line([62, 64, 65, 67, 69, 71, 72]);
const C_MAJOR_LINE = line([60, 62, 64, 65, 67, 69, 71]);
const G_MAJOR_LINE = line([67, 69, 71, 72, 74, 76, 78]);

describe('scaleFit', () => {
  it('is 0 with no notes', () => {
    expect(scaleFit([], C_IONIAN)).toBe(0);
  });

  it('is 1 when every note is on the scale, in any octave', () => {
    expect(scaleFit(C_MAJOR_LINE, C_IONIAN)).toBe(1);
    expect(scaleFit(shifted(C_MAJOR_LINE, -24), C_IONIAN)).toBe(1);
    expect(scaleFit(shifted(C_MAJOR_LINE, 12), A_AEOLIAN)).toBe(1);
  });

  it('is 0 when no note is on the scale', () => {
    // C♯ D♯ F♯ G♯ A♯ — the black keys, none in C major.
    expect(scaleFit(line([61, 63, 66, 68, 70]), C_IONIAN)).toBe(0);
  });

  it('weighs notes by duration times velocity, not by count', () => {
    const on = note(60, 0, { duration: 480, velocity: 100 });
    const off = note(61, 480, { duration: 480, velocity: 100 });
    expect(scaleFit([on, off], C_IONIAN)).toBeCloseTo(0.5, 6);

    // The off-scale note three times as long: a quarter of the weight fits.
    const longOff = note(61, 480, { duration: 1440, velocity: 100 });
    expect(scaleFit([on, longOff], C_IONIAN)).toBeCloseTo(0.25, 6);

    // The off-scale note at a quarter of the velocity: four fifths fit.
    const softOff = note(61, 480, { duration: 480, velocity: 25 });
    expect(scaleFit([on, softOff], C_IONIAN)).toBeCloseTo(0.8, 6);

    // Many short off-scale notes against one long on-scale note.
    const ghosts = [1, 2, 3, 4].map((i) =>
      note(61, i * 480, { duration: 30, velocity: 100 }),
    );
    const held = note(60, 0, { duration: 1920, velocity: 100 });
    expect(scaleFit([held, ...ghosts], C_IONIAN)).toBeCloseTo(
      1920 / (1920 + 4 * 30),
      6,
    );
  });

  it('reads the mode from the prism mode names, rooted on rootPc', () => {
    // E♭ is on C dorian and C aeolian but not on C ionian or C mixolydian.
    const eFlat = [note(63)];
    expect(scaleFit(eFlat, { rootPc: 0, mode: 'dorian' })).toBe(1);
    expect(scaleFit(eFlat, { rootPc: 0, mode: 'aeolian' })).toBe(1);
    expect(scaleFit(eFlat, { rootPc: 0, mode: 'ionian' })).toBe(0);
    expect(scaleFit(eFlat, { rootPc: 0, mode: 'mixolydian' })).toBe(0);
    // F is on E phrygian (E F G A B C D) but not E dorian (F♯).
    expect(scaleFit([note(65)], { rootPc: 4, mode: 'phrygian' })).toBe(1);
    expect(scaleFit([note(65)], { rootPc: 4, mode: 'dorian' })).toBe(0);
  });

  it('agrees with ALL_MODES for every diatonic mode and root', () => {
    const chromatic = line([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71]);
    for (const mode of [
      'ionian',
      'dorian',
      'phrygian',
      'lydian',
      'mixolydian',
      'aeolian',
      'locrian',
    ]) {
      for (let rootPc = 0; rootPc < 12; rootPc++) {
        expect(scaleFit(chromatic, { rootPc, mode })).toBeCloseTo(
          ALL_MODES[mode].length / 12,
          6,
        );
      }
    }
  });
});

describe('moveForSong', () => {
  it('with no song key keeps the part where it is', () => {
    const p = part({
      key: { tonic: 2, mode: 'dorian' },
      notes: D_DORIAN_WHITE,
    });
    expect(moveForSong(p, null)).toEqual({
      shift: 0,
      key: { tonic: 2, mode: 'dorian' },
      fits: true,
    });
  });

  it('keeps D dorian on the white keys in a C major song (C dorian’s scale is off it)', () => {
    const p = part({
      key: { tonic: 2, mode: 'dorian' },
      notes: D_DORIAN_WHITE,
    });
    // The tonic-keeping shift is −2: C dorian, whose E♭ and B♭ are off C
    // major. D dorian's scale is C major's, all seven notes.
    expect(shiftBetween(2, 0)).toBe(-2);
    expect(scaleFit(shifted(D_DORIAN_WHITE, -2), C_IONIAN)).toBeLessThan(0.9);
    expect(moveForSong(p, C_IONIAN)).toEqual({
      shift: 0,
      key: { tonic: 2, mode: 'dorian' },
      fits: true,
    });
  });

  it('keeps a C major part as it is in an A minor song', () => {
    const p = part({ key: { tonic: 0, mode: 'ionian' }, notes: C_MAJOR_LINE });
    // The tonic shift is −3 (A ionian), off A minor's scale.
    expect(shiftBetween(0, 9)).toBe(-3);
    expect(moveForSong(p, A_AEOLIAN)).toEqual({
      shift: 0,
      key: { tonic: 0, mode: 'ionian' },
      fits: true,
    });
  });

  it('moves a G major part up a fourth to C', () => {
    const p = part({ key: { tonic: 7, mode: 'ionian' }, notes: G_MAJOR_LINE });
    expect(moveForSong(p, C_IONIAN)).toEqual({
      shift: 5,
      key: { tonic: 0, mode: 'ionian' },
      fits: true,
    });
  });

  it('takes the tonic’s move when it puts the part’s scale on the song’s, whatever the notes', () => {
    // A C major part into F major: the tonic's move +5 puts C major's scale
    // on F major's exactly.
    const p = part({ key: { tonic: 0, mode: 'ionian' }, notes: C_MAJOR_LINE });
    expect(moveForSong(p, { rootPc: 5, mode: 'ionian' })).toEqual({
      shift: 5,
      key: { tonic: 5, mode: 'ionian' },
      fits: true,
    });
    // A drone on the tonic: its notes would fit at the smaller shift 0 as
    // well, but the move is read from its key (G major → C major is +5).
    const drone = part({
      key: { tonic: 7, mode: 'ionian' },
      notes: [note(55), note(67, 480)],
    });
    expect(moveForSong(drone, C_IONIAN)).toMatchObject({
      shift: 5,
      fits: true,
    });
  });

  it('keeps the part’s mode in the landed key', () => {
    const p = part({
      key: { tonic: 9, mode: 'dorian' },
      notes: line([57, 59, 60, 62, 64, 66, 67]),
    });
    // A dorian into G dorian: tonic shift −2, the notes land on G dorian.
    const moved = moveForSong(p, { rootPc: 7, mode: 'dorian' });
    expect(moved).toEqual({
      shift: -2,
      key: { tonic: 7, mode: 'dorian' },
      fits: true,
    });
  });

  it('moves a chromatic line by its key, and says its notes don’t fit', () => {
    // D dorian's scale is C major's, so it stays (shift 0); its notes then
    // sit 7 of 12 on the scale, under 90 %.
    const p = part({
      key: { tonic: 2, mode: 'dorian' },
      notes: line([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71]),
    });
    expect(moveForSong(p, C_IONIAN)).toEqual({
      shift: 0,
      key: { tonic: 2, mode: 'dorian' },
      fits: false,
    });
  });

  it('when the tonic’s move leaves the part’s scale off the song’s, takes the move that puts most of it on', () => {
    // An E dorian part (its scale is D major's, two sharps); song C ionian.
    // The tonic's move E→C is −4: C dorian, five of its seven notes on C
    // major. −2 makes it D dorian, all seven (C major exactly).
    const dMajor = line([62, 64, 66, 67, 69, 71, 73]);
    const p = part({ key: { tonic: 4, mode: 'dorian' }, notes: dMajor });
    expect(shiftBetween(4, 0)).toBe(-4);
    expect(scaleFit(shifted(dMajor, -4), C_IONIAN)).toBeLessThan(0.9);
    expect(moveForSong(p, C_IONIAN)).toEqual({
      shift: -2,
      key: { tonic: 2, mode: 'dorian' },
      fits: true,
    });
  });

  it('follows the part’s key, not its notes, when they disagree', () => {
    // A C dorian part whose only notes are C2 and B♭2. Read from the notes,
    // −1 (B and A) is the smallest move that puts both on C major; read from
    // the key, +2 makes it D dorian, whose scale is C major's.
    const p = part({
      instrument: 'bass',
      role: 'bassline',
      key: { tonic: 0, mode: 'dorian' },
      notes: [note(36, 0), note(46, 480)],
    });
    expect(scaleFit(shifted(p.notes, -1), C_IONIAN)).toBe(1);
    expect(moveForSong(p, C_IONIAN)).toEqual({
      shift: 2,
      key: { tonic: 2, mode: 'dorian' },
      fits: true,
    });
  });

  it('every live part lands with a shift in −6 … +5 that fits when it says so', () => {
    const live = listLiveParts().filter((p) => p.instrument !== 'drums');
    expect(live.length).toBeGreaterThan(0);
    for (const song of [C_IONIAN, A_AEOLIAN]) {
      for (const p of live) {
        const moved = moveForSong(p, song);
        expect(moved.shift).toBeGreaterThanOrEqual(-6);
        expect(moved.shift).toBeLessThanOrEqual(5);
        expect(moved.key).toEqual({
          tonic: (((p.key.tonic + moved.shift) % 12) + 12) % 12,
          mode: p.key.mode,
        });
        const fit = scaleFit(shifted(p.notes, moved.shift), song);
        expect(moved.fits).toBe(fit >= 0.9);
        // The move is read from the keys (review M1): a part in the song's
        // mode moves tonic to tonic, and a part already in the song's key
        // stays put.
        if (p.key.mode === song.mode) {
          expect(moved.shift).toBe(shiftBetween(p.key.tonic, song.rootPc));
        }
        expect(
          moveForSong(p, { rootPc: p.key.tonic, mode: p.key.mode }).shift,
        ).toBe(0);
      }
    }
  });
});

describe('preparedEvents', () => {
  const fields = (e: {
    note: number;
    velocity: number;
    startTick: number;
    durationTicks: number;
    channel: number;
  }) => ({
    note: e.note,
    velocity: e.velocity,
    startTick: e.startTick,
    durationTicks: e.durationTicks,
    channel: e.channel,
  });
  const byTick = <T extends { startTick: number; note: number }>(a: T, b: T) =>
    a.startTick - b.startTick || a.note - b.note;

  it('with no shift and no feel, is the notes as clip events on channel 0', () => {
    const p = part({
      notes: [
        note(60, 0, { duration: 240, velocity: 90 }),
        note(64, 480, { duration: 960, velocity: 70 }),
      ],
    });
    expect(preparedEvents(p, 0).map(fields).sort(byTick)).toEqual([
      { note: 60, velocity: 90, startTick: 0, durationTicks: 240, channel: 0 },
      {
        note: 64,
        velocity: 70,
        startTick: 480,
        durationTicks: 960,
        channel: 0,
      },
    ]);
  });

  it('moves every note by the shift', () => {
    const p = part({ notes: [note(60, 0), note(67, 480)] });
    expect(
      preparedEvents(p, 3)
        .map((e) => e.note)
        .sort((a, b) => a - b),
    ).toEqual([63, 70]);
    expect(
      preparedEvents(p, -4)
        .map((e) => e.note)
        .sort((a, b) => a - b),
    ).toEqual([56, 63]);
  });

  it('keeps a bass line in the bass register (transposePart)', () => {
    // A low bass figure (F♯1 … B1) moved down 5 would drop below E1, so the
    // whole figure comes up an octave together.
    const p = part({
      instrument: 'bass',
      role: 'bassline',
      key: { tonic: 6, mode: 'dorian' },
      notes: [note(30, 0), note(35, 480)],
    });
    const notes = preparedEvents(p, -5)
      .map((e) => e.note)
      .sort((a, b) => a - b);
    expect(notes).toEqual([37, 42]);
    expect(notes).toEqual(
      transposePart(p, p.key.tonic - 5)
        .notes.map((n) => n.midi)
        .sort((a, b) => a - b),
    );
  });

  it('leaves drums unmoved (transposePart does not transpose drums)', () => {
    const p = part({
      instrument: 'drums',
      role: 'groove',
      notes: [note(36, 0), note(38, 480), note(42, 240)],
    });
    expect(
      preparedEvents(p, 4)
        .map((e) => e.note)
        .sort((a, b) => a - b),
    ).toEqual([36, 38, 42]);
  });

  it('bakes the part’s swing into the ticks', () => {
    const p = part({
      swing: 66,
      notes: [
        note(60, 0, { duration: 120 }),
        note(62, 120, { duration: 120 }),
        note(64, 240, { duration: 120 }),
        note(65, 360, { duration: 120 }),
      ],
    });
    const ticks = preparedEvents(p, 0)
      .sort(byTick)
      .map((e) => e.startTick);
    expect(ticks).toEqual([0, swingOnset(120, 66), 240, swingOnset(360, 66)]);
    // The off-beat 16ths really moved.
    expect(ticks[1]).toBeGreaterThan(120);
    expect(ticks[3]).toBeGreaterThan(360);
  });

  it('a straight part keeps its written ticks', () => {
    const p = part({
      swing: 50,
      notes: [note(60, 0), note(62, 120), note(64, 360)],
    });
    expect(
      preparedEvents(p, 0)
        .map((e) => e.startTick)
        .sort((a, b) => a - b),
    ).toEqual([0, 120, 360]);
  });

  it('applies the played offsets', () => {
    const p = part({
      notes: [
        note(60, 480, { offset: -20 }),
        note(62, 960, { offset: 15 }),
        note(64, 1440),
      ],
    });
    expect(
      preparedEvents(p, 0)
        .map((e) => e.startTick)
        .sort((a, b) => a - b),
    ).toEqual([460, 975, 1440]);
    expect(playedTick(p.notes[0])).toBe(460);
  });

  it('applies offsets on a swung part too (downbeat notes, where swing does not move them)', () => {
    const p = part({
      swing: 66,
      notes: [note(60, 480, { offset: -20 }), note(62, 960, { offset: 10 })],
    });
    expect(
      preparedEvents(p, 0)
        .map((e) => e.startTick)
        .sort((a, b) => a - b),
    ).toEqual([460, 970]);
  });

  it('never starts a note before tick 0', () => {
    const p = part({
      notes: [note(60, 0, { offset: -30 }), note(62, 480)],
    });
    const ticks = preparedEvents(p, 0).map((e) => e.startTick);
    expect(Math.min(...ticks)).toBe(0);
    expect(ticks.every((t) => t >= 0)).toBe(true);
  });

  it('every live part, moved into C major, gives a well-formed event per note inside its bars', () => {
    for (const p of listLiveParts()) {
      const { shift } = moveForSong(p, C_IONIAN);
      const events = preparedEvents(p, shift);
      const end = partTicks(p);
      // A note written past the part's last bar is left out (review M4).
      const inside = transposePart(p, p.key.tonic + shift).notes.filter(
        (n) => swingOnset(n.tick, p.swing) + (n.offset ?? 0) < end,
      );
      expect(events).toHaveLength(inside.length);
      for (const e of events) {
        expect(e.channel).toBe(0);
        expect(e.startTick).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(e.startTick)).toBe(true);
        expect(e.startTick + e.durationTicks).toBeLessThanOrEqual(end);
        expect(e.note).toBeGreaterThanOrEqual(0);
        expect(e.note).toBeLessThanOrEqual(127);
      }
      expect(events.map((e) => e.note).sort((a, b) => a - b)).toEqual(
        inside.map((n) => n.midi).sort((a, b) => a - b),
      );
    }
  });
});
