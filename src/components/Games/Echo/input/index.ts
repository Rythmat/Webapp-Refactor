/**
 * Echo's input layer: what the student plays on, shared by the play screens
 * and Make Your Song.
 *
 *   EchoInputSurface  the whole thing: pads or piano by the input setting,
 *                     every way to play heard as one note stream. The usual
 *                     way in:
 *
 *       <EchoInputSurface
 *         input="pads"                    // or 'keyboard' (Game Settings)
 *         kind="melody"                   // or 'chords'
 *         level={1}
 *         keyChoice={{ tonic: 'C', mode: 'major' }}
 *         onNoteOn={({ midi, velocity, perfMs }) => …}
 *         onNoteOff={({ midi, perfMs }) => …}
 *         lit={[67]}                      // Atlas sounding: lights pads/keys
 *       />
 *
 *   useEchoInput      the note stream alone (pointer, home-row keys, typing,
 *                     MIDI), for a screen that draws its own pads or keys
 *   EchoMelodyPads    the melody pads: the level's scale degrees, a staircase
 *   EchoChordPads     the six chord pads; one tap plays the voiced chord
 *   padKeys           the home row that presses the pads (A S D F G H J K L ;)
 *
 * Every note sounds on the lesson piano unless `sound` is off, and comes
 * with its event's timeStamp (`perfMs`) for placing it in time. The surface
 * and the hook need a LearnInputProvider above them (the Echo page has one).
 * Mount one surface at a time: each listens to the computer keyboard.
 */

export { EchoChordPads, type EchoChordPadsProps } from './EchoChordPads';
export {
  EchoInputSurface,
  type EchoInputSurfaceProps,
} from './EchoInputSurface';
export { EchoMelodyPads, type EchoMelodyPadsProps } from './EchoMelodyPads';
export { PAD_KEY_CODES, padKeyLabel, padOfKey } from './padKeys';
export {
  useEchoInput,
  type EchoInput,
  type EchoInputOptions,
  type EchoInputSource,
  type EchoNoteOff,
  type EchoNoteOn,
} from './useEchoInput';
