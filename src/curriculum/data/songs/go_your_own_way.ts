import type { Song } from '@/curriculum/types/songLibrary';

export const go_your_own_way: Song = {
  id: 'go_your_own_way',
  title: 'Go Your Own Way',
  artist: 'Fleetwood Mac',
  year: 1976,
  historicalDescription:
    "Lindsey Buckingham writes 'Go Your Own Way' amid the romantic collapse at the heart of Fleetwood Mac — his breakup with Stevie Nicks unfolding in real time as the band records what will become Rumours. The song's driving guitars and raw emotional confrontation capture a band somehow turning private devastation into public triumph, making Rumours one of the best-selling albums in history.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 135,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    {
      name: 'Fleetwood Mac',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'fleetwood-mac',
    },
    {
      name: 'Richard Dashut',
      role: 'producer',
      artistGlobeId: 'richard-dashut',
    },
    {
      name: 'Mick Fleetwood',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'mick-fleetwood',
    },
    {
      name: 'Mick Fleetwood',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'mick-fleetwood',
    },
    {
      name: 'Christine McVie',
      role: 'performer',
      artistGlobeId: 'christine-mcvie',
    },
    {
      name: 'Richard Dashut',
      role: 'engineer',
      artistGlobeId: 'richard-dashut',
    },
    {
      name: 'Lindsey Buckingham',
      role: 'songwriter',
      artistGlobeId: 'lindsey-buckingham',
    },
    { name: 'Ken Caillat', role: 'engineer', artistGlobeId: 'ken-caillat' },
    { name: 'Ken Caillat', role: 'producer', artistGlobeId: 'ken-caillat' },
    {
      name: 'Christine McVie',
      role: 'vocals',
      artistGlobeId: 'christine-mcvie',
    },
    {
      name: 'Lindsey Buckingham',
      role: 'vocals',
      artistGlobeId: 'lindsey-buckingham',
    },
    {
      name: 'Lindsey Buckingham',
      role: 'performer',
      artistGlobeId: 'lindsey-buckingham',
    },
    {
      name: 'John McVie',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'john-mcvie',
    },
    { name: 'Stevie Nicks', role: 'vocals', artistGlobeId: 'stevie-nicks' },
    {
      name: 'Christine McVie',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'christine-mcvie',
    },
  ],
  releases: [{ releaseId: 'fleetwood-mac-rumours' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 2 }],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=oiosqtFLBBA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/fleetwood-mac.webp',
  popularity: 50,
};
