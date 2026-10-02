import type { Song } from '@/curriculum/types/songLibrary';

export const honky_tonk_women: Song = {
  id: 'honky_tonk_women',
  title: 'Honky Tonk Women',
  artist: 'The Rolling Stones',
  year: 1969,
  historicalDescription:
    "The Rolling Stones release 'Honky Tonk Women' in 1969, a swaggering country-tinged rock single that opens with one of the most recognizable cowbell-and-guitar riffs in rock history. Arriving amid the band's transition following Brian Jones's death, it marks the arrival of Mick Taylor and a rawer, more confident Stones — reaching number one on both sides of the Atlantic and cementing their status as the world's greatest rock and roll band.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 116,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'Mick Taylor', role: 'performer', artistGlobeId: 'mick-taylor' },
    { name: 'Mick Jagger', role: 'songwriter', artistGlobeId: 'mick-jagger' },
    {
      name: 'Ian Stewart',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'ian-stewart',
    },
    {
      name: 'Keith Richards',
      role: 'songwriter',
      artistGlobeId: 'keith-richards',
    },
    { name: 'Mack Vickery', role: 'songwriter', artistGlobeId: 'mack-vickery' },
    {
      name: 'Nanette Workman',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    {
      name: 'Jimmy Miller',
      role: 'performer',
      instrument: 'cowbell',
      artistGlobeId: 'jimmy-miller',
    },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      instrumental: true,
      bars: [{ chords: [], restBars: 16, repeatStart: true }],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=hqqkGxZ1_8I' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-rolling-stones.webp',
  popularity: 50,
};
