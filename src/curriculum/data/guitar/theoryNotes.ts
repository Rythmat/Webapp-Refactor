// ── Guitar theory notes ───────────────────────────────────────────────────
// The short explanations the Guitar section shows beside Book One material
// (docs/guitar-atlas/design/beato-knowledge-spec.md §6), and the UI strings
// around them. All copy is original wording and passed the 7-word copy check
// against The Beato Book; re-run beato_spec/copycheck.py before changing any
// string here. Each note is filtered by subsection and condition, and its
// {tokens} are filled per key and step (theoryConditions.ts).

import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import type {
  GuitarSubsectionPrefix,
  GuitarTheoryNote,
  TheoryNoteScope,
  VoicingFamily,
  VoicingInfo,
} from '@/lib/guitar/theory';
import {
  SPELLED_TOKENS,
  THEORY_CONDITIONS,
  THEORY_TOKENS,
  deriveTheoryContext,
  type DerivedTheoryContext,
  type TheoryNoteContext,
  type TheoryToken,
} from './theoryConditions';
import type { GuitarCenter } from './types';

/** Book One's keys and the modes built on them. */
const DIATONIC = ['ionian', 'modal'] as const;
/** The seven-note families of the rest of Theory. */
const FAMILIES = [
  'harmonic-minor',
  'melodic-minor',
  'harmonic-major',
  'double-harmonic',
] as const;
const MODAL_AND_FAMILIES = ['modal', ...FAMILIES] as const;
/** The rest of Theory: the seven-note families and pentatonic/blues. */
const REST_OF_THEORY = [...FAMILIES, 'pentatonic-blues'] as const;

