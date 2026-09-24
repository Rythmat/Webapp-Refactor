import type { Song } from '@/curriculum/types/songLibrary';

export const what_a_wonderful_world: Song = {
  id: 'what_a_wonderful_world',
  title: 'What A Wonderful World',
  artist: 'Louis Armstrong',
  year: 1967,
  historicalDescription:
    "Louis Armstrong records 'What A Wonderful World' in 1967, a tender jazz ballad that stands in quiet defiance of the turbulence tearing through American society. His gravelly, weathered voice transforms a simple hymn to beauty into something profound — a reminder that joy and grace still exist amid war and civil unrest. The song becomes one of the most beloved recordings in popular music history.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 220,
  timeSignature: [6, 8],

  difficulty: 3,
  genreTags: ['jazz'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '5 7', chordName: 'C7sus4', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '5 7', chordName: 'C7sus4', beat: 1, duration: 6 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '3 7', chordName: 'A7b9', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 6 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'C7sus4', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '♯1 dim7', chordName: 'F♯dim7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '3 7', chordName: 'A7b9', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 6 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'C7sus4', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '5 7', chordName: 'C7sus4', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '♯1 dim7', chordName: 'F♯dim7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '3 7', chordName: 'A7b9', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 6 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'C7sus4', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'F/E♭', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'D7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '6 7', chordName: 'D7', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=rBrd_3VMC3c' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/louis-armstrong.webp',
  popularity: 50,
};
