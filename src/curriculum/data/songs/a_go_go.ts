import type { Song } from '@/curriculum/types/songLibrary';

export const a_go_go: Song = {
  id: 'a_go_go',
  title: 'A Go Go',
  artist: 'John Scofield',
  year: 1998,
  historicalDescription:
    "John Scofield releases 'A Go Go' in 1998, a record that cements his reputation as the master of funky soul-jazz guitar. Collaborating with the Medeski Martin & Wood trio, Scofield blurs the line between jazz improvisation and deep groove, drawing in fans of both avant-garde jazz and funk. The album becomes a touchstone for a generation of guitarists seeking to fuse intellectual harmonic depth with raw rhythmic feel.",
  key: 'B minor',
  keyRoot: 71,
  mode: 'minor',
  tempo: 104,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'jazz', 'rnb'],
  techniques: [],
  session: { studioId: 'power-station-at-berkleenyc' },
  credits: [
    { name: 'Billy Martin', role: 'performer' },
    {
      name: 'John Scofield',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'john-scofield',
      primary: true,
    },
    { name: 'John Medeski', role: 'performer', instrument: 'organ' },
    { name: 'Chris Wood', role: 'performer', instrument: 'electric-bass' },
    { name: 'Chris Wood', role: 'performer', instrument: 'upright-bass' },
    { name: 'Lee Townsend', role: 'producer', artistGlobeId: 'lee-townsend' },
    {
      name: 'John Scofield',
      role: 'performer',
      instrument: 'whistle',
      artistGlobeId: 'john-scofield',
      primary: true,
    },
    {
      name: 'John Scofield',
      role: 'songwriter',
      artistGlobeId: 'john-scofield',
    },
    {
      name: 'John Scofield',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'john-scofield',
      primary: true,
    },
    { name: 'Joe Ferla', role: 'engineer' },
    { name: 'Billy Martin', role: 'performer', instrument: 'tambourine' },
    { name: 'John Medeski', role: 'performer', instrument: 'piano' },
    { name: 'John Medeski', role: 'performer', instrument: 'clavinet' },
    { name: 'John Medeski', role: 'performer', instrument: 'wurlitzer' },
  ],
  releases: [{ releaseId: 'john-scofield-a-go-go', track: 1 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      instrumental: true,
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
          chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
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
          chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '♭6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      instrumental: true,
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
          chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
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
          chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      instrumental: true,
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
          chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
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
          chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=-PXOr681_VU' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/john-scofield.webp',
  popularity: 50,
};
