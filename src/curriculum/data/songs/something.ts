import type { Song } from '@/curriculum/types/songLibrary';

export const something: Song = {
  id: 'something',
  title: 'Something',
  artist: 'The Beatles',
  composer: 'George Harrison',
  year: 1969,
  historicalDescription:
    "George Harrison's 'Something' appears on Abbey Road, becoming the first Harrison composition to lead a Beatles single. Frank Sinatra later calls it the greatest love song of the past fifty years — a remarkable vindication for the Beatle long overshadowed by Lennon and McCartney. It signals Harrison's full arrival as a songwriter of the highest order.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 65,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],

  session: {
    studio: 'Abbey Road Studios',
    city: 'London',
    country: 'UK',
    label: 'Apple',
    recordedYear: 1969,
  },
  credits: [
    { name: 'George Harrison', role: 'vocals', primary: true },
    {
      name: 'George Harrison',
      role: 'performer',
      instrument: 'electric-guitar',
    },
    { name: 'John Lennon', role: 'performer', instrument: 'piano' },
    { name: 'Paul McCartney', role: 'performer', instrument: 'electric-bass' },
    { name: 'Paul McCartney', role: 'vocals' },
    { name: 'Ringo Starr', role: 'performer', instrument: 'drum-kit' },
    { name: 'Billy Preston', role: 'performer', instrument: 'hammond-organ' },
    { name: 'George Martin', role: 'producer' },
  ],
  relatedRecordings: [
    { artist: 'Frank Sinatra', year: 1970, relation: 'cover' },
    { artist: 'Joe Cocker', year: 1969, relation: 'cover' },
  ],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/3', chordName: 'F/E', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '2 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '5 maj/7', chordName: 'G/B', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 1 },
            {
              degree: '6 min7/♯5',
              chordName: 'Amin7/G♯',
              beat: 2,
              duration: 1,
            },
            { degree: '6 min7/5', chordName: 'Amin7/G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj/♯5', chordName: 'E/G♯', beat: 1, duration: 2 },
            { degree: '♯4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '♯4 min7/3',
              chordName: 'F♯min7/E',
              beat: 1,
              duration: 2,
            },
            { degree: '2 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj/♯5', chordName: 'E/G♯', beat: 1, duration: 2 },
            { degree: '♯4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '♯4 min7/3',
              chordName: 'F♯min7/E',
              beat: 1,
              duration: 2,
            },
            { degree: '2 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/3', chordName: 'F/E', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '2 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '5 maj/7', chordName: 'G/B', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 1 },
            {
              degree: '6 min7/♯5',
              chordName: 'Amin7/G♯',
              beat: 2,
              duration: 1,
            },
            { degree: '6 min7/5', chordName: 'Amin7/G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=UelDrZ1aFeY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-beatles.webp',
  popularity: 50,
};
