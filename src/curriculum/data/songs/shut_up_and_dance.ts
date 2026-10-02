import type { Song } from '@/curriculum/types/songLibrary';

export const shut_up_and_dance: Song = {
  id: 'shut_up_and_dance',
  title: 'Shut Up And Dance',
  artist: 'Walk The Moon',
  year: 2014,
  historicalDescription:
    "Walk The Moon releases 'Shut Up And Dance', a euphoric pop-rock anthem that captures the carefree energy of a perfect night out. Its irresistible new wave-influenced hooks and sing-along chorus turn it into an unexpected global smash, dominating radio and playlists in 2014 and cementing the Cincinnati band's place in mainstream pop consciousness.",
  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  session: { studioId: 'rancho-pagzilla' },
  credits: [
    { name: 'Kevin Ray', role: 'performer' },
    {
      name: 'Nicholas Petricca',
      role: 'performer',
      artistGlobeId: 'nicholas-petricca',
    },
    {
      name: 'Ryan McMahon',
      role: 'producer',
      artistGlobeId: 'ryan-mcmahon-canadian-singer-songwriter',
    },
    { name: 'Tim Pagnotta', role: 'engineer', artistGlobeId: 'tim-pagnotta' },
    { name: 'Kuk Harrell', role: 'engineer', artistGlobeId: 'kuk-harrell' },
    { name: 'Eli Maiman', role: 'songwriter', artistGlobeId: 'eli-maiman' },
    {
      name: 'Nicholas Petricca',
      role: 'songwriter',
      artistGlobeId: 'nicholas-petricca',
    },
    {
      name: 'Sean Waugaman',
      role: 'songwriter',
      artistGlobeId: 'sean-waugaman',
    },
    {
      name: 'Sean Waugaman',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'sean-waugaman',
    },
    { name: 'Tim Pagnotta', role: 'producer', artistGlobeId: 'tim-pagnotta' },
    { name: 'Ben Berger', role: 'songwriter', artistGlobeId: 'ben-berger' },
    { name: 'Kevin Ray', role: 'songwriter', artistGlobeId: 'kevin-ray' },
    {
      name: 'Sean Waugaman',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'sean-waugaman',
    },
    {
      name: 'Nicholas Petricca',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'nicholas-petricca',
    },
    {
      name: 'Eli Maiman',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'eli-maiman',
    },
    { name: 'Neal Avron', role: 'engineer' },
    { name: 'Ben Berger', role: 'producer', artistGlobeId: 'ben-berger' },
    { name: 'Kevin Ray', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Nicholas Petricca',
      role: 'vocals',
      artistGlobeId: 'nicholas-petricca',
    },
    { name: 'Jarett Holmes', role: 'engineer' },
    {
      name: 'Ryan McMahon',
      role: 'songwriter',
      artistGlobeId: 'ryan-mcmahon-la-based-producer-and-songwriter',
    },
    {
      name: 'Eli Maiman',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'eli-maiman',
    },
    { name: 'Marcos Tovar', role: 'engineer' },
  ],
  releases: [{ releaseId: 'walk-the-moon-talking-is-hard', track: 3 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [], restBars: 2 },
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
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
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
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
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
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
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
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
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
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 2 },
            {
              degree: '2 min7/4',
              chordName: 'E♭min7/G♭',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        { chords: [], restBars: 4 },
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
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=6JCLY0Rlx6Q' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/walk-the-moon.webp',
  popularity: 50,
};
