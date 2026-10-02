import type { Song } from '@/curriculum/types/songLibrary';

export const shake_it_off: Song = {
  id: 'shake_it_off',
  title: 'Shake It Off',
  artist: 'Taylor Swift',
  year: 2014,
  historicalDescription:
    "Taylor Swift releases 'Shake It Off' in 2014, marking a deliberate pivot from country to pure pop and announcing her album '1989'. The song's carefree message of brushing off critics becomes an anthem for self-empowerment, signaling a new era in Swift's career and cementing her status as one of pop music's most commanding figures.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 80,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['electronic', 'pop'],
  techniques: [],
  credits: [
    { name: 'Jonas Lindeborg', role: 'performer', instrument: 'trumpet' },
    {
      name: 'Shellback',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'shellback',
    },
    { name: 'Max Martin', role: 'songwriter', artistGlobeId: 'max-martin' },
    { name: 'Shellback', role: 'vocals', artistGlobeId: 'shellback' },
    { name: 'Magnus Wiklund', role: 'performer', instrument: 'trombone' },
    {
      name: 'Taylor Swift',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'taylor-swift',
      primary: true,
    },
    { name: 'Sam Holland', role: 'engineer' },
    { name: 'Jonas Thander', role: 'performer' },
    { name: 'Michael Ilbert', role: 'engineer' },
    {
      name: 'Shellback',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'shellback',
    },
    { name: 'Serban Ghenea', role: 'engineer' },
    {
      name: 'Taylor Swift',
      role: 'vocals',
      artistGlobeId: 'taylor-swift',
      primary: true,
    },
    { name: 'John Hanes', role: 'engineer' },
    { name: 'Max Martin', role: 'performer', artistGlobeId: 'max-martin' },
    { name: 'Shellback', role: 'songwriter', artistGlobeId: 'shellback' },
    {
      name: 'Taylor Swift',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'taylor-swift',
      primary: true,
    },
    {
      name: 'Shellback',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'shellback',
    },
    {
      name: 'Max Martin',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'max-martin',
    },
    { name: 'Shellback', role: 'producer', artistGlobeId: 'shellback' },
    { name: 'Max Martin', role: 'vocals', artistGlobeId: 'max-martin' },
    { name: 'Taylor Swift', role: 'songwriter', artistGlobeId: 'taylor-swift' },
    {
      name: 'Max Martin',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'max-martin',
    },
    { name: 'Max Martin', role: 'producer', artistGlobeId: 'max-martin' },
    {
      name: 'Shellback',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'shellback',
    },
    { name: 'Shellback', role: 'performer', artistGlobeId: 'shellback' },
  ],
  releases: [{ releaseId: 'taylor-swift-1989', track: 6 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 2 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [{ chords: [], restBars: 9 }],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=nfWlot6h_JM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/taylor-swift.webp',
  popularity: 50,
};
