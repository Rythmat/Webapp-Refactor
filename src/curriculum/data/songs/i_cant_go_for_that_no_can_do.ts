import type { Song } from '@/curriculum/types/songLibrary';

export const i_cant_go_for_that_no_can_do: Song = {
  id: 'i_cant_go_for_that_no_can_do',
  title: 'I Can’t Go For That (No Can Do)',
  artist: 'Hall & Oates',
  year: 1981,

  historicalDescription:
    "Hall & Oates release 'I Can't Go For That (No Can Do)', a sleek fusion of blue-eyed soul, R&B, and early synthesizer-driven pop that becomes one of their signature songs. Its cool, minimal groove crosses over to top the Billboard Hot 100 and the R&B charts simultaneously — a rare feat that cements Daryl Hall and John Oates as the best-selling duo in pop history.",
  key: 'F dorian',
  keyRoot: 65,
  mode: 'dorian',
  tempo: 110,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  session: { studioId: 'electric-lady-studios' },
  credits: [
    { name: 'Neil Kernon', role: 'engineer', artistGlobeId: 'neil-kernon' },
    { name: 'Sara Allen', role: 'songwriter', artistGlobeId: 'sara-allen' },
    { name: 'Neil Kernon', role: 'producer', artistGlobeId: 'neil-kernon' },
    { name: 'Daryl Hall', role: 'songwriter', artistGlobeId: 'daryl-hall' },
    { name: 'John Oates', role: 'songwriter', artistGlobeId: 'john-oates' },
    { name: 'Daryl Hall', role: 'producer', artistGlobeId: 'daryl-hall' },
    { name: 'John Oates', role: 'producer', artistGlobeId: 'john-oates' },
  ],
  releases: [{ releaseId: 'hall-and-oates-private-eyes' }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
          restBars: 2,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ccenFp_3kq8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/hall-and-oates.webp',
  popularity: 50,
};
