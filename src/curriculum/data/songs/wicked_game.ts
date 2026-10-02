import type { Song } from '@/curriculum/types/songLibrary';

export const wicked_game: Song = {
  id: 'wicked_game',
  title: 'Wicked Game',
  artist: 'Chris Isaak',
  year: 1990,
  historicalDescription:
    "Chris Isaak's 'Wicked Game' haunts American radio in 1990, its tremolo guitar and aching baritone evoking a timeless heartbreak that feels lifted from another era entirely. Originally buried on his 1989 album, the song explodes into mainstream consciousness after appearing in David Lynch's 'Wild at Heart' — proof that sometimes a film can resurrect a song that the world nearly missed.",
  key: 'B dorian',
  keyRoot: 71,
  mode: 'dorian',
  tempo: 112,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'Christine Wall', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Chris Isaak', role: 'songwriter', artistGlobeId: 'chris-isaak' },
    { name: 'James Calvin Wilsey', role: 'performer' },
    { name: 'Mark Needham', role: 'engineer' },
    { name: 'Kenney Dale Johnson', role: 'performer', instrument: 'drum-kit' },
    { name: 'Erik Jacobsen', role: 'producer', artistGlobeId: 'erik-jacobsen' },
    {
      name: 'Chris Isaak',
      role: 'vocals',
      artistGlobeId: 'chris-isaak',
      primary: true,
    },
    { name: 'Cynthia Lloyd', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Rowland Salley', role: 'performer', instrument: 'electric-bass' },
    {
      name: 'Chris Isaak',
      role: 'performer',
      artistGlobeId: 'chris-isaak',
      primary: true,
    },
  ],
  releases: [{ releaseId: 'chris-isaak-heart-shaped-world', track: 5 }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=jd-qI62gNJM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/chris-isaak.webp',
  popularity: 50,
};
