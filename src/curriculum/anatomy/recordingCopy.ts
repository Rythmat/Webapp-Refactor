// ── What each part means in a recording ────────────────────────────────────
// The lesson's plain copy says what a part is. This is what to do about it in a
// session. Only the microphone has it so far: the other models get theirs as their
// lessons move into the Audio courses.

export const MIC_RECORDING_COPY: Readonly<Record<string, string>> = {
  grille:
    'Distance starts here. Close to the grille means more level and, on most mics like this, more bass.',
  grilleBand:
    'Keep hands and stands off it. A knock here goes straight into the take.',
  windscreen:
    'Foam helps, but a close vocal still wants a pop filter: a P can thump and even clip.',
  capsule:
    'Most mics like this hear best from the front, so aim the back at whatever you want less of.',
  diaphragm:
    'Heavier than a condenser’s, which is why dynamics take loud drums and amps so well.',
  voiceCoil:
    'Its output is only a few millivolts, so this mic needs plenty of preamp gain.',
  magnet: 'This mic makes its own signal, so it doesn’t need phantom power.',
  shockMount:
    'It helps, but a bump on the stand still gets in. Keep feet off the stand during takes.',
  handle:
    'On a stand, tighten the clip. A mic that slowly droops changes the sound through the take.',
  switch:
    'No signal in a session? After checking this, check the cable, then the preamp.',
  xlrPins: 'Balanced wiring is why a long run to the interface can stay quiet.',
  xlrConnector:
    'If a channel crackles, swap the cable before you touch anything else.',
  cable:
    'Keep it clear of power leads. If they have to cross, cross them at right angles.',
};
