import type { Song } from '@/curriculum/types/songLibrary';

export const all_the_small_things: Song = {
  id: 'all_the_small_things',
  title: 'All The Small Things',
  artist: 'Blink 182',
  year: 1999,

  historicalDescription:
    "Blink-182 releases 'All The Small Things', a melodic punk anthem that catapults the San Diego trio from cult skate-punk act to mainstream superstars. Its relentless hooks and tongue-in-cheek MTV video — spoofing boy band culture — make it inescapable, cementing pop-punk as a defining sound of late-90s American youth.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 148,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    {
      name: 'Mark Hoppus',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'mark-hoppus',
    },
    { name: 'Sean O’Dwyer', role: 'engineer' },
    {
      name: 'Travis Barker',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'travis-barker',
    },
    {
      name: 'blink‐182',
      role: 'arranger',
      ensemble: true,
      artistGlobeId: 'blink-182',
    },
    {
      name: 'Mark Hoppus',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'mark-hoppus',
    },
    { name: 'Tom DeLonge', role: 'songwriter', artistGlobeId: 'tom-delonge' },
    { name: 'Tom DeLonge', role: 'vocals', artistGlobeId: 'tom-delonge' },
    { name: 'Jerry Finn', role: 'producer', artistGlobeId: 'jerry-finn' },
    { name: 'Mark Hoppus', role: 'songwriter', artistGlobeId: 'mark-hoppus' },
    { name: 'Roger Joseph Manning Jr.', role: 'performer' },
    { name: 'Tom DeLonge', role: 'performer', artistGlobeId: 'tom-delonge' },
    { name: 'Tom Lord‐Alge', role: 'engineer' },
  ],
  releases: [{ releaseId: 'blink-182-enema-of-the-state', track: 8 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [] },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=9Ht5RZpzPqw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/blink-182.webp',
  popularity: 50,
};
