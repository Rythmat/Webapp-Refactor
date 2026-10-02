import type { Song } from '@/curriculum/types/songLibrary';

export const lovesong: Song = {
  id: 'lovesong',
  title: 'Lovesong',
  artist: 'The Cure',
  year: 1989,
  historicalDescription:
    "The Cure releases 'Lovesong' in 1989, a tender and unusually direct declaration from Robert Smith — written as a wedding gift for his wife Mary. The song becomes the band's only US number one hit, proving that their gothic post-punk roots can bloom into something achingly universal without losing an ounce of emotional weight.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 140,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'hook-end-studios' },
  credits: [
    {
      name: 'Porl Thompson',
      role: 'performer',
      artistGlobeId: 'porl-thompson',
    },
    { name: 'Simon Gallup', role: 'songwriter', artistGlobeId: 'simon-gallup' },
    { name: 'Chris Parry', role: 'engineer' },
    { name: 'Mark Saunders', role: 'engineer' },
    { name: 'Robert Smith', role: 'vocals', artistGlobeId: 'robert-smith' },
    { name: 'Robert Smith', role: 'engineer', artistGlobeId: 'robert-smith' },
    { name: 'Lol Tolhurst', role: 'performer', artistGlobeId: 'lol-tolhurst' },
    { name: 'Robert Smith', role: 'songwriter', artistGlobeId: 'robert-smith' },
    { name: 'Lol Tolhurst', role: 'songwriter', artistGlobeId: 'lol-tolhurst' },
    {
      name: 'David M. Allen',
      role: 'producer',
      artistGlobeId: 'david-m-allen',
    },
    { name: 'Robert Smith', role: 'producer', artistGlobeId: 'robert-smith' },
    {
      name: 'Porl Thompson',
      role: 'songwriter',
      artistGlobeId: 'porl-thompson',
    },
    { name: 'Robert Smith', role: 'performer', artistGlobeId: 'robert-smith' },
    {
      name: 'Boris Williams',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'boris-williams',
    },
    {
      name: 'David M. Allen',
      role: 'engineer',
      artistGlobeId: 'david-m-allen',
    },
    {
      name: 'Roger O’Donnell',
      role: 'performer',
      artistGlobeId: 'roger-odonnell',
    },
    {
      name: 'Simon Gallup',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'simon-gallup',
    },
    {
      name: 'Boris Williams',
      role: 'songwriter',
      artistGlobeId: 'boris-williams',
    },
    {
      name: 'Roger O’Donnell',
      role: 'songwriter',
      artistGlobeId: 'roger-odonnell',
    },
  ],
  releases: [{ releaseId: 'the-cure-disintegration', track: 4 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      repeatCount: 10,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      repeatCount: 3,
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      repeatCount: 8,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      repeatCount: 3,
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ks_qOI0lzho' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-cure.webp',
  popularity: 50,
};
