import type { Song } from '@/curriculum/types/songLibrary';

export const sweet_pea: Song = {
  id: 'sweet_pea',
  title: 'Sweet Pea',
  artist: 'Amos Lee',
  year: 2006,
  historicalDescription:
    "Amos Lee releases 'Sweet Pea' in 2006, a warm, unhurried love song that showcases his gift for blending soul, folk, and Americana into something quietly affecting. The track captures Lee at his most tender, earning him a devoted following among listeners drawn to his understated, old-soul approach in an era dominated by louder sounds.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],
  releases: [{ releaseId: 'amos-lee-supply-and-demand', track: 7 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '6 dom7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '6 dom7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '3 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '6 dom7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '6 dom7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '6 dom7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
          fermata: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=DR7CMndEuAg' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/amos-lee.webp',
  popularity: 50,
};
