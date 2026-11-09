import type { TermCopy } from './anatomyCopy';

// ── What each word means, on a keyboard and a synth ────────────────────────
// What they share, then each one's own.

const KEYS: Readonly<Record<string, TermCopy>> = {
  keybed: {
    what: 'The frame the keys are hinged on, with springs that bring each key back up.',
    why: 'It decides how the keys feel. A light, springy keybed plays differently from a piano’s weighted keys.',
  },
  keySensors: {
    what: 'A strip of rubber contacts under the keys. Each key closes a pair, one just before the other.',
    why: 'The gap between the two tells it how fast you pressed, so a harder press can play a louder note.',
  },
};

export const KEYBOARD_COPY: Readonly<Record<string, TermCopy>> = {
  ...KEYS,
  case: {
    what: 'The light plastic shell, in a top and a bottom half, that holds everything together.',
    why: 'It is light enough to carry anywhere, but keep it away from knocks and spilled drinks.',
  },
  grilles: {
    what: 'The perforated covers over the speakers.',
    why: 'They let sound out and keep fingers out. Keep them clear, and don’t stack music on them.',
  },
  musicRest: {
    what: 'The stand that slots into the back to hold your sheet music.',
    why: 'Set it so you can read without leaning. Good posture starts with where your eyes go.',
  },
  keys: {
    what: '61 keys, 36 white and 25 black. This one has no hammers: each key only tells the board which note to play.',
    why: 'The pattern is the same as a piano’s, so everything you learn here carries over. There are just fewer keys.',
  },
  whiteKeys: {
    what: 'The 36 natural notes, named A to G and repeating up the keyboard.',
    why: 'Find any note from its place beside the black keys: C is just left of every group of two.',
  },
  blackKeys: {
    what: 'The 25 sharps and flats, in repeating groups of two and three.',
    why: 'Those groups are your map. You can find every note from them without looking twice.',
  },
  display: {
    what: 'The screen that shows the current sound, rhythm and settings.',
    why: 'Check it when something sounds wrong: often you have just changed sound by accident.',
  },
  buttons: {
    what: 'Rows of buttons that choose sounds, rhythms and functions.',
    why: 'Find the one that returns to a piano sound first. It gets you back from anywhere.',
  },
  dial: {
    what: 'A wheel that steps through whatever the display is showing.',
    why: 'It is the quick way through hundreds of sounds. Try one a day to learn what is in there.',
  },
  volumeKnob: {
    what: 'The knob that sets how loud the speakers and headphones are.',
    why: 'Start low when you put on headphones, to look after your hearing.',
  },
  powerButton: {
    what: 'The button that turns the keyboard on and off.',
    why: 'Many models switch themselves off after a while to save batteries, so a dark screen may not be a fault.',
  },
  pitchWheel: {
    what: 'A wheel beside the keys that bends the pitch up or down, then springs back to center.',
    why: 'It lets a note slide the way a voice or a guitar can. Small, slow moves sound best.',
  },
  mainBoard: {
    what: 'The circuit board that is the keyboard’s brain. Its sounds are stored as data in its chips.',
    why: 'Where a piano has strings, this has recordings and code, so it never needs tuning.',
  },
  speakers: {
    what: 'Two small speakers, one each side, that turn the board’s signal into sound.',
    why: 'They are small, so the low notes lack weight. Headphones or an amp show what the sounds can really do.',
  },
  jacks: {
    what: 'Sockets at the back, usually for power, headphones, a sustain pedal and USB.',
    why: 'USB can connect the keyboard to a computer, so it can play software instruments and notate what you play.',
  },
  sustainPedal: {
    what: 'A foot switch that plugs into the back and holds notes on after you let go.',
    why: 'It does the job of a piano’s damper pedal, and it often comes separately. It is well worth having.',
  },
};

