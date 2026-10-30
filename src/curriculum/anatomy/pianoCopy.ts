import type { TermCopy } from './anatomyCopy';

// ── What each word means, on a piano ───────────────────────────────────────
// What is true of both pianos, then each one's own. Where the two work
// differently (hammers, the soft and middle pedals) that is the point.

export const PIANO_COPY: Readonly<Record<string, TermCopy>> = {
  musicDesk: {
    what: 'The stand that holds your sheet music at reading height.',
    why: 'Set it so you can read without leaning. Good posture starts with where your eyes go.',
  },
  fallboard: {
    what: 'The hinged cover that folds down over the keys.',
    why: 'Close it when you finish playing, to keep dust and spills off the keys.',
  },
  legs: {
    what: 'The supports that hold up the keyboard and the case.',
    why: 'They set the height of the keys, which is why your bench height matters so much.',
  },
  casters: {
    what: 'The small wheels under the piano.',
    why: 'They are for small adjustments only. Moving a piano far is a job for professional movers.',
  },
  keys: {
    what: '88 wooden levers, 52 white and 36 black. Pressing one throws a hammer at its strings.',
    why: 'Because a key works a hammer, how fast you press it decides how loud the note is.',
  },
  whiteKeys: {
    what: 'The 52 natural notes, named A to G and repeating up the keyboard.',
    why: 'Find any note from its place beside the black keys: C is just left of every group of two.',
  },
  blackKeys: {
    what: 'The 36 sharps and flats, in repeating groups of two and three.',
    why: 'Those groups are your map. You can find every note on the piano from them without looking twice.',
  },
  keybed: {
    what: 'The strong shelf that the keys and the action rest on.',
    why: 'It has to stay perfectly flat, because every key depends on it for an even touch.',
  },
  action: {
    what: 'The machine between each key and its strings, made of thousands of small parts.',
    why: 'It is what you feel under your fingers. A well-regulated action makes control far easier.',
  },
  strings: {
    what: 'About 230 steel strings for 88 notes. Most notes have three; the lowest have one or two, wound in copper.',
    why: 'Longer and thicker strings sound lower, which is why the bass strings cross over the others to fit.',
  },
  plate: {
    what: 'The heavy cast-iron frame the strings are stretched across.',
    why: 'Together the strings pull with tons of force. Without the plate, the piano could not hold it.',
  },
  tuningPins: {
    what: 'Steel pins that hold one end of each string. A tuner turns them to change the pitch.',
    why: 'Tuning a piano takes a trained ear and a special wrench, so have it done once or twice a year.',
  },
  pinblock: {
    what: 'The block of layered hardwood that grips the tuning pins.',
    why: 'Its grip is what keeps a piano in tune, and big swings in humidity loosen it.',
  },
  bridges: {
    what: 'Long wooden ridges that the strings press down on.',
    why: 'They carry each string’s vibration into the soundboard. Without them, you would barely hear a note.',
  },
  soundboard: {
    what: 'A large, thin sheet of spruce with ribs across its back, behind or beneath the strings.',
    why: 'It is the piano’s speaker. The strings alone are quiet; this is what fills the room.',
  },
  pedals: {
    what: 'Three foot levers that change how the strings ring: soft, middle and damper, left to right.',
    why: 'The right one is the one you will use most. Learn to press it just after a chord changes.',
  },
  damperPedal: {
    what: 'The right pedal. It lifts every damper off the strings at once, so notes keep ringing.',
    why: 'This is the sustain pedal. It joins notes your hands can’t, but too much turns harmony to mud.',
  },
};

export const GRAND_PIANO_COPY: Readonly<Record<string, TermCopy>> = {
  lid: {
    what: 'The large hinged top, opened to the right of the player.',
    why: 'It throws sound outward, toward the audience. Lower it when playing with singers or at home.',
  },
  propStick: {
    what: 'The stick that holds up the lid. Many grands have a long and a short one.',
    why: 'A shorter prop means a softer, more covered sound. Always check it is seated before you let go.',
  },
  rim: {
    what: 'The thick curved wall of layered wood that gives a grand its shape.',
    why: 'Its stiffness keeps the vibration in the soundboard rather than letting it soak away.',
  },
  hammers: {
    what: 'Felt-covered hammers that strike the strings from below. Gravity brings them back down.',
    why: 'Gravity is quick and even, so a note can be repeated very fast. That is part of a grand’s touch.',
  },
  dampers: {
    what: 'Felt pads resting on the strings from above. A key lifts its damper while you hold it down.',
    why: 'Letting go stops the note. The highest strings have no damper, because they fade so quickly.',
  },
  soundboard: {
    what: 'A large, thin sheet of spruce with ribs across its underside, lying flat beneath the strings.',
    why: 'It is the piano’s speaker. The strings alone are quiet; this is what fills the room.',
  },
  softPedal: {
    what: 'The left pedal, also called una corda. It shifts the whole action sideways.',
    why: 'Each hammer then strikes fewer strings, with softer felt. The sound gets quieter and also changes color.',
  },
  middlePedal: {
    what: 'The middle pedal, or sostenuto. It holds up only the dampers of keys already down.',
    why: 'You can sustain one low note while your hands play on cleanly above it.',
  },
  lyre: {
    what: 'The frame below the keybed that holds the pedals and braces them against your push.',
    why: 'Rods run up inside it from each pedal to the action. A squeak here is an easy repair.',
  },
};

export const UPRIGHT_PIANO_COPY: Readonly<Record<string, TermCopy>> = {
  lid: {
    what: 'The hinged top of the case.',
    why: 'Opening it lets out a little more sound, and it is how a tuner reaches inside.',
  },
  case: {
    what: 'The tall wooden cabinet with sides that hold everything upright.',
    why: 'It stands close to a wall, so its sound reflects back into the room. Keep a small gap behind it.',
  },
  upperPanel: {
    what: 'The removable board above the keys, covering the action and strings.',
    why: 'Lift it off and you can watch the hammers work, which is the best way to understand a piano.',
  },
  lowerPanel: {
    what: 'The removable board below the keys, in front of your knees.',
    why: 'It hides the lower strings and the pedal rods. A tuner takes it off to reach them.',
  },
  backPosts: {
    what: 'Heavy vertical beams across the back of the case.',
    why: 'They take the load of the plate and strings, and they keep the whole piano from twisting.',
  },
  hammers: {
    what: 'Felt-covered hammers that strike the strings from the front. Springs bring them back.',
    why: 'Springs are a little slower than gravity, so fast repeated notes are harder here than on a grand.',
  },
  dampers: {
    what: 'Felt pads pressed against the strings by springs. A key pulls its damper away while you hold it.',
    why: 'Letting go stops the note. The highest strings have no damper, because they fade so quickly.',
  },
  soundboard: {
    what: 'A large, thin sheet of spruce with ribs across its back, standing behind the strings.',
    why: 'It is the piano’s speaker. The strings alone are quiet; this is what fills the room.',
  },
  softPedal: {
    what: 'The left pedal. It moves all the hammers closer to the strings.',
    why: 'A shorter swing means less speed and a quieter note. The sound changes less than on a grand.',
  },
  middlePedal: {
    what: 'The middle pedal. On many uprights it lowers a felt strip in front of the strings as a practice mute.',
    why: 'It varies by model: try it and listen. If it mutes, it is a good way to practice at night.',
  },
};
