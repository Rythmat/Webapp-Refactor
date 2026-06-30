import type { Song } from '@/curriculum/types/songLibrary';

export const thank_you_falettinme_be_mice_elf_again: Song = {
  id: 'thank_you_falettinme_be_mice_elf_again',
  title: 'Thank You (Falettinme Be Mice Elf Again)',
  artist: 'Sly and the Family Stone / Larry Graham',
  year: undefined,

  historicalDescription:
    "Sly and the Family Stone release 'Thank You (Falettinme Be Mice Elf Again)', a landmark funk record driven by Larry Graham's revolutionary slap bass technique — a style he invents by necessity and that will reshape rhythm sections across funk, soul, and eventually hip hop. The song captures Sly Stone's multiracial, mixed-gender band at their commercial peak, reaching #1 on the Billboard Hot 100 in early 1970. Graham's thumping, popping bass becomes one of the most imitated sounds in modern music.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 108,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=wj5VODa-eTY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/sly-and-the-family-stone.webp',
  popularity: 50,
};
