import type { Song } from '@/curriculum/types/songLibrary';

export const cant_buy_me_love: Song = {
  id: 'cant_buy_me_love',
  title: 'Can’t Buy Me Love',
  artist: 'The Beatles',
  year: 1964,
  historicalDescription:
    "The Beatles release 'Can't Buy Me Love' in 1964, and it becomes a global phenomenon — advance orders alone make it one of the fastest-selling singles in history. With its driving rhythm and McCartney's exuberant lead vocal, the song captures the full force of Beatlemania at its peak, cementing the band's dominance on both sides of the Atlantic.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 170,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 7',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 8',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_4',
      label: 'Chorus 4',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 9',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 maj/3', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_10',
      label: 'Verse 10',
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/3', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 maj/3', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/3', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_11',
      label: 'Verse 11',
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '♯1 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'Bmin7', beat: 3, duration: 1 },
            { degree: '2 maj/3', chordName: 'D/E', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 maj/6', chordName: 'D/A', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
          fermata: true,
        },
      ],
    },
    {
      id: 'verse_12',
      label: 'Verse 12',
      bars: [
        {
          chords: [
            { degree: '1 7/3', chordName: 'C7/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'C/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7/3', chordName: 'C7/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'C/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_13',
      label: 'Verse 13',
      bars: [
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=srwxJUXPHvE' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-beatles.webp',
  popularity: 50,
};
