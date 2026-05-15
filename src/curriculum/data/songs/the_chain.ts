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
  genreTags: ['classic_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'chorus',
      label: 'Chorus',
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
            { degree: '6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 16 }],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      repeatCount: 3,
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
            { degree: '6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 2,
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
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '3 maj', chordName: 'G', beat: 2, duration: 1 },
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
            { degree: '6 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '3 maj', chordName: 'G', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=kBYHwH1Vb-c' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
