import type { TermCopy } from './anatomyCopy';

// ── What each word means, on the gear every musician uses ──────────────────

export const HEADPHONES_COPY: Readonly<Record<string, TermCopy>> = {
  headband: {
    what: 'The arch across the top of your head, which holds the two cups together.',
    why: 'Its gentle clamping force is what you feel after an hour. Comfort matters as much as sound in long sessions.',
  },
  cushion: {
    what: 'The soft padding under the band.',
    why: 'It spreads the weight across your head, so no single spot gets sore.',
  },
  slider: {
    what: 'The sliding arms at each end of the band, usually with clicks you can count.',
    why: 'Set them so the cups center on your ears. Note the click count and you can match both sides.',
  },
  yoke: {
    what: 'The forks that hold each cup at two pivots.',
    why: 'They let the cups tilt to fit the shape of your head, which keeps the seal even.',
  },
  pad: {
    what: 'The soft rings that sit around your ears and seal against your head.',
    why: 'That seal holds in the low end. If the bass seems thin, check that hair or glasses aren’t breaking it.',
  },
  baffle: {
    what: 'The perforated plate that holds the driver and faces your ear.',
    why: 'It protects the delicate driver, and its holes let the sound through.',
  },
  shell: {
    what: 'The hard outer cups. This pair is closed-back, so the outsides are solid.',
    why: 'Closed backs keep sound from leaking into a microphone, which makes them the choice for recording.',
  },
  driver: {
    what: 'The tiny speaker in each cup: a magnet, a coil of wire and a thin diaphragm.',
    why: 'The audio signal in the coil pushes against the magnet, which moves the diaphragm and makes sound.',
  },
  diaphragm: {
    what: 'A very thin, light dome that moves back and forth to push the air.',
    why: 'Lighter means quicker, which is how it can follow the fastest details in the music.',
  },
  voiceCoil: {
    what: 'A coil of fine wire glued to the diaphragm, sitting in the magnet’s field.',
    why: 'The music arrives here as electricity. The coil turns it into motion.',
  },
  magnet: {
    what: 'A strong permanent magnet behind the coil.',
    why: 'The coil pushes against its field. A dynamic microphone uses the very same parts in reverse.',
  },
  wire: {
    what: 'The thin wire inside the band that carries the signal from one cup to the other.',
    why: 'This is why a cable can plug into just one side and still reach both ears.',
  },
  cable: {
    what: 'The lead that carries the signal from your device to the cups.',
    why: 'Coil it loosely, and pull on the plug rather than the wire. Most headphone failures are cable failures.',
  },
  plug: {
    what: 'A stereo plug: the tip carries the left channel, the ring the right, the sleeve the shared return.',
    why: 'Those metal bands are why a half-inserted plug can make sound vanish from one ear.',
  },
};

export const MICROPHONE_COPY: Readonly<Record<string, TermCopy>> = {
  grille: {
    what: 'The round wire-mesh ball at the top, which protects everything inside.',
    why: 'Sing into the front. Cupping your hand around it blocks the sound path and invites feedback.',
  },
  grilleBand: {
    what: 'The solid ring around the grille, joining its parts and screwing it onto the handle.',
    why: 'Unscrew it to wash the grille and foam, which is well worth doing with a shared microphone.',
  },
  windscreen: {
    what: 'A layer of foam just inside the grille.',
    why: 'It softens the blasts of air on sounds like P and B, so they don’t thump through the speakers.',
  },
  capsule: {
    what: 'The working heart of the microphone: a diaphragm, a voice coil and a magnet.',
    why: 'It turns sound in the air into an electrical signal. This design is called dynamic.',
  },
  diaphragm: {
    what: 'A thin, light dome that moves when sound waves reach it.',
    why: 'It copies the movement of the air, so everything else depends on how well it follows your voice.',
  },
  voiceCoil: {
    what: 'A coil of very fine wire fixed to the back of the diaphragm.',
    why: 'As it moves with the diaphragm through the magnet’s field, a tiny current appears in it: your voice as electricity.',
  },
  magnet: {
    what: 'A strong magnet that the coil moves within.',
    why: 'Moving a wire through a magnetic field makes a current, and that is why a dynamic microphone needs no power.',
  },
  shockMount: {
    what: 'A soft rubber cup that the capsule sits in, inside the handle.',
    why: 'It keeps handling noise from reaching the capsule, though a tight, still grip helps too.',
  },
  handle: {
    what: 'The tapered metal body you hold, which houses the wiring.',
    why: 'Hold it near the middle, not by the grille, and keep it pointing at your mouth.',
  },
  switch: {
    what: 'A slider that turns the signal on and off. Many microphones don’t have one.',
    why: 'If a microphone is silent, check this first. It is the most common cause on stage.',
  },
  xlrPins: {
    what: 'Three metal pins in the base: one ground, and two carrying the signal in opposite polarity.',
    why: 'Comparing those two signals cancels noise picked up along the cable, so long runs stay quiet.',
  },
  xlrConnector: {
    what: 'The locking plug on the end of the cable, which clicks onto the pins.',
    why: 'Press the latch to release it, and pull on the connector rather than on the cable.',
  },
  cable: {
    what: 'The shielded lead that carries the tiny signal to a mixer or an interface.',
    why: 'That signal is weak, so it needs a preamp to bring it up. Coil the cable loosely so it lasts.',
  },
};
