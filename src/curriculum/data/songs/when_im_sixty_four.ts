import type { Song } from '@/curriculum/types/songLibrary';

export const when_im_sixty_four: Song = {
  id: 'when_im_sixty_four',
  title: 'When I’m Sixty-Four',
  artist: 'The Beatles',
  year: 1967,
  historicalDescription:
    "The Beatles release 'When I'm Sixty-Four' on Sgt. Pepper's Lonely Hearts Club Band, one of the most celebrated albums in rock history. Paul McCartney's whimsical, music-hall-flavored number — originally sketched in his teenage years — stands apart from the album's psychedelic grandeur, nodding instead to the pre-rock British pop his father's generation adored. It proves the Beatles can inhabit any era, any mood, any genre.",
  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 140,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'abbey-road-studios' },
  credits: [
    {
      name: 'Paul McCartney',
      role: 'performer',
      artistGlobeId: 'paul-mccartney',
    },
    { name: 'Ringo Starr', role: 'performer' },
    {
      name: 'Paul McCartney',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'paul-mccartney',
    },
    { name: 'John Lennon', role: 'songwriter', artistGlobeId: 'john-lennon' },
    { name: 'Ringo Starr', role: 'performer', instrument: 'drum-kit' },
    {
      name: 'John Lennon',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'john-lennon',
    },
    { name: 'Dave Harries', role: 'engineer', artistGlobeId: 'dave-harries' },
    {
      name: 'Paul McCartney',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'paul-mccartney',
    },
    { name: 'Paul McCartney', role: 'vocals', artistGlobeId: 'paul-mccartney' },
    {
      name: 'Paul McCartney',
      role: 'songwriter',
      artistGlobeId: 'paul-mccartney',
    },
    {
      name: 'George Harrison',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    { name: 'Geoff Emerick', role: 'engineer' },
    {
      name: 'John Lennon',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'john-lennon',
    },
    { name: 'George Martin', role: 'producer' },
    { name: 'Robert Burns', role: 'performer', instrument: 'clarinet' },
    { name: 'Frank Reidy', role: 'performer', instrument: 'clarinet' },
    { name: 'Dave Harries', role: 'producer', artistGlobeId: 'dave-harries' },
    {
      name: 'Paul McCartney',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'paul-mccartney',
    },
    { name: 'Henry McKenzie', role: 'performer', instrument: 'clarinet' },
  ],
  releases: [{ releaseId: 'the-beatles-sgt-peppers-lonely-hearts-club-band' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
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
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'D♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '♯4 dim7', chordName: 'Gdim7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'D♭/A♭', beat: 1, duration: 2 },
            { degree: '6 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'E♭7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'A♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
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
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
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
        {
          chords: [
            { degree: '3 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'B♭min7', beat: 2, duration: 1 },
            { degree: '3 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'B♭min7', beat: 2, duration: 1 },
            { degree: '3 maj', chordName: 'F', beat: 3, duration: 2 },
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
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'A♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
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
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'D♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 7',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '♯4 dim7', chordName: 'Gdim7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'D♭/A♭', beat: 1, duration: 2 },
            { degree: '6 dom7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'E♭7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'A♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=wUDRIC5RSX4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-beatles.webp',
  popularity: 50,
};
