import type { Song } from '@/curriculum/types/songLibrary';

export const everybody_wants_to_rule_the_world: Song = {
  id: 'everybody_wants_to_rule_the_world',
  title: 'Everybody Wants To Rule The World',
  artist: 'Tears For Fears',
  year: 1985,
  historicalDescription:
    "Tears For Fears release 'Everybody Wants To Rule The World', a sleek, anthemic meditation on power and ambition that becomes one of the defining songs of the mid-1980s. Its irresistible blend of new wave polish and arena-rock sweep captures the mood of a decade obsessed with wealth, politics, and control. The song tops charts on both sides of the Atlantic, cementing the British duo as global pop icons.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 102,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    { name: 'David Bascombe', role: 'engineer' },
    {
      name: 'Roland Orzabal',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'roland-orzabal',
    },
    { name: 'Chris Hughes', role: 'producer', artistGlobeId: 'chris-hughes' },
    { name: 'Ian Stanley', role: 'performer', artistGlobeId: 'ian-stanley' },
    { name: 'Curt Smith', role: 'vocals', artistGlobeId: 'curt-smith' },
    {
      name: 'Curt Smith',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'curt-smith',
    },
    { name: 'Chris Hughes', role: 'songwriter', artistGlobeId: 'chris-hughes' },
    { name: 'Ian Stanley', role: 'songwriter', artistGlobeId: 'ian-stanley' },
    { name: 'Steven Wilson', role: 'engineer' },
    {
      name: 'Roland Orzabal',
      role: 'songwriter',
      artistGlobeId: 'roland-orzabal',
    },
    { name: 'Neil Taylor', role: 'performer' },
    {
      name: 'Manny Elias',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'manny-elias',
    },
  ],
  releases: [
    { releaseId: 'tears-for-fears-songs-from-the-big-chair', track: 3 },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
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
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A', beat: 3, duration: 2 },
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
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=aGCdLKXNF3w' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/tears-for-fears.webp',
  popularity: 50,
};