export const GUITAR_THEORY_NOTES: readonly GuitarTheoryNote[] = [
  {
    id: 'key.first',
    subsectionPrefix: 'KEY',
    placement: 'intro',
    kind: 'theory',
    when: 'isFirstKey',
    modes: 'ionian',
    title: 'Start with C',
    body: 'C major has no sharps or flats. Each key after it changes just one note.',
  },
  {
    id: 'key.newNote',
    subsectionPrefix: 'KEY',
    placement: 'intro',
    kind: 'theory',
    when: 'notFirstKeyNoRespell',
    modes: 'ionian',
    title: 'One new note',
    body: '{key} major is {prevKey} major with one note changed. {oldNote} becomes {newNote}. Find {newNote} in your scale shape.',
  },
  {
    id: 'key.newNoteRespelled',
    subsectionPrefix: 'KEY',
    placement: 'intro',
    kind: 'theory',
    when: 'isFlatSwitch',
    modes: 'ionian',
    title: 'One new note',
    body: '{key} major sounds like {prevKey} major with one note changed. {oldNote} becomes {newNote}. The other notes keep their sound but take flat names.',
  },
  {
    id: 'key.flatSwitch',
    subsectionPrefix: 'KEY',
    placement: 'info',
    kind: 'theory',
    when: 'isFlatSwitch',
    modes: 'ionian',
    title: 'Now with flats',
    body: 'From this key on, notes are written with flats. A flat (♭) means one fret lower.',
  },
  {
    id: 'key.circle',
    subsectionPrefix: 'KEY',
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: 'ionian',
    title: 'Why this order?',
    body: 'Each key starts on note 5 of the key before it. Musicians call this order the circle of fifths.',
  },
  {
    id: 'key.relMinor',
    subsectionPrefix: 'KEY',
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: 'ionian',
    title: 'Its minor partner',
    body: '{relMinor} minor uses the same notes as {key} major. It starts on note 6 instead of note 1.',
  },
  {
    id: 'a1.steps',
    subsectionPrefix: 'A1',
    placement: 'intro',
    kind: 'theory',
    when: 'always',
    modes: 'ionian',
    title: 'Whole and half steps',
    body: 'A whole step is 2 frets. A half step is 1 fret. The major scale has half steps in two places: from 3 to 4, and from 7 to 1.',
  },
  {
    id: 'a1.octave',
    subsectionPrefix: 'A1',
    placement: 'info',
    kind: 'theory',
    when: 'octaveTwoOverTwoUp',
    title: 'Two roots',
    body: 'The low and high {tonic} are the same note, one octave apart. The high one is two strings over and two frets up.',
  },
  {
    id: 'a1.fingers',
    subsectionPrefix: 'A1',
    placement: 'intro',
    kind: 'technique',
    when: 'handStill',
    title: 'One finger per fret',
    body: 'Put finger 1 on fret {startFret}. Each finger then covers the next fret. Keep your hand still and let your fingers reach.',
  },
  {
    id: 'a1.fingersOpen',
    subsectionPrefix: 'A1',
    placement: 'intro',
    kind: 'technique',
    when: 'scaleHasOpenStrings',
    title: 'Open strings',
    body: 'Open strings need no finger. Let them ring.',
  },
  {
    id: 'a1.restless',
    subsectionPrefix: 'A1',
    placement: 'info',
    kind: 'listening',
    when: 'always',
    modes: 'ionian',
    title: 'The restless notes',
    body: 'Notes 4 and 7 sound unsettled. 7 leans up to 1. 4 leans down to 3. Listen for this near the top of the scale.',
  },
  {
    id: 'a1.degreeNames',
    subsectionPrefix: 'A1',
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: 'ionian',
    title: 'Names for the numbers',
    body: '1 is the tonic, the home note. 5 is the dominant. 7 is the leading tone, because it leads back to 1.',
  },
  {
    id: 'a1.ionian',
    subsectionPrefix: 'A1',
    placement: 'popover',
    kind: 'theory',
    when: 'always',
    modes: 'ionian',
    title: 'What is Ionian?',
    body: 'Ionian is another name for the major scale. Starting the same notes from another note makes a new sound, called a mode. Modes come in Book Two.',
  },
  {
    id: 'a1.slowFirst',
    subsectionPrefix: 'A1',
    placement: 'intro',
    kind: 'practice',
    when: 'inTimeStep',
    title: 'Clean, then fast',
    body: 'Start slowly. Raise the speed only when every note rings clearly.',
  },
  {
    id: 'a2.home',
    subsectionPrefix: 'A2',
    placement: 'intro',
    kind: 'listening',
    when: 'always',
    title: 'Ending on 1',
    body: 'These melodies begin and end on 1. Ending on 1 sounds finished.',
  },
  {
    id: 'a2.shape',
    subsectionPrefix: 'A2',
    placement: 'info',
    kind: 'listening',
    when: 'always',
    title: 'Up and back',
    body: 'The second melody climbs and then walks back down. Listen to the demo, then copy it.',
  },
  {
    id: 'a3.staccato',
    subsectionPrefix: 'A3',
    placement: 'intro',
    kind: 'technique',
    when: 'staccatoStep',
    title: 'Short notes',
    body: 'Staccato means short. Pick the note, then relax your finger so the sound stops. Keep the finger touching the string.',
  },
  {
    id: 'a3.legato',
    subsectionPrefix: 'A3',
    placement: 'intro',
    kind: 'technique',
    when: 'legatoStep',
    title: 'Smooth notes',
    body: 'Legato means smooth. Pick each note and let it ring until the next one starts. Leave no gaps between notes.',
  },
  {
    id: 'a4.fingers',
    subsectionPrefix: 'A4',
    placement: 'intro',
    kind: 'technique',
    when: 'always',
    title: 'Same finger idea',
    body: 'Use one finger per fret here too. The numbers on the dots show which finger to use.',
  },
  {
    id: 'a4.what',
    subsectionPrefix: 'A4',
    placement: 'intro',
    kind: 'theory',
    when: 'always',
    modes: 'ionian',
    title: 'Five notes',
    body: 'Pentatonic means five notes. This scale is the major scale without notes 4 and 7. That leaves 1, 2, 3, 5 and 6.',
  },
  {
    id: 'a4.why',
    subsectionPrefix: 'A4',
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: 'ionian',
    title: 'No clashing notes',
    body: 'Notes 4 and 7 make the half steps. Without them, these five notes rarely clash.',
  },
  {
    id: 'a4.ghost',
    subsectionPrefix: 'A4',
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: 'ionian',
    title: 'Missing notes',
    body: 'Faint outlines show where 4 and 7 would be. The pentatonic skips them.',
  },
  {
    id: 'a4.gb',
    subsectionPrefix: 'A4',
    placement: 'info',
    kind: 'technique',
    when: 'always',
    title: 'The G and B strings',
    body: 'The G and B strings are tuned closer together than the others. Shapes move up one fret when they cross onto the B string.',
  },
  {
    id: 'a4.octave',
    subsectionPrefix: 'A4',
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: 'ionian',
    title: 'Root to root',
    body: 'The high {tonic} is two strings over and three frets up. It is one fret further than in the major scale shape, because of the B string.',
  },
  {
    id: 'a4.relative',
    subsectionPrefix: 'A4',
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: 'ionian',
    title: 'Did you know?',
    body: 'These five notes also make the {relMinor} minor pentatonic. Only the home note changes.',
  },
  {
    id: 'b.fromScale',
    subsectionPrefix: 'B',
    placement: 'intro',
    kind: 'theory',
    when: 'always',
    title: 'Chords come from the scale',
    body: 'Pick a scale note. Skip the next note and take the one after. Do that once more. Those three notes make a triad.',
  },
  {
    id: 'b.pattern',
    subsectionPrefix: 'B',
    placement: 'intro',
    kind: 'theory',
    when: 'always',
    modes: 'ionian',
    title: 'Same pattern, every key',
    body: 'In every major key the chords follow one pattern. 1 major, 2 minor, 3 minor, 4 major, 5 major, 6 minor, 7 diminished.',
  },
  {
    id: 'b.sevenLater',
    subsectionPrefix: 'B',
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: 'ionian',
    title: 'Where is chord 7?',
    body: 'The triad on 7 is diminished. You will play it later as a 7th chord: 7 min7(♭5).',
  },
  {
    id: 'b.barreCare',
    subsectionPrefix: ['B1', 'B2', 'B4', 'B5', 'B6', 'B7', 'B8', 'D3'],
    placement: 'intro',
    kind: 'practice',
    when: 'firstBarreStepInKey',
    title: 'Look after your hand',
    body: 'Barre shapes need strength. Rest your hand when it feels tired. Stop if anything hurts.',
  },
  {
    id: 'b1.arp',
    subsectionPrefix: ['B1', 'B5'],
    placement: 'intro',
    kind: 'theory',
    when: 'always',
    title: 'One note at a time',
    body: 'An arpeggio plays a chord one note at a time. A strum plays the same notes together.',
  },
  {
    id: 'b1.order',
    subsectionPrefix: ['B1', 'B5'],
    placement: 'popover',
    kind: 'listening',
    when: 'always',
    title: 'Listen low to high',
    body: 'Low to high, this shape plays {toneOrder}. R is the root.',
  },
  {
    id: 'b1.names',
    subsectionPrefix: ['B1', 'B5'],
    placement: 'info',
    kind: 'theory',
    when: 'shapeHasDoubledTones',
    title: 'Three note names',
    body: 'This shape uses {stringCount} strings but only three note names: {noteNames}. Some notes appear twice, in different octaves.',
  },
  {
    id: 'b1.third',
    subsectionPrefix: ['B1', 'B5'],
    placement: 'info',
    kind: 'listening',
    when: 'stepChordsHaveThird',
    title: 'Listen for the 3',
    body: 'The note marked 3 sets the mood. Major sounds bright. Minor sounds darker.',
  },
  {
    id: 'b2.root',
    subsectionPrefix: ['B2', 'B4', 'B6'],
    placement: 'intro',
    kind: 'technique',
    when: 'always',
    title: 'Start on the root',
    body: 'Start your strum on the string with the root marker.',
  },
  {
    id: 'b2.x',
    subsectionPrefix: ['B2', 'B4', 'B6'],
    placement: 'info',
    kind: 'technique',
    when: 'shapeHasMutedStrings',
    title: 'Skip the X strings',
    body: 'An X means do not play that string. Its note would sit under the chord and change its sound.',
  },
  {
    id: 'b2.anchor',
    subsectionPrefix: ['B2', 'B4', 'B6', 'B8', 'D3'],
    placement: 'popover',
    kind: 'technique',
    when: 'changeHasAnchor',
    title: 'Keep a finger down',
    body: 'Both chords use this note. Leave that finger pressed and move the others.',
  },
  {
    id: 'b2.rhythmFirst',
    subsectionPrefix: ['B2', 'B4', 'B6'],
    placement: 'info',
    kind: 'practice',
    when: 'always',
    title: 'Rhythm first',
    body: 'New rhythm? Strum it on one chord first. Add the changes when it feels easy.',
  },
  {
    id: 'b4.mixed',
    subsectionPrefix: 'B4',
    placement: 'intro',
    kind: 'practice',
    when: 'always',
    title: 'Mixed order',
    body: 'Mixed order teaches your hand to find each shape quickly. Look at the next chord before the change.',
  },
  {
    id: 'b3.mute',
    subsectionPrefix: 'B3',
    placement: 'intro',
    kind: 'technique',
    when: 'always',
    title: 'Short chords',
    body: 'To make a chord short, relax your fretting fingers. Keep them on the strings. The sound stops right away.',
  },
  {
    id: 'b7.plusOne',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'intro',
    kind: 'theory',
    when: 'chordTopIsSeventh',
    title: 'Triad plus one',
    body: 'A 7th chord is a triad with one more note on top. That note is the 7th.',
  },
  {
    id: 'b7.hidden',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'popover',
    kind: 'theory',
    when: 'hasHiddenTriad',
    title: 'A chord inside a chord',
    body: 'Take away the root of {chord} and {hiddenTriad} is left. You already know it as chord {hiddenDegree}.',
  },
  {
    id: 'b7.kinds',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: DIATONIC,
    title: 'Four kinds of 7th chord',
    body: 'Major 7: R 3 5 7. Dominant 7: R 3 5 ♭7. Minor 7: R ♭3 5 ♭7. Minor 7(♭5): R ♭3 ♭5 ♭7.',
  },
  {
    id: 'b7.sound',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'info',
    kind: 'listening',
    when: 'always',
    modes: DIATONIC,
    title: 'How they sound',
    body: 'Major 7 sounds soft. Dominant 7 sounds bluesy and wants to move. Minor 7 sounds mellow. Minor 7(♭5) sounds tense.',
  },
  {
    id: 'b7.oneNote',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: DIATONIC,
    title: 'One note apart',
    body: 'Lower the 7 by one fret and major 7 becomes dominant 7. Then lower the 3 and it becomes minor 7. Then lower the 5 and it becomes minor 7(♭5).',
  },
  {
    id: 'b7.order',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'popover',
    kind: 'listening',
    when: 'always',
    title: 'Spread-out notes',
    body: 'Low to high, this shape plays {toneOrder}. The notes are spread out, but it is still the same chord.',
  },
  {
    id: 'b7.why',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'info',
    kind: 'theory',
    when: 'always',
    title: 'Why these shapes?',
    body: 'Four notes packed close together are hard to finger on guitar. Moving one note down an octave spreads them out. Then each finger gets its own string.',
  },
  {
    id: 'b7.drop2',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'popover',
    kind: 'theory',
    when: 'familyDrop2',
    title: 'Drop 2 shape',
    body: 'Root on string {rootString}, then one note on each string. Guitarists call this a drop 2 shape.',
  },
  {
    id: 'b7.drop3',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'popover',
    kind: 'theory',
    when: 'familyDrop3',
    title: 'Drop 3 shape',
    body: 'Root on string 6, then skip string 5. Guitarists call this a drop 3 shape.',
  },
  {
    id: 'b7.drop3mute',
    // D3 too: in D, B and B♭ the first drop-3 shape is on a Music Map.
    subsectionPrefix: ['B7', 'B8', 'D3'],
    placement: 'intro',
    kind: 'technique',
    when: 'firstDrop3StepInKey',
    title: 'Keep string 5 quiet',
    body: 'String 5 must not sound. Let the finger on string 6 lean lightly against it.',
  },
  {
    id: 'b7.halfDim',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'popover',
    kind: 'theory',
    when: 'degreeIs7',
    modes: 'ionian',
    title: 'Half-diminished',
    body: 'Chord 7 is minor 7(♭5). Many charts call it half-diminished and write ø.',
  },
  {
    id: 'b7.movable',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'popover',
    kind: 'technique',
    when: 'shapeIsMovable',
    title: 'Movable shape',
    body: 'This shape has no open strings. Slide it along the neck and it keeps its type. The root note gives it its name.',
  },
  {
    id: 'b7.open',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'popover',
    kind: 'theory',
    when: 'familyOpenSeventh',
    title: 'Open strings count',
    body: 'The open strings are part of this chord. {openStringRoles} Let them ring.',
  },
  {
    id: 'b8.topNote',
    subsectionPrefix: 'B8',
    placement: 'info',
    kind: 'listening',
    when: 'hasTopLineRun',
    title: 'Listen to the top',
    body: 'Listen to the highest string. While the shape stays the same, it climbs one scale step per chord.',
  },
  {
    id: 'b8.octaveSame',
    subsectionPrefix: 'B8',
    placement: 'info',
    kind: 'theory',
    when: 'octaveIsSameShape',
    title: 'Back to 1',
    body: 'Chord 1 returns 12 frets higher. Same shape, one octave up.',
  },
  {
    id: 'b8.octaveNew',
    subsectionPrefix: 'B8',
    placement: 'info',
    kind: 'theory',
    when: 'octaveIsNewShape',
    title: 'Back to 1',
    body: 'Chord 1 returns higher up the neck, with a different shape. It is still the same chord.',
  },
  {
    id: 'b8.octaveEnd',
    subsectionPrefix: 'B8',
    placement: 'info',
    kind: 'theory',
    when: 'octaveNotHigher',
    title: 'Back to 1',
    body: 'Chord 1 comes back to finish the set.',
  },
  {
    id: 'd.listenFirst',
    subsectionPrefix: ['D1', 'D2', 'D3'],
    placement: 'intro',
    kind: 'practice',
    when: 'always',
    title: 'Listen first',
    body: 'Listen to the demo once before you play. Knowing the sound makes the changes easier to find.',
  },
  {
    id: 'd3.jobs',
    subsectionPrefix: 'D3',
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: 'ionian',
    title: 'Chord jobs',
    body: 'Home chords (1, 3, 6) feel settled. Away chords (2, 4) move away from home. Tension chords (5, 7) pull back home.',
  },
  {
    id: 'd3.fiveOne',
    subsectionPrefix: 'D3',
    placement: 'popover',
    kind: 'listening',
    when: 'mapHasFiveToOne',
    modes: 'ionian',
    title: '5 to 1',
    body: 'The 5 chord builds tension. The 1 chord releases it. This is the strongest way to arrive home.',
  },
  {
    id: 'd3.twoFiveOne',
    subsectionPrefix: 'D3',
    placement: 'popover',
    kind: 'listening',
    when: 'mapHasTwoFiveOne',
    modes: 'ionian',
    title: '2-5-1',
    body: 'The 2 chord leads to the 5 chord. The 5 chord leads home to 1. You will hear this move in many songs.',
  },
  {
    id: 'd3.twoFiveOneWrap',
    subsectionPrefix: 'D3',
    placement: 'popover',
    kind: 'listening',
    when: 'twoFiveOneWraps',
    modes: 'ionian',
    title: '2-5-1',
    body: 'Here the 2-5-1 happens across the repeat. The map lands on 1 when it starts again.',
  },
  {
    id: 'd3.turnaround',
    subsectionPrefix: 'D3',
    placement: 'popover',
    kind: 'listening',
    when: 'mapHasTurnaround',
    modes: 'ionian',
    title: 'Turnaround',
    body: '1, 6, 2, 5 leads back to 1. That is why this map loops so smoothly.',
  },
  {
    id: 'd3.six',
    subsectionPrefix: 'D3',
    placement: 'info',
    kind: 'listening',
    when: 'mapStartsOnSix',
    modes: 'ionian',
    title: 'Starting on 6',
    body: 'This map starts on chord 6, the relative minor. The notes are the same, but the mood is darker.',
  },
  {
    id: 'd3.seven',
    subsectionPrefix: 'D3',
    placement: 'popover',
    kind: 'theory',
    when: 'mapHasSevenChord',
    modes: 'ionian',
    title: 'Chord 7',
    body: 'Chord 7 shares three notes with the 5 dom7 chord. So it has a similar pull toward 1.',
  },
  {
    id: 'd3.triadBar',
    subsectionPrefix: 'D3',
    placement: 'popover',
    kind: 'theory',
    when: 'mapHasTriadBarIn7thMap',
    title: 'A triad in a 7th map',
    body: 'This bar uses a triad. A triad and a 7th chord on the same number do the same job. The 7th only adds colour.',
  },
  {
    id: 'd3.sameFret',
    subsectionPrefix: 'D3',
    placement: 'popover',
    kind: 'technique',
    when: 'changeIsSameFretR6toR5',
    title: 'Same fret, next string',
    body: 'The root moves from string 6 to string 5 on the same fret. That lifts the root by a 4th. Here it takes you from {fromDegree} to {toDegree}.',
  },
  {
    id: 'd3.pull',
    subsectionPrefix: 'D3',
    placement: 'info',
    kind: 'listening',
    when: 'mapHasDom7ToOne',
    modes: 'ionian',
    title: 'Why 5 pulls to 1',
    body: 'In {dom7Chord}, {seventhNote} wants to step down to {tonicThird}. {thirdNote} wants to step up to {tonic}. Those small steps make 1 sound like home.',
  },
  {
    id: 'd3.tricky',
    subsectionPrefix: ['B2', 'B4', 'B6', 'B8', 'D3'],
    placement: 'popover',
    kind: 'practice',
    when: 'changeSharesNoNotes',
    title: 'Tricky change',
    body: 'These chords share no notes, so every finger moves. Loop this change a few extra times.',
  },
  {
    id: 'd3.roman',
    subsectionPrefix: 'D3',
    placement: 'info',
    kind: 'theory',
    when: 'romanSettingOn',
    title: 'Roman numerals',
    body: 'Many classes write chords as Roman numerals. Capital letters mean major. Small letters mean minor. 2 min7 is written ii7.',
  },
  {
    id: 'd3.jam',
    subsectionPrefix: 'D3',
    placement: 'info',
    kind: 'practice',
    when: 'always',
    modes: DIATONIC,
    title: 'Make it your own',
    body: 'Loop this map and play the pentatonic scale over it. Try ending each idea on a note from the current chord.',
  },
  // ── The modes (Dorian … Locrian; Book One's notes above say 'major') ──
  {
    id: 'key.modeParent',
    subsectionPrefix: 'KEY',
    placement: 'intro',
    kind: 'theory',
    when: 'modeSpelledLikeParent',
    modes: 'modal',
    title: 'Notes from {parentKey} major',
    body: '{key} {mode} uses the same notes as {parentKey} major. It starts on note {parentDegree} instead of note 1, so {key} is home.',
  },
  {
    id: 'key.modeParentRespelled',
    subsectionPrefix: 'KEY',
    placement: 'intro',
    kind: 'theory',
    when: 'modeRespelled',
    modes: 'modal',
    title: 'Sounds like {parentKey} major',
    body: '{key} {mode} sounds like {parentKey} major played from its note {parentDegree}, so {key} is home. Here its notes are spelled differently.',
  },
  {
    id: 'key.modeColour',
    subsectionPrefix: 'KEY',
    placement: 'intro',
    kind: 'listening',
    when: 'always',
    modes: MODAL_AND_FAMILIES,
    title: 'The note to listen for',
    body: '{colourText} In {key} {mode} that note is {colourNote}, the {colourDegree}.',
  },
  {
    id: 'a1.modeSteps',
    subsectionPrefix: 'A1',
    placement: 'intro',
    kind: 'theory',
    when: 'always',
    modes: 'modal',
    title: 'Whole and half steps',
    body: 'A whole step is 2 frets. A half step is 1 fret. This scale has half steps in two places: {halfSteps}.',
  },
  {
    id: 'a1.mode',
    subsectionPrefix: 'A1',
    placement: 'popover',
    kind: 'theory',
    when: 'always',
    modes: 'modal',
    title: 'What is {mode}?',
    body: 'A mode plays the notes of a major scale from another starting note. Play {parentKey} major from its note {parentDegree} and you get {key} {mode}.',
  },
  {
    id: 'a4.modeWhat',
    subsectionPrefix: 'A4',
    placement: 'intro',
    kind: 'theory',
    when: 'always',
    modes: 'modal',
    title: 'Five notes',
    body: 'Pentatonic means five notes. This one takes {pentDegrees} from {key} {mode}.',
  },
  {
    id: 'a4.modeGhost',
    subsectionPrefix: 'A4',
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: 'modal',
    title: 'Missing notes',
    body: 'Faint outlines show where {skipped} would be. This pentatonic leaves them out.',
  },
  {
    id: 'b.modePattern',
    subsectionPrefix: 'B',
    placement: 'intro',
    kind: 'theory',
    when: 'always',
    modes: MODAL_AND_FAMILIES,
    title: 'The {mode} pattern',
    body: 'Every {mode} key follows one chord pattern. {triadPattern}.',
  },
  {
    id: 'b.dim',
    subsectionPrefix: 'B',
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: 'modal',
    title: 'The diminished chord',
    body: 'Chord {dimDegree} is diminished: R ♭3 ♭5. Its two stacked minor thirds make it sound tense.',
  },
  {
    id: 'd3.modeColour',
    subsectionPrefix: 'D3',
    placement: 'intro',
    kind: 'listening',
    when: 'always',
    modes: MODAL_AND_FAMILIES,
    title: 'The {mode} sound',
    body: 'These maps lean on chord 1 and chord {colourChord}. Rocking between them is a classic {mode} sound.',
  },
  // ── The rest of Theory: the harmonic, melodic and double harmonic
  // families (FAMILIES) and the pentatonic and blues scales ──
  {
    id: 'key.familyParent',
    subsectionPrefix: 'KEY',
    placement: 'intro',
    kind: 'theory',
    when: 'modeIsFamilyParent',
    modes: FAMILIES,
    title: 'First of its family',
    body: '{key} {mode} is the first scale of its family. Each of its notes starts another mode, with a sound of its own.',
  },
  {
    id: 'key.familyMode',
    subsectionPrefix: 'KEY',
    placement: 'intro',
    kind: 'theory',
    when: 'modeIsFamilyMode',
    modes: FAMILIES,
    title: 'Notes from {familyParentKey} {familyName}',
    body: '{key} {mode} uses the notes of {familyParentKey} {familyName}. It starts on note {familyDegree} instead, so {key} is home.',
  },
  {
    id: 'key.scaleIntro',
    subsectionPrefix: 'KEY',
    placement: 'intro',
    kind: 'theory',
    when: 'always',
    modes: 'pentatonic-blues',
    title: 'A {noteCount}-note scale',
    body: '{key} {mode} has {noteCount} notes: {scaleDegrees}. In this key they are {scaleNoteNames}.',
  },
  {
    id: 'key.scaleSound',
    subsectionPrefix: 'KEY',
    placement: 'intro',
    kind: 'listening',
    when: 'always',
    modes: 'pentatonic-blues',
    title: 'How it sounds',
    body: '{scaleCharacter}.',
  },
  {
    id: 'key.scalePartner',
    subsectionPrefix: 'KEY',
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: 'pentatonic-blues',
    title: 'Its partner scale',
    body: '{partnerKey} {partnerName} uses the same notes as {key} {mode}. Only the home note changes.',
  },
  {
    id: 'a1.familySteps',
    subsectionPrefix: 'A1',
    placement: 'intro',
    kind: 'theory',
    when: 'always',
    modes: FAMILIES,
    title: 'Whole and half steps',
    body: 'A whole step is 2 frets. A half step is 1 fret. This scale has {halfStepCount} half steps: {halfStepList}.',
  },
  {
    id: 'a1.augSecond',
    subsectionPrefix: 'A1',
    placement: 'info',
    kind: 'listening',
    when: 'scaleHasAugmentedSecond',
    modes: FAMILIES,
    title: 'A step and a half',
    body: 'Between {augSecondPairs} is a step and a half: three frets on one string. That wide gap gives {key} {mode} its exotic sound.',
  },
  {
    id: 'a1.stretch',
    subsectionPrefix: 'A1',
    placement: 'intro',
    kind: 'technique',
    when: 'positionNeedsStretch',
    modes: REST_OF_THEORY,
    title: 'Reach back one fret',
    body: 'This shape covers five frets. Rest finger 1 on fret {stretchFret}. On strings with a note on fret {lowFret}, reach back for it with finger 1.',
  },
  {
    id: 'a1.gaps',
    subsectionPrefix: 'A1',
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: 'pentatonic-blues',
    title: 'Gaps in the scale',
    body: 'Some neighbouring notes are a step and a half apart: three frets on one string. The notes left out are the ones most likely to clash.',
  },
  {
    id: 'a1.blueNote',
    subsectionPrefix: 'A1',
    placement: 'info',
    kind: 'listening',
    when: 'scaleHasBlueNote',
    modes: 'pentatonic-blues',
    title: 'The blue note',
    body: '{blueNote}, the {blueDegree}, is the blue note. Pass through it on the way to a neighbour rather than resting on it.',
  },
  {
    id: 'b.aug',
    subsectionPrefix: 'B',
    placement: 'info',
    kind: 'theory',
    when: 'hasAugTriad',
    modes: FAMILIES,
    title: 'The augmented chord',
    body: 'Chord {augDegree} is augmented: R 3 ♯5. Two stacked major thirds make it sound unresolved.',
  },
  {
    id: 'b.dimPair',
    subsectionPrefix: 'B',
    placement: 'info',
    kind: 'theory',
    when: 'hasTwoDimTriads',
    modes: FAMILIES,
    title: 'Two diminished chords',
    body: 'Chords {dimDegrees} are diminished: R ♭3 ♭5. Both sound tense and lean toward the next chord.',
  },
  {
    id: 'b.majFlat5',
    subsectionPrefix: 'B',
    placement: 'info',
    kind: 'theory',
    when: 'hasMajFlat5Triad',
    modes: 'double-harmonic',
    title: 'Major with a flat 5',
    body: 'Chord {majb5Degree} is major with a lowered 5: R 3 ♭5. The ♭5 makes it sound strained and restless.',
  },
  {
    id: 'b.sus2Flat5',
    subsectionPrefix: 'B',
    placement: 'info',
    kind: 'theory',
    when: 'hasSus2Flat5Triad',
    modes: 'double-harmonic',
    title: 'A chord without a 3',
    body: 'Chord {sus2b5Degree} has a 2 where the 3 would be: R 2 ♭5. Without a 3 it is neither major nor minor.',
  },
  {
    id: 'b7.kindsFamily',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'info',
    kind: 'theory',
    when: 'always',
    modes: FAMILIES,
    title: 'Its four-note chords',
    body: '{key} {mode} builds {seventhKindCount} kinds of four-note chord. They are {seventhKinds}.',
  },
  {
    id: 'b7.minMaj7',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'popover',
    kind: 'theory',
    when: 'chordIsMinMaj7',
    modes: FAMILIES,
    title: 'Minor with a major 7',
    body: '{chord} is a minor triad with a major 7 on top. The 7 sits a half step below the root, which sounds dark and tense.',
  },
  {
    id: 'b7.augMaj7',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'popover',
    kind: 'theory',
    when: 'chordIsAugMaj7',
    modes: FAMILIES,
    title: 'Major 7, sharp 5',
    body: '{chord} is a major 7 chord with its 5 raised a half step. The ♯5 makes it bright but unsettled.',
  },
  {
    id: 'b7.dim7',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'popover',
    kind: 'theory',
    when: 'chordIsDim7',
    modes: FAMILIES,
    title: 'Diminished 7',
    body: '{chord} stacks three minor thirds: R ♭3 ♭5 𝄫7. Move this shape three frets and the notes stay the same.',
  },
  {
    id: 'b7.halfDimFamily',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'popover',
    kind: 'theory',
    when: 'chordIsHalfDim',
    modes: FAMILIES,
    title: 'Half-diminished',
    body: '{chord} is minor 7(♭5). Many charts call it half-diminished and write ø.',
  },
  {
    id: 'b7.min6',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'popover',
    kind: 'theory',
    when: 'chordIsMin6',
    modes: 'double-harmonic',
    title: 'Minor 6',
    body: '{chord} is a minor triad with a 6 on top instead of a 7: R ♭3 5 6.',
  },
  {
    id: 'b7.dom7b5',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'popover',
    kind: 'theory',
    when: 'chordIsDom7b5',
    modes: 'double-harmonic',
    title: 'Dominant 7, flat 5',
    body: '{chord} is a dominant 7 chord with its 5 lowered a half step: R 3 ♭5 ♭7. It pulls hard toward the next chord.',
  },
  {
    id: 'b7.sus2Flat5Add6',
    subsectionPrefix: ['B7', 'B8'],
    placement: 'popover',
    kind: 'theory',
    when: 'chordIsSus2b5add6',
    modes: 'double-harmonic',
    title: 'A 6 on sus2(♭5)',
    body: '{chord} adds a 6 to sus2(♭5): R 2 ♭5 6. It has the same notes as a dominant 7 chord built on its 2.',
  },
  {
    id: 'd1.band',
    subsectionPrefix: 'D1',
    placement: 'intro',
    kind: 'listening',
    when: 'always',
    modes: 'pentatonic-blues',
    title: 'Play over the band',
    body: 'The band plays the chords while you play the phrase. Your notes stay the same as the chords change under them. Listen to how each chord colours them.',
  },
  {
    id: 'd3.jamFamily',
    subsectionPrefix: 'D3',
    placement: 'info',
    kind: 'practice',
    when: 'always',
    modes: REST_OF_THEORY,
    title: 'Make it your own',
    body: 'Loop this map and play the {key} {mode} scale over it. Try ending each idea on a note from the current chord.',
  },
  {
    id: 'pt.focus',
    subsectionPrefix: 'PRACTICE',
    placement: 'info',
    kind: 'practice',
    when: 'always',
    title: 'One thing at a time',
    body: 'Choose one thing to practise today. Short, focused practice works better than long, scattered practice.',
  },
  {
    id: 'pt.clean',
    subsectionPrefix: 'PRACTICE',
    placement: 'popover',
    kind: 'practice',
    when: 'always',
    title: 'Clean pass',
    body: 'A clean pass misses no more than one note. Almost every note must be heard clearly.',
  },
];

