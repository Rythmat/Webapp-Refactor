import type { Song } from '@/curriculum/types/songLibrary';

export const luck_be_a_lady: Song = {
  id: 'luck_be_a_lady',
  title: 'Luck Be A Lady',
  artist: 'Frank Sinatra',
  year: 1963,
  historicalDescription:
    "Frank Sinatra performs 'Luck Be A Lady', the showstopping number from Frank Loesser's Broadway musical Guys and Dolls. Originally written for the 1950 stage production, the song becomes indelibly associated with Sinatra — a swaggering, big-band declaration that captures his persona as the ultimate ring-a-ding Chairman of the Board at his most theatrically commanding.",
  key: 'D♭ mixolydian',
  keyRoot: 61,
  mode: 'mixolydian',
  tempo: 155,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['jazz'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '♯4 dim7', chordName: 'Gdim7', beat: 2, duration: 1 },
            { degree: '1 maj/5', chordName: 'D♭/A♭', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'G♭', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '♯4 dim7', chordName: 'Gdim7', beat: 2, duration: 1 },
            { degree: '1 maj/5', chordName: 'D♭/A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '7 dom7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♯5 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 7',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 8',
      bars: [
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 9',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_10',
      label: 'Verse 10',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '♯2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♯5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♯5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯5 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_11',
      label: 'Verse 11',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=X69P_Vce9vw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/frank-sinatra.webp',
  popularity: 50,
};
