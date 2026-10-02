import type { Song } from '@/curriculum/types/songLibrary';

export const come_away_with_me: Song = {
  id: 'come_away_with_me',
  title: 'Come Away With Me',
  artist: 'Norah Jones',
  year: 2002,
  historicalDescription:
    "Norah Jones releases 'Come Away With Me', the title track of her debut album, introducing a hushed blend of jazz, country, and pop that feels entirely out of step with the era — and becomes a phenomenon because of it. The album sweeps the 2003 Grammy Awards, winning eight trophies including Album of the Year, and Jones becomes one of the best-selling artists of the decade. Her intimate, unhurried style proves there is a vast audience hungry for something quiet.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 82,
  timeSignature: [3, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    { name: 'Jay Newland', role: 'engineer', artistGlobeId: 'jay-newland' },
    {
      name: 'Norah Jones',
      role: 'vocals',
      artistGlobeId: 'norah-jones',
      primary: true,
    },
    { name: 'Lee Alexander', role: 'performer', instrument: 'electric-bass' },
    { name: 'Norah Jones', role: 'songwriter', artistGlobeId: 'norah-jones' },
    { name: 'Dan Rieser', role: 'performer', instrument: 'drum-kit' },
    {
      name: 'Norah Jones',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'norah-jones',
      primary: true,
    },
    { name: 'Arif Mardin', role: 'producer', artistGlobeId: 'arif-mardin' },
    {
      name: 'Jesse Harris',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'jesse-harris',
    },
    { name: 'Adam Levy', role: 'performer', instrument: 'electric-guitar' },
    { name: 'Arif Mardin', role: 'engineer', artistGlobeId: 'arif-mardin' },
  ],
  releases: [{ releaseId: 'norah-jones-come-away-with-me', track: 5 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 3 }],
          fermata: true,
        },
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 3 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=lbjZPFBD6JU' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/norah-jones.webp',
  popularity: 50,
};
