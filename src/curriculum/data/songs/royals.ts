import type { Song } from '@/curriculum/types/songLibrary';

export const royals: Song = {
  id: 'royals',
  title: 'Royals',
  artist: 'Lorde',
  year: 2012,
  historicalDescription:
    "Sixteen-year-old Ella Yelich-O'Connor, recording as Lorde, releases 'Royals' from Auckland, New Zealand — a spare, minimalist pop song that rejects the champagne-and-jets excess dominating mainstream radio. Its cool detachment and frank class critique resonate globally, announcing a new kind of pop star: self-possessed, literary, and unbothered by glamour.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 84,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['pop', 'rock'],
  techniques: [],
  session: { studioId: 'golden-age-west' },
  credits: [
    { name: 'Lorde', role: 'songwriter', artistGlobeId: 'lorde' },
    { name: 'Joel Little', role: 'performer', artistGlobeId: 'joel-little' },
    { name: 'Joel Little', role: 'engineer', artistGlobeId: 'joel-little' },
    { name: 'Joel Little', role: 'producer', artistGlobeId: 'joel-little' },
    { name: 'Joel Little', role: 'songwriter', artistGlobeId: 'joel-little' },
    { name: 'Lorde', role: 'vocals', artistGlobeId: 'lorde', primary: true },
  ],
  releases: [{ releaseId: 'lorde-pure-heroine', track: 3 }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [{ chords: [], restBars: 10 }],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      repeatCount: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=nlcIKh6sBtc' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/lorde.webp',
  popularity: 50,
};
