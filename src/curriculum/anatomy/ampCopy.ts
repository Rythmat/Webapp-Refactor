import type { TermCopy } from './anatomyCopy';

// ── What each word means, on a combo amp ───────────────────────────────────
// What is true of both, then each one's own: the difference between them is how
// they make the signal bigger.

export const AMP_COPY: Readonly<Record<string, TermCopy>> = {
  cabinet: {
    what: 'The wooden box that holds the amp and the speaker together. That is what makes it a combo.',
    why: 'The box shapes the sound as well as carrying it: its size and wood change how the low end feels.',
  },
  grille: {
    what: 'The cloth across the front, thin enough for sound to pass through.',
    why: 'It protects the delicate speaker cone from knocks and from cables swinging into it.',
  },
  baffle: {
    what: 'The solid board the speaker is bolted to, with a round hole for it.',
    why: 'It separates the sound from the front of the cone and the back, which would otherwise cancel each other out.',
  },
  backPanel: {
    what: 'The boards across the back. This cabinet is open in the middle, between them.',
    why: 'Open backs let sound out behind the amp too, for a wider feel. Closed backs give a tighter low end.',
  },
  handle: {
    what: 'The strap on top for carrying it.',
    why: 'Amps are heavy for their size, so lift with your legs and keep the amp close to you.',
  },
  feet: {
    what: 'Small rubber feet under the cabinet.',
    why: 'They keep the amp from buzzing on a hard floor. Raising an amp off the floor also tends to thin its bass.',
  },
  controlPanel: {
    what: 'The plate along the top of the front that holds the jack, knobs and switches.',
    why: 'Read it left to right: most panels follow the signal, from the input through to the master controls.',
  },
  inputJack: {
    what: 'The socket your instrument’s cable plugs into. The signal starts here.',
    why: 'Turn the volume down before plugging in or unplugging, to avoid a loud pop through the speaker.',
  },
  volumeKnob: {
    what: 'The knob that sets how much signal goes on through the amp.',
    why: 'Start low and raise it slowly. Protect your hearing, especially in a small room.',
  },
  toneKnobs: {
    what: 'Bass, middle and treble: three knobs that shape the balance of the sound.',
    why: 'Start with them all at noon, then change one at a time and listen.',
  },
  reverbKnob: {
    what: 'The knob that adds the sense of a bigger room around your sound.',
    why: 'A little goes a long way. Too much can blur your notes, particularly with a band.',
  },
  powerSwitch: {
    what: 'The switch that turns the amp on and off.',
    why: 'Turn the volume down first, and turn the amp off before moving it or unplugging the speaker.',
  },
  pilotLight: {
    what: 'A small lamp that shows the amp is on.',
    why: 'If the light is on and there is no sound, check your cable and the volume knobs first.',
  },
  speaker: {
    what: 'The part that turns the amp’s signal back into moving air: a magnet, a coil, and a paper cone in a metal frame.',
    why: 'It shapes your tone as much as the amp does. Changing a speaker can transform an amp.',
  },
  cone: {
    what: 'The large paper cone that pushes the air.',
    why: 'It is what you actually hear. Keep sharp objects away: a torn cone rattles and buzzes.',
  },
  dustCap: {
    what: 'The small dome at the center of the cone.',
    why: 'It keeps dust out of the narrow gap around the voice coil, and it helps shape the highs.',
  },
  voiceCoil: {
    what: 'A coil of wire fixed to the back of the cone, sitting in the magnet’s field.',
    why: 'The amp’s signal runs through it and pushes against the magnet, and that moves the cone.',
  },
  magnet: {
    what: 'The heavy magnet at the back of the speaker.',
    why: 'It is why amps are so heavy, and its size and type are a big part of a speaker’s character.',
  },
  speakerCable: {
    what: 'The lead that carries the amplified signal from the chassis to the speaker.',
    why: 'Never use an instrument cable for this job: speaker cables are made for the much stronger signal.',
  },
  chassis: {
    what: 'The metal tray holding the electronics, bolted inside the top of the cabinet.',
    why: 'Don’t open it yourself. Even unplugged, parts inside can hold a dangerous charge. That is a job for a technician.',
  },
  powerTransformer: {
    what: 'The heavy block that converts wall power into the voltages the amp needs.',
    why: 'Plug only into the right voltage for your amp. Travel adapters can damage it.',
  },
  filterCaps: {
    what: 'Large capacitors that smooth the power supply so that it stays steady.',
    why: 'They can hold a dangerous charge long after unplugging. A hum that grows with age often traces back to them.',
  },
};

export const TUBE_AMP_COPY: Readonly<Record<string, TermCopy>> = {
  preampTubes: {
    what: 'Small glass vacuum tubes that take the tiny signal from your instrument and make it much stronger.',
    why: 'Push them hard and they start to distort smoothly. That is much of the classic overdriven sound.',
  },
  powerTubes: {
    what: 'The larger tubes that make the signal strong enough to drive a speaker.',
    why: 'They wear out and are replaced in matched sets. They run very hot, so let them cool before touching.',
  },
  outputTransformer: {
    what: 'The block that matches the tubes’ high voltage to the speaker’s much lower impedance.',
    why: 'Never run a tube amp without a speaker connected: the output transformer can be damaged.',
  },
  reverbTank: {
    what: 'A long metal pan holding real springs. The signal shakes them, and they ring on.',
    why: 'Bump the amp and you will hear them crash. Carry a tube amp gently when it’s on.',
  },
  standbySwitch: {
    what: 'A second switch that keeps the speaker silent while the tubes warm up.',
    why: 'Give it a minute or so after power-on. Tubes need to warm up before they can work at all.',
  },
  chassis: {
    what: 'The metal tray holding the electronics, with the tubes hanging down from it.',
    why: 'Don’t open it yourself. Tube amps run on very high voltages, and parts inside can hold a deadly charge even unplugged.',
  },
  cabinet: {
    what: 'The wooden box that holds the amp and the speaker together. That is what makes it a combo.',
    why: 'Tubes run hot and need air, so leave space behind it and don’t cover its back.',
  },
};

export const SOLID_STATE_AMP_COPY: Readonly<Record<string, TermCopy>> = {
  circuitBoard: {
    what: 'The board that does the preamp’s work with small chips and transistors, instead of tubes.',
    why: 'There is nothing here to warm up or wear out quickly, which is why these amps are so reliable.',
  },
  powerTransistors: {
    what: 'The parts that do the final, heavy lifting, making the signal strong enough to drive a speaker.',
    why: 'They stay clean to high volumes, then clip abruptly. That is why many players add a pedal for dirt.',
  },
  heatSink: {
    what: 'A block of metal fins that draws heat away from the transistors.',
    why: 'Keep the amp’s vents clear. Overheating is one of the main things that can harm it.',
  },
  chassis: {
    what: 'The metal tray holding the circuit board, transistors and power supply.',
    why: 'Don’t open it yourself. Wall voltage and stored charge inside can still be dangerous.',
  },
  reverbKnob: {
    what: 'The knob that adds the sense of a bigger room. On many of these amps it is made digitally.',
    why: 'A little goes a long way. Too much can blur your notes, particularly with a band.',
  },
  powerSwitch: {
    what: 'The switch that turns the amp on, with no warm-up needed.',
    why: 'Turn the volume down first, and turn the amp off before moving it or unplugging the speaker.',
  },
  speakerCable: {
    what: 'The lead that carries the amplified signal directly from the transistors to the speaker.',
    why: 'Never use an instrument cable for this job: speaker cables are made for the much stronger signal.',
  },
};
