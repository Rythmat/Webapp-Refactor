import type { Song } from '@/curriculum/types/songLibrary';

export const high_and_dry: Song = {
  id: 'high_and_dry',
  title: 'High And Dry',
  artist: 'Radiohead',
  year: 1995,
  historicalDescription:
    "Radiohead releases 'High and Dry' as a single from their landmark album 'The Bends', marking a moment of surprising accessibility for a band already pushing the boundaries of alternative rock. Written during the 'Pablo Honey' era but saved for 'The Bends', the song's melodic restraint and Thom Yorke's plaintive vocals help cement Radiohead's transition from one-hit-wonder fears to one of Britain's most vital rock acts of the decade.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 86,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    {
      name: 'Jonny Greenwood',
      role: 'performer',
      instrument: 'organ',
      artistGlobeId: 'jonny-greenwood',
    },
    {
      name: 'Jonny Greenwood',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'jonny-greenwood',
    },
    { name: 'Nigel Godrich', role: 'engineer', artistGlobeId: 'nigel-godrich' },
    { name: 'Ed O’Brien', role: 'performer', artistGlobeId: 'ed-obrien' },
    {
      name: 'Radiohead',
      role: 'engineer',
      ensemble: true,
      artistGlobeId: 'radiohead',
    },
    {
      name: 'Thom Yorke',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'thom-yorke',
    },
    { name: 'John Matthias', role: 'performer', instrument: 'viola' },
    { name: 'Ed O’Brien', role: 'songwriter', artistGlobeId: 'ed-obrien' },
    {
      name: 'Jonny Greenwood',
      role: 'engineer',
      artistGlobeId: 'jonny-greenwood',
    },
    { name: 'Sean Slade', role: 'engineer', artistGlobeId: 'sean-slade' },
    { name: 'John Matthias', role: 'performer', instrument: 'violin' },
    { name: 'Thom Yorke', role: 'performer', artistGlobeId: 'thom-yorke' },
    { name: 'Jim Warren', role: 'engineer', artistGlobeId: 'jim-warren' },
    {
      name: 'Philip Selway',
      role: 'songwriter',
      artistGlobeId: 'philip-selway',
    },
    {
      name: 'Philip Selway',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'philip-selway',
    },
    { name: 'Jim Warren', role: 'producer', artistGlobeId: 'jim-warren' },
    { name: 'John Leckie', role: 'engineer' },
    {
      name: 'Jonny Greenwood',
      role: 'arranger',
      artistGlobeId: 'jonny-greenwood',
    },
    {
      name: 'Colin Greenwood',
      role: 'songwriter',
      artistGlobeId: 'colin-greenwood',
    },
    { name: 'Thom Yorke', role: 'songwriter', artistGlobeId: 'thom-yorke' },
    {
      name: 'Radiohead',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'radiohead',
    },
    {
      name: 'Philip Selway',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'philip-selway',
    },
    {
      name: 'Ed O’Brien',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'ed-obrien',
    },
    {
      name: 'Jonny Greenwood',
      role: 'songwriter',
      artistGlobeId: 'jonny-greenwood',
    },
    { name: 'Chris Brown', role: 'engineer' },
    {
      name: 'Colin Greenwood',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'colin-greenwood',
    },
    {
      name: 'Jonny Greenwood',
      role: 'performer',
      artistGlobeId: 'jonny-greenwood',
    },
    {
      name: 'Jonny Greenwood',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'jonny-greenwood',
    },
    { name: 'Thom Yorke', role: 'arranger', artistGlobeId: 'thom-yorke' },
    { name: 'Thom Yorke', role: 'vocals', artistGlobeId: 'thom-yorke' },
    { name: 'Caroline Lavelle', role: 'performer', instrument: 'cello' },
    {
      name: 'Paul Q. Kolderie',
      role: 'engineer',
      artistGlobeId: 'paul-q-kolderie',
    },
  ],
  releases: [{ releaseId: 'radiohead-the-bends', track: 3 }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      instrumental: true,
      bars: [
        { chords: [], restBars: 2 },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=7qFfFVSerQo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/radiohead.webp',
  popularity: 50,
};
