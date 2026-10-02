import type { Song } from '@/curriculum/types/songLibrary';

export const run_around: Song = {
  id: 'run_around',
  title: 'Run-Around',
  artist: 'Blues Traveler',
  year: 1994,
  historicalDescription:
    "Blues Traveler releases 'Run-Around' in 1994, a blues-rock anthem built around John Popper's virtuosic harmonica work and a deceptively catchy melody. The song becomes a massive radio hit, introducing a generation to the band's jam-band roots and proving that guitar-driven blues rock with genuine instrumental chops can still conquer mainstream airwaves.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 152,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    {
      name: 'John Popper',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'john-popper',
    },
    {
      name: 'Bobby Sheehan',
      role: 'performer',
      artistGlobeId: 'bobby-sheehan',
    },
    { name: 'Chuck Leavell', role: 'performer' },
    { name: 'John Popper', role: 'songwriter', artistGlobeId: 'john-popper' },
    {
      name: 'Michael Barbiero',
      role: 'arranger',
      artistGlobeId: 'michael-barbiero',
    },
    {
      name: 'Brendan Hill',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'brendan-hill',
    },
    {
      name: 'Steve Thompson',
      role: 'producer',
      artistGlobeId: 'steve-thompson',
    },
    {
      name: 'Brendan Hill',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'brendan-hill',
    },
    { name: 'Chuck Leavell', role: 'performer', instrument: 'piano' },
    {
      name: 'Chan Kinchla',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'chan-kinchla',
    },
    {
      name: 'John Popper',
      role: 'performer',
      instrument: 'harmonica',
      artistGlobeId: 'john-popper',
    },
    {
      name: 'Blues Traveler',
      role: 'arranger',
      ensemble: true,
      artistGlobeId: 'blues-traveler',
    },
    {
      name: 'Chan Kinchla',
      role: 'performer',
      instrument: 'mandolin',
      artistGlobeId: 'chan-kinchla',
    },
    {
      name: 'Michael Barbiero',
      role: 'producer',
      artistGlobeId: 'michael-barbiero',
    },
    {
      name: 'Chan Kinchla',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'chan-kinchla',
    },
    {
      name: 'Michael Barbiero',
      role: 'engineer',
      artistGlobeId: 'michael-barbiero',
    },
    {
      name: 'Steve Thompson',
      role: 'arranger',
      artistGlobeId: 'steve-thompson',
    },
    {
      name: 'Steve Thompson',
      role: 'engineer',
      artistGlobeId: 'steve-thompson',
    },
    { name: 'Bashiri Johnson', role: 'performer', instrument: 'percussion' },
  ],
  releases: [{ releaseId: 'blues-traveler-four', track: 1 }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ousaiByU1ko' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/blues-traveler.webp',
  popularity: 50,
};
