import type { Song } from '@/curriculum/types/songLibrary';

export const waterfalls: Song = {
  id: 'waterfalls',
  title: 'Waterfalls',
  artist: 'TLC',
  year: 1995,
  historicalDescription:
    "TLC releases 'Waterfalls' in 1995, a slow-burning cautionary tale addressing the AIDS crisis, drug violence, and the pursuit of dangerous dreams. The song becomes one of the defining cultural moments of the decade, spending seven weeks at number one and cementing TLC as voices of a generation — not just entertainers, but storytellers.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 86,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['hip-hop'],
  techniques: [],
  credits: [
    { name: 'Kenneth Wright', role: 'performer', instrument: 'wurlitzer' },
    {
      name: 'Organized Noize',
      role: 'songwriter',
      ensemble: true,
      artistGlobeId: 'organized-noize',
    },
    { name: 'Ronnie Fitch', role: 'performer', instrument: 'horn-section' },
    { name: 'Neal Pogue', role: 'engineer' },
    { name: 'Jerry Lloyd', role: 'performer', instrument: 'horn-section' },
    {
      name: 'CeeLo Green',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'ceelo-green',
    },
    {
      name: 'Organized Noize',
      role: 'performer',
      ensemble: true,
      artistGlobeId: 'organized-noize',
    },
    { name: 'Charles Nix', role: 'performer', instrument: 'horn-section' },
    { name: 'T‐Boz', role: 'vocals', artistGlobeId: 't-boz' },
    { name: 'Edward Stroud', role: 'performer' },
    {
      name: 'Organized Noize',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'organized-noize',
    },
    { name: 'Debra Killings', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Shock', role: 'arranger' },
    { name: 'Chilli', role: 'vocals', artistGlobeId: 'chilli' },
    {
      name: 'Lisa “Left Eye” Lopes',
      role: 'vocals',
      artistGlobeId: 'lisa-left-eye-lopes',
    },
    {
      name: 'LaMarquis Jefferson',
      role: 'performer',
      instrument: 'electric-bass',
    },
    {
      name: 'TLC',
      role: 'performer',
      instrument: 'backing-vocals',
      ensemble: true,
      artistGlobeId: 'tlc',
      primary: true,
    },
    {
      name: 'Marqueze Ethridge',
      role: 'songwriter',
      artistGlobeId: 'marqueze-ethridge',
    },
    {
      name: 'Lisa “Left Eye” Lopes',
      role: 'songwriter',
      artistGlobeId: 'lisa-left-eye-lopes',
    },
  ],
  releases: [{ releaseId: 'tlc-crazysexycool', track: 8 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [] },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        { chords: [] },
        { chords: [], restBars: 8 },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=8WEtxJ4-sh4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/tlc.webp',
  popularity: 50,
};