export type GuitarTheoryStringId =
  | 'toggle.fingers'
  | 'toggle.notes'
  | 'toggle.chordTones'
  | 'toggle.keyNumbers'
  | 'legend.fingers'
  | 'legend.chordTones'
  | 'legend.keyNumbers'
  | 'legend.steps'
  | 'family.open'
  | 'family.r6'
  | 'family.r5'
  | 'family.r4'
  | 'family.r6full'
  | 'family.drop2'
  | 'family.drop3'
  | 'family.openSeventh'
  | 'badge.movable'
  | 'badge.openStrings'
  | 'formula.maj'
  | 'formula.min'
  | 'formula.dim'
  | 'formula.aug'
  | 'formula.majb5'
  | 'formula.sus2b5'
  | 'formula.maj7'
  | 'formula.dom7'
  | 'formula.min7'
  | 'formula.min7b5'
  | 'formula.dim7'
  | 'formula.minMaj7'
  | 'formula.maj7#5'
  | 'formula.dom7b5'
  | 'formula.min6'
  | 'formula.sus2b5add6'
  | 'nickname.min7b5'
  | 'chordbox.minorNote'
  | 'aliases'
  | 'aliases.dom7'
  | 'fn.home'
  | 'fn.away'
  | 'fn.tension'
  | 'toggle.showJobs'
  | 'toggle.roman'
  | 'chip.251'
  | 'chip.turnaround'
  | 'chip.fiveOne'
  | 'badge.shared'
  | 'badge.sharedNone'
  | 'octave.label'
  | 'ghost.label'
  | 'position.label'
  | 'compare.title'
  | 'compare.moved'
  | 'compare.caption'
  | 'aria.chordbox'
  | 'aria.step'
  | 'pt.ladder'
  | 'pt.stepBack'
  | 'pt.tricky'
  | 'pt.loopWholeMap'
  | 'pt.loopHalf'
  | 'pt.break'
  | 'det.missing3'
  | 'det.missingToneOneString'
  | 'det.missingToneDoubled'
  | 'det.missing7'
  | 'det.missingRoot'
  | 'det.muteX'
  | 'det.bass'
  | 'det.unclearQuality';

