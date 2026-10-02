import type { Song } from '@/curriculum/types/songLibrary';

export const dont_know_why: Song = {
  id: 'dont_know_why',
  title: 'Don’t Know Why',
  artist: 'Norah Jones',
  year: 2002,
  historicalDescription:
    "'Don't Know Why' becomes the signature song of Norah Jones's debut album 'Come Away with Me', introducing a hushed, intimate blend of jazz, country, and pop that catches the music world off guard. The song wins three Grammy Awards and helps the album become one of the best-selling debuts of the decade, proving that understated sophistication has a massive audience.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 88,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['jazz', 'pop'],
  techniques: [],
  credits: [
    { name: 'Jay Newland', role: 'producer', artistGlobeId: 'jay-newland' },
    { name: 'Dan Rieser', role: 'performer', instrument: 'drum-kit' },
    { name: 'Norah Jones', role: 'producer', artistGlobeId: 'norah-jones' },
    {
      name: 'Norah Jones',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'norah-jones',
      primary: true,
    },
    {
      name: 'Jesse Harris',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'jesse-harris',
    },
    { name: 'Jay Newland', role: 'engineer', artistGlobeId: 'jay-newland' },
    {
      name: 'Jesse Harris',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'jesse-harris',
    },
    { name: 'Arif Mardin', role: 'engineer', artistGlobeId: 'arif-mardin' },
    { name: 'Lee Alexander', role: 'performer', instrument: 'electric-bass' },
    { name: 'Jesse Harris', role: 'songwriter', artistGlobeId: 'jesse-harris' },
    {
      name: 'Norah Jones',
      role: 'vocals',
      artistGlobeId: 'norah-jones',
      primary: true,
    },
    { name: 'Arif Mardin', role: 'producer', artistGlobeId: 'arif-mardin' },
  ],
  releases: [{ releaseId: 'norah-jones-come-away-with-me', track: 1 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7sus4', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '2 dom7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=tO4dxvguQDk' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/norah-jones.webp',
  popularity: 50,
};
