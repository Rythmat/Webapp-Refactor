import type { Song } from '@/curriculum/types/songLibrary';

export const footloose: Song = {
  id: 'footloose',
  title: 'Footloose',
  artist: 'Kenny Loggins / Nathan East',
  year: 1984,

  historicalDescription:
    "Kenny Loggins records 'Footloose', the explosive title track for the 1984 film of the same name. The song becomes an anthem for teenage rebellion and freedom, topping the charts and cementing Loggins as the king of the movie soundtrack — a role he'd already claimed with 'Danger Zone' and 'I'm Alright'. It captures the irresistible energy of mid-80s pop-rock at its most joyful.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 174,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯4 dim7', chordName: 'D♯dim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 dim7', chordName: 'D♯dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯4 dim7', chordName: 'D♯dim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 dim7', chordName: 'D♯dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [{ chords: [], restBars: 14 }],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ltrMfT4Qz5Y' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/kenny-loggins.webp',
  popularity: 50,
};
