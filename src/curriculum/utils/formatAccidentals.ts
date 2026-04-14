/**
 * Converts ASCII accidentals to Unicode symbols in musical display strings.
 * Pattern [A-G]b → [A-G]♭ and [A-G]# → [A-G]♯.
 *
 * Safe for pitch names ("Eb4"→"E♭4") and chord symbols ("Bbmaj7"→"B♭maj7").
 * Do NOT apply to prose text — false positive risk: "Above" contains "Ab".
 */
export const formatAccidentalsForDisplay = (s: string): string =>
  s.replace(/([A-G])b/g, '$1♭').replace(/([A-G])#/g, '$1♯');
