import type { Song } from '@/curriculum/types/songLibrary';

export const joy_inside_my_tears: Song = {
  id: 'joy_inside_my_tears',
  title: 'Joy Inside My Tears',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'Joy Inside My Tears' as the closing track of Songs in the Key of Life, his sweeping double album that arrives in 1976 as a landmark of Black American music. The song distills the album's emotional core — grief and gratitude held in the same breath — and helps cement Wonder's place as one of the most complete artist-composers of his generation.",
  key: 'B major',
  keyRoot: 71,
  mode: 'major',
  tempo: 50,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    { name: 'Stevie Wonder', role: 'producer', artistGlobeId: 'stevie-wonder' },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'synth-bass',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    {
      name: 'Stevie Wonder',
      role: 'songwriter',
      artistGlobeId: 'stevie-wonder',
    },
    {
      name: 'Stevie Wonder',
      role: 'vocals',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    {
      name: 'Susaye Greene',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'susaye-greene',
    },
    { name: 'Greg Phillinganes', role: 'performer' },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'Stevie Wonder', role: 'arranger', artistGlobeId: 'stevie-wonder' },
  ],
  releases: [{ releaseId: 'stevie-wonder-songs-in-the-key-of-life' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'D♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭7 dom7', chordName: 'A7', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'E/B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'D♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭7 dom7', chordName: 'A7', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '1 dom7', chordName: 'B7sus', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 dom7', chordName: 'G♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'D♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭7 dom7', chordName: 'A7', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'E/B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'D♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭7 dom7', chordName: 'A7', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 7',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'D♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭7 dom7', chordName: 'A7', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'E/B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'D♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭7 dom7', chordName: 'A7', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 8',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 2, duration: 1 },
            { degree: '7 min7', chordName: 'A♯min7', beat: 3, duration: 1 },
            { degree: '3 min7', chordName: 'D♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭7 dom7', chordName: 'A7', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'E/B', beat: 3, duration: 2 },
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
            { degree: '♭7 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Ecl4I_5ZLgk' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
