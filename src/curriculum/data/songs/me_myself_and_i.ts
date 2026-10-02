import type { Song } from '@/curriculum/types/songLibrary';

export const me_myself_and_i: Song = {
  id: 'me_myself_and_i',
  title: 'Me, Myself and I',
  artist: 'Beyonce',
  year: 2003,
  historicalDescription:
    "Beyoncé releases 'Me, Myself and I' as part of her debut solo album 'Dangerously in Love', announcing herself as a formidable solo force after her years fronting Destiny's Child. The song's defiant anthem of self-reliance resonates deeply, capturing a cultural moment where female independence in R&B is both a personal statement and a commercial force.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 84,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['hip-hop'],
  techniques: [],
  session: { studioId: 'south-beach-studios' },
  credits: [
    { name: 'Scott Storch', role: 'producer', artistGlobeId: 'scott-storch' },
    {
      name: 'Beyoncé',
      role: 'vocals',
      artistGlobeId: 'beyonce',
      primary: true,
    },
    { name: 'Beyoncé', role: 'songwriter', artistGlobeId: 'beyonce' },
    {
      name: 'Robert Waller',
      role: 'songwriter',
      artistGlobeId: 'robert-waller',
    },
    { name: 'Beyoncé', role: 'producer', artistGlobeId: 'beyonce' },
    { name: 'Tony Maserati', role: 'engineer' },
    { name: 'Scott Storch', role: 'songwriter', artistGlobeId: 'scott-storch' },
    { name: 'Carlos Bedoya', role: 'engineer' },
    {
      name: 'Beyoncé',
      role: 'performer',
      artistGlobeId: 'beyonce',
      primary: true,
    },
  ],
  releases: [{ releaseId: 'beyonce-dangerously-in-love' }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'D♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=4S37SGxZSMc' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/beyonce.webp',
  popularity: 50,
};