export const GUITAR_THEORY_STRINGS: Readonly<
  Record<GuitarTheoryStringId, string>
> = {
  'toggle.fingers': 'Fingers',
  'toggle.notes': 'Notes',
  'toggle.chordTones': 'Chord tones',
  'toggle.keyNumbers': 'Key numbers',
  'legend.fingers': 'Numbers show which finger to use. 1 is your index finger.',
  'legend.chordTones':
    'R is the root. 3, 5 and 7 count up from the root. ♭ means one fret lower.',
  'legend.keyNumbers': "Numbers show each note's place in the key. 1 is home.",
  'legend.steps': 'W is a whole step (2 frets). H is a half step (1 fret).',
  'family.open': 'Open chord',
  'family.r6': 'Root on string 6',
  'family.r5': 'Root on string 5',
  'family.r4': 'Root on string 4',
  'family.r6full': 'Root on string 6 · full barre',
  'family.drop2': 'Root on string {rootString} · drop 2',
  'family.drop3': 'Root on string 6 · drop 3',
  'family.openSeventh': 'Open-string voicing',
  'badge.movable': 'Movable',
  'badge.openStrings': 'Uses open strings',
  'formula.maj': 'R 3 5',
  'formula.min': 'R ♭3 5',
  'formula.dim': 'R ♭3 ♭5',
  'formula.aug': 'R 3 ♯5',
  'formula.majb5': 'R 3 ♭5',
  'formula.sus2b5': 'R 2 ♭5',
  'formula.maj7': 'R 3 5 7',
  'formula.dom7': 'R 3 5 ♭7',
  'formula.min7': 'R ♭3 5 ♭7',
  'formula.min7b5': 'R ♭3 ♭5 ♭7',
  'formula.dim7': 'R ♭3 ♭5 𝄫7',
  'formula.minMaj7': 'R ♭3 5 7',
  'formula.maj7#5': 'R 3 ♯5 7',
  'formula.dom7b5': 'R 3 ♭5 ♭7',
  'formula.min6': 'R ♭3 5 6',
  'formula.sus2b5add6': 'R 2 ♭5 6',
  'nickname.min7b5': 'half-diminished (ø)',
  'chordbox.minorNote': 'Minor lowers the 3 by one fret.',
  aliases: 'Also written as {aliases}. They all mean the same chord.',
  'aliases.dom7':
    'Charts write this chord as {symbol}. A plain 7 means dominant 7.',
  'fn.home': 'Home',
  'fn.away': 'Away',
  'fn.tension': 'Tension',
  'toggle.showJobs': 'Show chord jobs',
  'toggle.roman': 'Show Roman numerals',
  'chip.251': '2-5-1',
  'chip.turnaround': 'Turnaround',
  'chip.fiveOne': '5 → 1',
  'badge.shared': '{n} shared notes',
  'badge.sharedNone': 'No shared notes',
  'octave.label': 'octave',
  'ghost.label': 'not in the pentatonic',
  'position.label': 'Position {startFret}: finger 1 on fret {startFret}',
  'compare.title': 'Same root, four kinds',
  'compare.moved': '{from} → {to}',
  'compare.caption': 'Shapes built on {root} for comparison.',
  'aria.chordbox':
    '{chordName}: {shapeSpoken}. Low to high: {toneOrderSpoken}. {familyTag}.',
  'aria.step': '{interval}: {stepWord}',
  'pt.ladder': '{from}% → {to}% after {n} clean passes · {done}/{n}',
  'pt.stepBack': 'Slowing to {tempo}% for a few passes.',
  'pt.tricky':
    'Tricky change: {chordA} → {chordB}. Loop these two bars at {tempo}%?',
  'pt.loopWholeMap': 'Loop one pass of the map',
  'pt.loopHalf': 'Loop bars {from}–{to}',
  'pt.break':
    'You have worked on barre chords for 10 minutes. Shake out your hand and rest for a minute.',
  'det.missing3':
    'We heard the root and the 5, but not the 3. The 3 makes a chord major or minor. Check the ringed dot.',
  'det.missingToneOneString':
    'Missing the {tone} ({note}). In this shape it is on string {string}. Check that nothing is touching that string.',
  'det.missingToneDoubled':
    'Missing the {tone} ({note}). Check the ringed dots.',
  'det.missing7':
    'We heard the chord, but not the 7 ({note}). It is on string {string} in this shape.',
  'det.missingRoot':
    'The top notes sounded right, but the root was quiet. Press the root firmly and let string {string} ring.',
  'det.muteX':
    'We also heard open string {string}. Mute it, or skip it when you strum.',
  'det.bass':
    'Nice chord! We also heard a low note under it. Start your strum on string {string}.',
  'det.unclearQuality':
    'We could not tell if this was major or minor. Let string {string} ring clearly.',
};

