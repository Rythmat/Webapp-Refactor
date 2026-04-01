export const moods = [
  'Happy',
  'Sad',
  'Energetic',
  'Calm',
  'Funky',
  'Mysterious',
  'Epic',
  'Romantic',
];

export const genres = [
  'Pop',
  'Rock',
  'Funk',
  'Jazz',
  'Blues',
  'Reggae',
  'Classical',
  'House',
  'Drum & Bass',
  'Hip Hop',
  'Country',
  'Bossa Nova',
  'Samba',
];

export const keys = [
  'C Major',
  'G Major',
  'D Major',
  'A Major',
  'E Major',
  'B Major',
  'F# Major',
  'C# Major',
  'F Major',
  'Bb Major',
  'Eb Major',
  'Ab Major',
  'A Minor',
  'E Minor',
  'B Minor',
  'F# Minor',
  'C# Minor',
  'G# Minor',
  'D# Minor',
  'A# Minor',
  'D Minor',
  'G Minor',
  'C Minor',
  'F Minor',
];

export const moodPromptBuilder = (
  mood: string,
  genre: string,
  key: string,
): string => {
  if (!mood && !genre && !key) return '';

  let prompt = 'Create a track';
  if (genre) prompt += ` in the style of ${genre}`;
  if (key) prompt += ` in the key of ${key}`;
  if (mood) prompt += ` that feels ${mood.toLowerCase()}`;

  switch (mood) {
    case 'Happy':
      prompt +=
        '. Use an upbeat tempo and a major key progression like I-V-vi-IV.';
      break;
    case 'Sad':
      prompt +=
        '. Use a slow tempo and a minor key progression like i-VI-III-VII.';
      break;
    case 'Energetic':
      prompt +=
        '. Use a fast tempo, driving rhythms, and maybe some syncopation.';
      break;
    case 'Calm':
      prompt +=
        '. Use a slow tempo, simple melodies, and soft-sounding instruments like keys or synth pads.';
      break;
    case 'Funky':
      prompt +=
        '. Use a syncopated 16th-note bassline and a classic funk drum beat.';
      break;
    case 'Mysterious':
      prompt +=
        '. Use a minor key, perhaps with some diminished or augmented chords to create tension.';
      break;
    case 'Epic':
      prompt +=
        '. Use powerful chords, maybe some orchestral elements, and a build-up in intensity.';
      break;
    case 'Romantic':
      prompt +=
        '. Use a slow to medium tempo, lush chords with 7ths, and a smooth melody.';
      break;
  }

  return prompt;
};
