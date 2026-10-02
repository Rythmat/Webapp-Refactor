import type { Song } from '@/curriculum/types/songLibrary';

export const dreams: Song = {
  id: 'dreams',
  title: 'Dreams',
  artist: 'Fleetwood Mac',
  year: 1977,
  historicalDescription:
    "Fleetwood Mac releases 'Dreams' from their landmark album Rumours, the only song on that record written solely by Stevie Nicks. Recorded amid the romantic collapse of multiple band members, it becomes the group's sole US number one single — a haunting meditation on heartbreak wrapped in deceptively smooth California rock.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    {
      name: 'Richard Dashut',
      role: 'engineer',
      artistGlobeId: 'richard-dashut',
    },
    {
      name: 'Mick Fleetwood',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'mick-fleetwood',
    },
    {
      name: 'Richard Dashut',
      role: 'producer',
      artistGlobeId: 'richard-dashut',
    },
    { name: 'Ken Caillat', role: 'engineer', artistGlobeId: 'ken-caillat' },
    { name: 'Ken Caillat', role: 'producer', artistGlobeId: 'ken-caillat' },
    {
      name: 'John McVie',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'john-mcvie',
    },
    { name: 'Stevie Nicks', role: 'vocals', artistGlobeId: 'stevie-nicks' },
    { name: 'Stevie Nicks', role: 'songwriter', artistGlobeId: 'stevie-nicks' },
    {
      name: 'Christine McVie',
      role: 'performer',
      artistGlobeId: 'christine-mcvie',
    },
    {
      name: 'Mick Fleetwood',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'mick-fleetwood',
    },
    {
      name: 'Fleetwood Mac',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'fleetwood-mac',
    },
    {
      name: 'Lindsey Buckingham',
      role: 'performer',
      artistGlobeId: 'lindsey-buckingham',
    },
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
      name: 'Christine McVie',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'christine-mcvie',
    },
  ],
  releases: [{ releaseId: 'fleetwood-mac-rumours' }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Y3ywicffOj4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/fleetwood-mac.webp',
  popularity: 50,
};