// ── Resolving ──────────────────────────────────────────────────────────────

export const GUITAR_SUBSECTION_PREFIXES: readonly GuitarSubsectionPrefix[] = [
  'KEY',
  'A1',
  'A2',
  'A3',
  'A4',
  'A5',
  'B',
  'B1',
  'B2',
  'B3',
  'B4',
  'B5',
  'B6',
  'B7',
  'B8',
  'D1',
  'D2',
  'D3',
  'PRACTICE',
];

/** 'B5.2' → 'B5'. Null for an id outside the guitar flow. */
export function stepPrefix(stepId: string): GuitarSubsectionPrefix | null {
  const prefix = stepId.split('.')[0];
  return GUITAR_SUBSECTION_PREFIXES.find((p) => p === prefix) ?? null;
}

export function noteHasPrefix(
  note: GuitarTheoryNote,
  subsection: GuitarSubsectionPrefix,
): boolean {
  // A5, a mode's second pentatonic, has A4's notes.
  const prefix = subsection === 'A5' ? 'A4' : subsection;
  const prefixes = note.subsectionPrefix;
  // A single prefix is a string: 'B3'.includes('B') must not match 'B'.
  return typeof prefixes === 'string'
    ? prefixes === prefix
    : prefixes.includes(prefix);
}

