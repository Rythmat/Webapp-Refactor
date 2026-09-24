import type { Song } from '@/curriculum/types/songLibrary';

export const tequila: Song = {
  id: 'tequila',
  title: 'Tequila',
  artist: 'The Champs',
  year: 1958,
  historicalDescription:
    "The Champs record 'Tequila,' an infectious instrumental built around a rolling sax riff and a single shouted word. The track becomes a massive hit in 1958, crossing genre lines and introducing a Latin swagger into the mainstream American sound. Its irresistible groove makes it one of the most recognizable instrumentals in rock history.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 163,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 4 },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 dim7', chordName: 'F dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 dim7', chordName: 'F dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 dim7', chordName: 'F dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 dim7', chordName: 'F dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 dim7', chordName: 'F dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 dim7', chordName: 'F dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=U_JFLb1IItM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-champs.webp',
  popularity: 50,
};
