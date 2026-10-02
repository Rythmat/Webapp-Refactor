import type { Song } from '@/curriculum/types/songLibrary';

export const take_me_home_country_roads: Song = {
  id: 'take_me_home_country_roads',
  title: 'Take Me Home, Country Roads',
  artist: 'John Denver',
  year: 1971,
  historicalDescription:
    "John Denver releases 'Take Me Home, Country Roads' in 1971, a hymn to the rural beauty of West Virginia that becomes one of the most instantly recognizable American songs ever recorded. Its warm, open-hearted longing for home transcends country radio, crossing into pop and folk audiences and cementing Denver as a defining voice of early 1970s Americana. West Virginia later adopts it as an official state song.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 84,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk'],
  techniques: [],
  credits: [
    { name: 'Eric Weissberg', role: 'performer', instrument: 'pedal-steel' },
    { name: 'Gary Chester', role: 'performer' },
    { name: 'Frank Owens', role: 'performer', instrument: 'piano' },
    { name: 'John Denver', role: 'songwriter', artistGlobeId: 'john-denver' },
    { name: 'Taffy Nivert', role: 'songwriter', artistGlobeId: 'taffy-nivert' },
    { name: 'Dick Kniss', role: 'performer', instrument: 'upright-bass' },
    { name: 'Bill Danoff', role: 'songwriter', artistGlobeId: 'bill-danoff' },
    { name: 'Bill Danoff', role: 'performer', artistGlobeId: 'bill-danoff' },
    {
      name: 'Starland Vocal Band',
      role: 'performer',
      instrument: 'backing-vocals',
      ensemble: true,
    },
    {
      name: 'Bill Danoff',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'bill-danoff',
    },
    { name: 'Ray Hall', role: 'engineer' },
    { name: 'Milt Okun', role: 'producer', artistGlobeId: 'milt-okun' },
    {
      name: 'Taffy Nivert',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'taffy-nivert',
    },
    { name: 'Eric Weissberg', role: 'performer', instrument: 'banjo' },
    {
      name: 'John Denver',
      role: 'vocals',
      artistGlobeId: 'john-denver',
      primary: true,
    },
    {
      name: 'John Denver',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'john-denver',
      primary: true,
    },
    { name: 'Michael Taylor', role: 'performer' },
  ],
  releases: [{ releaseId: 'john-denver-poems-prayers-promises' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=IUmnTfsY3hI' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/john-denver.webp',
  popularity: 50,
};