export interface ResolvedTheoryNote {
  id: string;
  placement: GuitarTheoryNote['placement'];
  kind: GuitarTheoryNote['kind'];
  title: string;
  body: string;
}

/** Which of GuitarTheoryNote.modes a center's lessons are. */
export function noteScopeOf(center: GuitarCenter): TheoryNoteScope {
  if (center.mode === 'ionian') return 'ionian';
  return center.family === 'diatonic' ? 'modal' : center.family;
}

/** Whether a note belongs to a center's lessons (see GuitarTheoryNote.modes). */
export function noteAppliesTo(
  note: GuitarTheoryNote,
  center: GuitarCenter,
): boolean {
  if (!note.modes) return true;
  const scope = noteScopeOf(center);
  return typeof note.modes === 'string'
    ? note.modes === scope
    : note.modes.includes(scope);
}

const TOKEN = /\{(\w+)\}/g;

function resolveWith(
  note: GuitarTheoryNote,
  d: DerivedTheoryContext,
): ResolvedTheoryNote | null {
  if (!noteAppliesTo(note, d.center)) return null;
  if (!THEORY_CONDITIONS[note.when](d)) return null;
  const unicode = d.settings?.accidentals === 'unicode';
  let complete = true;
  const fill = (text: string) =>
    text.replace(TOKEN, (match, name: string) => {
      const resolver = THEORY_TOKENS[name as TheoryToken];
      const value = resolver?.(d);
      if (value === undefined) {
        complete = false;
        return match;
      }
      return unicode && SPELLED_TOKENS.has(name as TheoryToken)
        ? formatAccidentalsForDisplay(String(value))
        : String(value);
    });
  const title = fill(note.title);
  const body = fill(note.body);
  if (!complete) return null;
  return {
    id: note.id,
    placement: note.placement,
    kind: note.kind,
    title,
    body,
  };
}

