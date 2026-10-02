import type { Song } from '@/curriculum/types/songLibrary';

export const creep: Song = {
  id: 'creep',
  title: 'Creep',
  artist: 'Radiohead',
  year: 1992,
  historicalDescription:
    "Radiohead releases 'Creep', a song about yearning and self-loathing that initially struggles in the UK before exploding in Israel and becoming a global hit. The track's quiet-loud dynamics — delicate verses erupting into a raw, distorted chorus — capture the alienation of a generation and introduce the world to a band that will go on to redefine rock music entirely.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 97,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'chipping-norton-recording-studios' },
  credits: [
    { name: 'Sean Slade', role: 'producer', artistGlobeId: 'sean-slade' },
    {
      name: 'Albert Hammond',
      role: 'songwriter',
      artistGlobeId: 'albert-hammond',
    },
    {
      name: 'Colin Greenwood',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'colin-greenwood',
    },
    {
      name: 'Jonny Greenwood',
      role: 'performer',
      instrument: 'organ',
      artistGlobeId: 'jonny-greenwood',
    },
    {
      name: 'Philip Selway',
      role: 'songwriter',
      artistGlobeId: 'philip-selway',
    },
    {
      name: 'Jonny Greenwood',
      role: 'songwriter',
      artistGlobeId: 'jonny-greenwood',
    },
    {
      name: 'Jonny Greenwood',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'jonny-greenwood',
    },
    {
      name: 'Paul Q. Kolderie',
      role: 'engineer',
      artistGlobeId: 'paul-q-kolderie',
    },
    { name: 'Ed O’Brien', role: 'performer', artistGlobeId: 'ed-obrien' },
    {
      name: 'Colin Greenwood',
      role: 'songwriter',
      artistGlobeId: 'colin-greenwood',
    },
    {
      name: 'Paul Q. Kolderie',
      role: 'producer',
      artistGlobeId: 'paul-q-kolderie',
    },
    { name: 'Ed O’Brien', role: 'vocals', artistGlobeId: 'ed-obrien' },
    {
      name: 'Mike Hazlewood',
      role: 'songwriter',
      artistGlobeId: 'mike-hazlewood',
    },
    { name: 'Thom Yorke', role: 'performer', artistGlobeId: 'thom-yorke' },
    { name: 'Thom Yorke', role: 'songwriter', artistGlobeId: 'thom-yorke' },
    { name: 'Thom Yorke', role: 'vocals', artistGlobeId: 'thom-yorke' },
    { name: 'Ed O’Brien', role: 'songwriter', artistGlobeId: 'ed-obrien' },
    {
      name: 'Philip Selway',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'philip-selway',
    },
    {
      name: 'Jonny Greenwood',
      role: 'performer',
      artistGlobeId: 'jonny-greenwood',
    },
    { name: 'Sean Slade', role: 'engineer', artistGlobeId: 'sean-slade' },
  ],
  releases: [{ releaseId: 'radiohead-pablo-honey', track: 2 }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '3 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=XFkzRNyygfk' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/radiohead.webp',
  popularity: 50,
};
