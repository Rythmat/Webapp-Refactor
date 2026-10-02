import type { Song } from '@/curriculum/types/songLibrary';

export const the_chain: Song = {
  id: 'the_chain',
  title: 'The Chain',
  artist: 'Fleetwood Mac',
  year: 1977,
  historicalDescription:
    "Fleetwood Mac releases 'The Chain' on their landmark album Rumours, recorded amid the simultaneous romantic breakdowns of multiple band members. The song is the only track on Rumours credited to all five members, its tension and defiance mirroring the fractured relationships that fuel the entire record. It becomes one of their most enduring anthems — a testament to the band's refusal to dissolve despite the chaos.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 76,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'Ken Caillat', role: 'producer', artistGlobeId: 'ken-caillat' },
    {
      name: 'Richard Dashut',
      role: 'engineer',
      artistGlobeId: 'richard-dashut',
    },
    {
      name: 'Christine McVie',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'christine-mcvie',
    },
    {
      name: 'Mick Fleetwood',
      role: 'songwriter',
      artistGlobeId: 'mick-fleetwood',
    },
    { name: 'Ken Caillat', role: 'engineer', artistGlobeId: 'ken-caillat' },
    {
      name: 'Lindsey Buckingham',
      role: 'performer',
      artistGlobeId: 'lindsey-buckingham',
    },
    {
      name: 'Mick Fleetwood',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'mick-fleetwood',
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
      name: 'John McVie',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'john-mcvie',
    },
    { name: 'Stevie Nicks', role: 'vocals', artistGlobeId: 'stevie-nicks' },
    {
      name: 'Christine McVie',
      role: 'performer',
      artistGlobeId: 'christine-mcvie',
    },
    {
      name: 'Lindsey Buckingham',
      role: 'songwriter',
      artistGlobeId: 'lindsey-buckingham',
    },
    { name: 'John McVie', role: 'songwriter', artistGlobeId: 'john-mcvie' },
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
      name: 'Christine McVie',
      role: 'songwriter',
      artistGlobeId: 'christine-mcvie',
    },
    { name: 'Stevie Nicks', role: 'songwriter', artistGlobeId: 'stevie-nicks' },
    {
      name: 'Richard Dashut',
      role: 'producer',
      artistGlobeId: 'richard-dashut',
    },
  ],
  releases: [{ releaseId: 'fleetwood-mac-rumours' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 8 },
        { chords: [], restBars: 8 },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [{ chords: [], restBars: 16 }],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'D', beat: 3, duration: 2 },
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
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
          restBars: 4,
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'G', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'G', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=kBYHwH1Vb-c' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/fleetwood-mac.webp',
  popularity: 50,
};
