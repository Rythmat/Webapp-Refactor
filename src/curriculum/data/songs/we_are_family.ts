import type { Song } from '@/curriculum/types/songLibrary';

export const we_are_family: Song = {
  id: 'we_are_family',
  title: 'We Are Family',
  artist: 'Sister Sledge',
  year: 1979,
  historicalDescription:
    "Sister Sledge releases 'We Are Family', a disco anthem that becomes one of the genre's defining moments. Written and produced by Nile Rodgers and Bernard Edwards of Chic, its irresistible groove and empowering message transcend the dancefloor — becoming a rallying cry for unity adopted by sports teams, civil rights movements, and celebrations worldwide.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 116,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['disco'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      repeatCount: 8,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 6,
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=uyGY2NfYpeE' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
