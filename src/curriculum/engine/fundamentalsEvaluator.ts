/**
 * Reactive evaluator for Piano Fundamentals MIDI activities.
 *
 * Called after each new note to determine if the step criteria are met.
 * Returns { passed, progress } so the UI can show live feedback.
 */

import type { FundamentalsMidiEval } from '../types/fundamentalsEval';

export interface NoteRecord {
  midi: number;
  timestamp: number;
}

export interface EvalResult {
  passed: boolean;
  /** Human-readable progress string, e.g. "2 of 3 octaves found" */
  progress: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pitch class 0-11 from a MIDI note number. */
function pc(midi: number): number {
  return midi % 12;
}

/** Octave number from a MIDI note number. */
function octave(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

// Note name lookup for progress messages
const NOTE_NAMES = [
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

export function noteName(midi: number): string {
  return `${NOTE_NAMES[pc(midi)]}${octave(midi)}`;
}

export function pitchClassName(pitchClass: number): string {
  return NOTE_NAMES[pitchClass];
}

// ---------------------------------------------------------------------------
// Main evaluator
// ---------------------------------------------------------------------------

export function evaluateStep(
  evalRule: FundamentalsMidiEval,
  notes: NoteRecord[],
): EvalResult {
  switch (evalRule.type) {
    case 'two_range_sequence':
      return evalTwoRangeSequence(evalRule, notes);
    case 'pitch_class':
      return evalPitchClass(evalRule, notes);
    case 'alternating':
      return evalAlternating(evalRule, notes);
    case 'sequence':
      return evalSequence(evalRule, notes);
    case 'exact_midi':
      return evalExactMidi(evalRule, notes);
    case 'range':
      return evalRange(evalRule, notes);
    case 'multi_zone':
      return evalMultiZone(evalRule, notes);
    case 'simultaneous':
      return evalSimultaneous(evalRule, notes);
    case 'ordered_ranges':
      return evalOrderedRanges(evalRule, notes);
    case 'chromatic_ascending':
      return evalChromaticAscending(notes);
    case 'quiz':
      // Quiz evaluation is handled by the component (stateful sub-flow).
      // This should not be called directly.
      return { passed: false, progress: 'Quiz in progress...' };
  }
}

// ---------------------------------------------------------------------------
// Evaluators
// ---------------------------------------------------------------------------

function evalTwoRangeSequence(
  rule: Extract<FundamentalsMidiEval, { type: 'two_range_sequence' }>,
  notes: NoteRecord[],
): EvalResult {
  const firstHit = notes.find(
    (n) => n.midi >= rule.first.min && n.midi <= rule.first.max,
  );
  if (!firstHit) {
    return { passed: false, progress: 'Play a high note first...' };
  }
  const secondHit = notes.find(
    (n) =>
      n.midi >= rule.second.min &&
      n.midi <= rule.second.max &&
      n.timestamp > firstHit.timestamp,
  );
  if (!secondHit) {
    return { passed: false, progress: 'Now play a low note...' };
  }
  return { passed: true, progress: 'Done!' };
}

function evalPitchClass(
  rule: Extract<FundamentalsMidiEval, { type: 'pitch_class' }>,
  notes: NoteRecord[],
): EvalResult {
  // Collect distinct octaves for each target pitch class
  const octaveSets = new Map<number, Set<number>>();
  for (const targetPc of rule.notes) {
    octaveSets.set(targetPc, new Set());
  }
  for (const n of notes) {
    const notePc = pc(n.midi);
    if (octaveSets.has(notePc)) {
      octaveSets.get(notePc)!.add(octave(n.midi));
    }
  }
  // For multi-note pitch_class (e.g. "play C and E"), count minimum octaves across all
  let minOctavesFound = Infinity;
  for (const s of octaveSets.values()) {
    minOctavesFound = Math.min(minOctavesFound, s.size);
  }
  if (minOctavesFound === Infinity) minOctavesFound = 0;

  // For single-note rules, just count distinct octaves
  if (rule.notes.length === 1) {
    const found = octaveSets.get(rule.notes[0])!.size;
    return {
      passed: found >= rule.minOctaves,
      progress: `${found} of ${rule.minOctaves} octaves found`,
    };
  }

  // For multi-note, check that all target pitch classes have been played
  const allFound = [...octaveSets.values()].every(
    (s) => s.size >= rule.minOctaves,
  );
  const totalUnique = [...octaveSets.values()].reduce(
    (sum, s) => sum + s.size,
    0,
  );
  return {
    passed: allFound,
    progress: `${totalUnique} of ${rule.notes.length * rule.minOctaves} notes found`,
  };
}

function evalAlternating(
  rule: Extract<FundamentalsMidiEval, { type: 'alternating' }>,
  notes: NoteRecord[],
): EvalResult {
  // Filter to only notes matching the target pitch classes
  const relevant = notes.filter((n) => rule.pitchClasses.includes(pc(n.midi)));

  let pairs = 0;
  let expectIdx = 0; // index into pitchClasses array
  let lastMidi = -1;

  for (const n of relevant) {
    if (pc(n.midi) === rule.pitchClasses[expectIdx]) {
      if (expectIdx === 0) {
        lastMidi = n.midi;
        expectIdx = 1;
      } else {
        // Second note must be higher (ascending)
        if (n.midi > lastMidi) {
          pairs++;
          expectIdx = 0;
        }
      }
    } else {
      // Wrong pitch class — reset
      if (pc(n.midi) === rule.pitchClasses[0]) {
        lastMidi = n.midi;
        expectIdx = 1;
      } else {
        expectIdx = 0;
      }
    }
  }

  return {
    passed: pairs >= rule.minPairs,
    progress: `${pairs} of ${rule.minPairs} pairs`,
  };
}

function evalSequence(
  rule: Extract<FundamentalsMidiEval, { type: 'sequence' }>,
  notes: NoteRecord[],
): EvalResult {
  let matchIdx = 0;

  for (const n of notes) {
    if (matchIdx >= rule.notes.length) break;

    const target = rule.notes[matchIdx];
    if (rule.octaveAware) {
      // notes array contains exact MIDI values
      if (n.midi === target) {
        matchIdx++;
      }
    } else {
      // notes array contains pitch classes (0-11)
      if (pc(n.midi) === target) {
        matchIdx++;
      }
    }
  }

  return {
    passed: matchIdx >= rule.notes.length,
    progress: `${matchIdx} of ${rule.notes.length} notes`,
  };
}

function evalExactMidi(
  rule: Extract<FundamentalsMidiEval, { type: 'exact_midi' }>,
  notes: NoteRecord[],
): EvalResult {
  const remaining = new Set(rule.midi);
  for (const n of notes) {
    remaining.delete(n.midi);
  }
  const found = rule.midi.length - remaining.size;
  return {
    passed: remaining.size === 0,
    progress:
      rule.midi.length === 1
        ? remaining.size === 0
          ? 'Found it!'
          : `Play ${noteName(rule.midi[0])}`
        : `${found} of ${rule.midi.length} notes`,
  };
}

function evalRange(
  rule: Extract<FundamentalsMidiEval, { type: 'range' }>,
  notes: NoteRecord[],
): EvalResult {
  const inRange = notes.filter((n) => n.midi >= rule.min && n.midi <= rule.max);
  return {
    passed: inRange.length >= rule.minNotes,
    progress: `${inRange.length} of ${rule.minNotes} notes in zone`,
  };
}

function evalMultiZone(
  rule: Extract<FundamentalsMidiEval, { type: 'multi_zone' }>,
  notes: NoteRecord[],
): EvalResult {
  let zonesMet = 0;
  for (const zone of rule.zones) {
    const count = notes.filter(
      (n) => n.midi >= zone.min && n.midi <= zone.max,
    ).length;
    if (count >= zone.minNotes) zonesMet++;
  }
  return {
    passed: zonesMet === rule.zones.length,
    progress: `${zonesMet} of ${rule.zones.length} zones hit`,
  };
}

function evalSimultaneous(
  rule: Extract<FundamentalsMidiEval, { type: 'simultaneous' }>,
  notes: NoteRecord[],
): EvalResult {
  if (notes.length === 0) {
    return { passed: false, progress: `0 of ${rule.midi.length} notes` };
  }

  // Check if all required MIDI notes appear within any windowMs-sized window
  const required = new Set(rule.midi);

  // Sliding window approach: for each note, check if all required notes
  // appear within windowMs after it
  for (let i = 0; i < notes.length; i++) {
    const windowStart = notes[i].timestamp;
    const found = new Set<number>();
    for (let j = i; j < notes.length; j++) {
      if (notes[j].timestamp - windowStart > rule.windowMs) break;
      if (required.has(notes[j].midi)) {
        found.add(notes[j].midi);
      }
    }
    if (found.size === required.size) {
      return { passed: true, progress: 'All notes played!' };
    }
  }

  // Count how many unique required notes have been played recently
  const recentNotes = new Set<number>();
  const latestTimestamp = notes[notes.length - 1].timestamp;
  for (let i = notes.length - 1; i >= 0; i--) {
    if (latestTimestamp - notes[i].timestamp > rule.windowMs) break;
    if (required.has(notes[i].midi)) {
      recentNotes.add(notes[i].midi);
    }
  }

  return {
    passed: false,
    progress: `${recentNotes.size} of ${rule.midi.length} notes`,
  };
}

function evalOrderedRanges(
  rule: Extract<FundamentalsMidiEval, { type: 'ordered_ranges' }>,
  notes: NoteRecord[],
): EvalResult {
  let phaseIdx = 0;
  let phaseNoteCount = 0;
  let phaseStart = -1;

  for (const n of notes) {
    if (phaseIdx >= rule.phases.length) break;
    const phase = rule.phases[phaseIdx];

    if (n.midi >= phase.min && n.midi <= phase.max) {
      if (phaseNoteCount === 0) phaseStart = n.timestamp;
      phaseNoteCount++;

      if (phaseNoteCount >= phase.minNotes) {
        // If simultaneous is required, check time window
        if (phase.simultaneous && phaseNoteCount >= phase.minNotes) {
          const elapsed = n.timestamp - phaseStart;
          if (elapsed > 500) {
            // Notes too spread out — reset this phase
            phaseNoteCount = 1;
            phaseStart = n.timestamp;
            continue;
          }
        }
        phaseIdx++;
        phaseNoteCount = 0;
      }
    }
  }

  const phaseNames = ['Phase 1', 'Phase 2', 'Phase 3'];
  return {
    passed: phaseIdx >= rule.phases.length,
    progress:
      phaseIdx >= rule.phases.length
        ? 'All phases complete!'
        : `${phaseNames[phaseIdx] ?? `Phase ${phaseIdx + 1}`} — ${phaseNoteCount} of ${rule.phases[phaseIdx].minNotes} notes`,
  };
}

function evalChromaticAscending(notes: NoteRecord[]): EvalResult {
  // Find the longest consecutive chromatic run starting from any C
  let matchCount = 0;

  for (const n of notes) {
    if (matchCount === 0) {
      // Look for any C to start
      if (pc(n.midi) === 0) {
        matchCount = 1;
      }
    } else {
      const expectedPc = matchCount % 12;
      if (pc(n.midi) === expectedPc) {
        matchCount++;
        if (matchCount >= 13) {
          return { passed: true, progress: '13 of 13 notes — complete!' };
        }
      } else if (pc(n.midi) === 0) {
        // Restart from this C
        matchCount = 1;
      } else {
        matchCount = 0;
      }
    }
  }

  return {
    passed: false,
    progress: `${matchCount} of 13 notes`,
  };
}