/**
 * The note filled in for this context, or null when its condition does not
 * hold (or the context lacks what one of its tokens needs). Subsection
 * filtering is notesFor's job.
 */
export function resolveTheoryNote(
  note: GuitarTheoryNote,
  ctx: TheoryNoteContext,
): ResolvedTheoryNote | null {
  return resolveWith(note, deriveTheoryContext(ctx));
}

export interface TheoryNotesByPlacement {
  /** Step info panel: open one at a time, in this order. */
  intro: ResolvedTheoryNote[];
  /** The (i) drawer, most relevant first. */
  info: ResolvedTheoryNote[];
  /** ChordBox and chip popovers. */
  popover: ResolvedTheoryNote[];
}

/** Every note for a subsection that applies in this context, by placement. */
export function notesFor(
  prefix: GuitarSubsectionPrefix,
  ctx: TheoryNoteContext,
): TheoryNotesByPlacement {
  const d = deriveTheoryContext(ctx);
  const out: TheoryNotesByPlacement = { intro: [], info: [], popover: [] };
  for (const note of GUITAR_THEORY_NOTES) {
    if (!noteHasPrefix(note, prefix)) continue;
    const resolved = resolveWith(note, d);
    if (resolved) out[resolved.placement].push(resolved);
  }
  return out;
}

/** A UI string with its {tokens} filled; unknown tokens are left as written. */
export function theoryString(
  id: GuitarTheoryStringId,
  values: Readonly<Record<string, string | number>> = {},
): string {
  return GUITAR_THEORY_STRINGS[id].replace(TOKEN, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

const FAMILY_STRING: Partial<Record<VoicingFamily, GuitarTheoryStringId>> = {
  'open-chord': 'family.open',
  'root6-four-string': 'family.r6',
  'root5-four-string': 'family.r5',
  'root4-four-string': 'family.r4',
  'root6-full-barre': 'family.r6full',
  drop2: 'family.drop2',
  drop3: 'family.drop3',
  'open-string-seventh': 'family.openSeventh',
};

/** The ChordBox family tag ('Root on string 5 · drop 2'); null when untagged. */
export function familyTag(voicing: VoicingInfo): string | null {
  const id = FAMILY_STRING[voicing.family];
  return id ? theoryString(id, { rootString: voicing.rootString }) : null;
}
