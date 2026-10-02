import type { Song } from '@/curriculum/types/songLibrary';

export const tighten_up: Song = {
  id: 'tighten_up',
  title: 'Tighten Up',
  artist: 'The Black Keys',
  year: 2010,
  historicalDescription:
    "The Black Keys release 'Tighten Up' from their breakthrough album 'Brothers', earning the Akron, Ohio duo their first mainstream recognition and Grammy wins. The song's swaggering blues-rock groove and wry lyrics about romantic obsession capture the raw, garage-band intimacy that sets the Keys apart from polished arena rock — proving that two people with guitars and drums can still shake the world.",
  key: 'F♯ minor',
  keyRoot: 66,
  mode: 'minor',
  tempo: 108,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'the-bunker-studio' },
  credits: [
    { name: 'Tchad Blake', role: 'engineer' },
    { name: 'Dan Auerbach', role: 'songwriter', artistGlobeId: 'dan-auerbach' },
    { name: 'Kennie Takahashi', role: 'engineer' },
    { name: 'Danger Mouse', role: 'producer', artistGlobeId: 'danger-mouse' },
    {
      name: 'Patrick Carney',
      role: 'songwriter',
      artistGlobeId: 'patrick-carney',
    },
  ],
  releases: [{ releaseId: 'the-black-keys-brothers', track: 3 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=mpaPBCBjSVc' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-black-keys.webp',
  popularity: 50,
};
