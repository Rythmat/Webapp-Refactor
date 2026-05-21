import type { Song } from '@/curriculum/types/songLibrary';

export const come_away_with_me: Song = {
  id: 'come_away_with_me',
  title: 'Come Away With Me',
  artist: 'Norah Jones',
  year: 2002,
  historicalDescription:
    "Norah Jones releases 'Come Away With Me', the title track of her debut album, introducing a hushed blend of jazz, country, and pop that feels entirely out of step with the era — and becomes a phenomenon because of it. The album sweeps the 2003 Grammy Awards, winning eight trophies including Album of the Year, and Jones becomes one of the best-selling artists of the decade. Her intimate, unhurried style proves there is a vast audience hungry for something quiet.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 82,
  timeSignature: [3, 4],

  difficulty: 2,
  genreTags: ['pop_waltz'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 10,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 10,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }],
          fermata: true,
        },
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=lbjZPFBD6JU' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
