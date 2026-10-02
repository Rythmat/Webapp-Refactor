import type { Song } from '@/curriculum/types/songLibrary';

export const mary_janes_last_dance: Song = {
  id: 'mary_janes_last_dance',
  title: 'Mary Jane’s Last Dance',
  artist: 'Tom Petty and The Heartbreakers',
  year: 1993,
  historicalDescription:
    "Tom Petty and The Heartbreakers release 'Mary Jane's Last Dance' as part of their greatest hits collection, giving the band one of their signature late-career moments. The hypnotic, minor-key groove and Petty's deadpan storytelling capture a distinctly American restlessness — part heartland rock, part something darker and harder to name. Its music video, featuring Kim Basinger, becomes one of the most memorable of the era.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 85,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'ocean-way-studio-d' },
  credits: [
    {
      name: 'Benmont Tench',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'benmont-tench',
    },
    { name: 'Richard Dodd', role: 'engineer' },
    { name: 'Rick Rubin', role: 'producer', artistGlobeId: 'rick-rubin' },
    { name: 'Jim Scott', role: 'engineer', artistGlobeId: 'jim-scott' },
    {
      name: 'Howie Epstein',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'howie-epstein',
    },
    { name: 'Tom Petty', role: 'producer', artistGlobeId: 'tom-petty' },
    {
      name: 'Benmont Tench',
      role: 'performer',
      instrument: 'organ',
      artistGlobeId: 'benmont-tench',
    },
    { name: 'Tom Petty', role: 'songwriter', artistGlobeId: 'tom-petty' },
    {
      name: 'Mike Campbell',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'mike-campbell',
    },
    { name: 'Mike Campbell', role: 'producer', artistGlobeId: 'mike-campbell' },
    {
      name: 'Stan Lynch',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'stan-lynch',
    },
  ],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 3,
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=aowSGxim_O8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/tom-petty.webp',
  popularity: 50,
};
