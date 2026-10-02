import type { Song } from '@/curriculum/types/songLibrary';

export const rainy_days_and_mondays: Song = {
  id: 'rainy_days_and_mondays',
  title: 'Rainy Days And Mondays',
  artist: 'The Carpenters',
  year: 1971,
  historicalDescription:
    "The Carpenters release 'Rainy Days And Mondays', a melancholy pop ballad that becomes one of their signature hits. Karen Carpenter's warm, aching contralto transforms a simple lyric about loneliness into something deeply universal — capturing a mood that millions recognize instantly. The song cements the duo's place as the defining voice of early 1970s soft pop.",
  key: 'E♭ major',
  keyRoot: 63,
  mode: 'major',
  tempo: 74,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],
  session: { studioId: 'a-m-studios' },
  credits: [
    {
      name: 'Richard Carpenter',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'richard-carpenter',
    },
    {
      name: 'Richard Carpenter',
      role: 'performer',
      artistGlobeId: 'richard-carpenter',
    },
    {
      name: 'Jack Daugherty',
      role: 'producer',
      artistGlobeId: 'jack-daugherty',
    },
    { name: 'Hal Blaine', role: 'performer', instrument: 'drum-kit' },
    {
      name: 'Richard Carpenter',
      role: 'arranger',
      artistGlobeId: 'richard-carpenter',
    },
    {
      name: 'Karen Carpenter',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    { name: 'Joe Osborn', role: 'performer', instrument: 'electric-bass' },
    { name: 'Ray Gerhardt', role: 'engineer' },
    {
      name: 'Paul Williams',
      role: 'songwriter',
      artistGlobeId: 'paul-williams-us-songwriter-soft-rock-vocalist',
    },
    {
      name: 'Roger Nichols',
      role: 'songwriter',
      artistGlobeId: 'roger-nichols',
    },
    { name: 'Tommy Morgan', role: 'performer', instrument: 'harmonica' },
    {
      name: 'Bob Messenger',
      role: 'performer',
      artistGlobeId: 'bob-messenger',
    },
  ],
  releases: [{ releaseId: 'the-carpenters-carpenters', track: 1 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '3 min7/5', chordName: 'Gmin7/B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 maj/5', chordName: 'E♭/B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7/7', chordName: 'Gmin7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '3 min7/5', chordName: 'Gmin7/B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '3 min7/5', chordName: 'Gmin7/B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7/7', chordName: 'Gmin7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '3 min7/5', chordName: 'Gmin7/B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '3 min7/5', chordName: 'Gmin7/B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/♯5', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '3 dom7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'B♭7', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7/7', chordName: 'Gmin7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '3 min7/5', chordName: 'Gmin7/B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '3 min7/5', chordName: 'Gmin7/B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/♯5', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 7',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '3 dom7', chordName: 'G7', beat: 3, duration: 2 },
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
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'B♭7', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '♯4 min7/♯1',
              chordName: 'Amin7/E',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Amin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '7 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 8',
      bars: [
        {
          chords: [
            { degree: '7 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7/6', chordName: 'Gmin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7/6', chordName: 'Amin7/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/♯6', chordName: 'A/C♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 1 },
            { degree: '2 maj/♯4', chordName: 'F/A', beat: 2, duration: 1 },
            { degree: '3 min7/6', chordName: 'Gmin7/C', beat: 3, duration: 2 },
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
            { degree: '♯4 min7/6', chordName: 'Amin7/C', beat: 1, duration: 2 },
            { degree: '3 min7/6', chordName: 'Gmin7/C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7/6', chordName: 'Amin7/C', beat: 1, duration: 2 },
            { degree: '3 min7/6', chordName: 'Gmin7/C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7/6', chordName: 'Amin7/C', beat: 1, duration: 2 },
            { degree: '3 min7/6', chordName: 'Gmin7/C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'F', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=PjFoQxjgbrs' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-carpenters.webp',
  popularity: 50,
};