export const SYNTH_COPY: Readonly<Record<string, TermCopy>> = {
  ...KEYS,
  chassis: {
    what: 'The strong metal or wood case that everything mounts into.',
    why: 'A synth gets carried to gigs and turned constantly, so its case has to keep it all rigid.',
  },
  cheeks: {
    what: 'The solid end pieces on each side of the case.',
    why: 'They protect the panel’s corners when it is moved, and give it its classic look.',
  },
  panel: {
    what: 'The plate that carries every control, grouped by what it does.',
    why: 'On a synth, the layout is the lesson: read the sections left to right and you are following the sound.',
  },
  keys: {
    what: '49 keys, 29 white and 20 black. They play no sound themselves; they tell the synth which note and how hard.',
    why: 'Fewer keys keep it portable. Octave buttons usually shift the range when you need notes beyond them.',
  },
  whiteKeys: {
    what: 'The 29 natural notes, named A to G and repeating up the keyboard.',
    why: 'Find any note from its place beside the black keys: C is just left of every group of two.',
  },
  blackKeys: {
    what: 'The 20 sharps and flats, in repeating groups of two and three.',
    why: 'Those groups are your map. You can find every note from them without looking twice.',
  },
  oscillators: {
    what: 'The start of the sound: circuits that make a raw, steady wave, such as a saw or a square.',
    why: 'The wave’s shape sets the character. Detune two against each other and the sound gets thick.',
  },
  filter: {
    what: 'The tone control at the heart of a synth. Its big cutoff knob removes frequencies, usually the highs.',
    why: 'Turn cutoff slowly while holding a note: that sweep is the sound of a synth. Resonance adds an edge to it.',
  },
  amplifier: {
    what: 'The last stage of the sound, which sets how loud it is at each moment.',
    why: 'An envelope usually drives it, and that is what makes a note start, hold and then stop.',
  },
  envelope: {
    what: 'Four sliders that change a setting over each note: attack, decay, sustain, release, or ADSR.',
    why: 'A fast attack sounds plucked; a slow one swells like strings. Same wave, a completely different instrument.',
  },
  lfo: {
    what: 'A low-frequency oscillator: a wave too slow to hear, which moves another setting up and down.',
    why: 'Send it to pitch and you get vibrato; send it to the filter and the sound wobbles.',
  },
  pitchWheel: {
    what: 'The left wheel. It bends the pitch up or down, then springs back to center.',
    why: 'It lets a note slide the way a voice or a guitar can. Small, slow moves sound best.',
  },
  modWheel: {
    what: 'The right wheel. It stays where you leave it, and adds an effect, usually the LFO’s vibrato.',
    why: 'Roll it in only as a long note goes on, the way a singer adds vibrato.',
  },
  masterVolume: {
    what: 'The knob that sets the synth’s overall output.',
    why: 'Start low when plugging in. Some sounds are much louder than others, especially with a resonant filter.',
  },
  display: {
    what: 'The screen that shows the current patch and the value of whatever you are turning.',
    why: 'A saved sound is called a patch. The display tells you which one you are on, and whether you have changed it.',
  },
  presetButtons: {
    what: 'Buttons that recall saved patches, each one a complete set of panel settings.',
    why: 'Load one, then change a knob at a time and listen. Taking presets apart is how most people learn synthesis.',
  },
  voiceBoard: {
    what: 'The circuit board where the sound is made. Each voice is one note the synth can play at once.',
    why: 'That number is its polyphony: a monophonic synth plays one note at a time, a polyphonic one plays chords.',
  },
  powerSupply: {
    what: 'The unit that turns wall power into the low voltages the circuits need.',
    why: 'Use only the right adapter or cable for the model. The wrong voltage can damage the synth.',
  },
  audioOutputs: {
    what: 'Sockets at the back that send the sound to an amp, speakers, an interface or headphones.',
    why: 'Most hardware synths have no speakers, so they make no sound until something is plugged in here.',
  },
  midiPorts: {
    what: 'Round five-pin sockets, in and out, that send and receive note data rather than sound.',
    why: 'MIDI lets the synth play other gear, or be played by a computer. Many synths also send MIDI over USB.',
  },
};
