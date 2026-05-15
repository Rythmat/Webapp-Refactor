import type { Song } from '@/curriculum/types/songLibrary';

export const killing_me_softly: Song = {
  id: 'killing_me_softly',
  title: 'Killing Me Softly',
  artist: 'The Fugees',
  year: 1996,
  historicalDescription:
    "The Fugees release their reimagining of Roberta Flack's 1973 classic 'Killing Me Softly', transforming it into a hip-hop soul landmark. Lauryn Hill's stunning vocals carry the track to global audiences, while Wyclef Jean's production bridges R&B nostalgia with 1990s hip-hop — introducing the Fugees to millions beyond the underground and cementing their album 'The Score' as one of the decade's defining records.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 94,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['hip_hop'],
  techniques: [],

  sections: [
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_9',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_10',
      label: 'Section J',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_11',
      label: 'Section K',
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=oKOtzIo-uYw' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
