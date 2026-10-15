import type { Song } from '@/curriculum/types/songLibrary';

export const i_know_travis_scott: Song = {
  id: 'i_know_travis_scott',
  title: 'I KNOW ?',
  artist: 'Travis Scott',
  composer:
    'Travis Scott, Oz, Scotty Coleman, Josiah Sherman, Kobe Hood and Terrance George',
  year: 2023,
  historicalDescription:
    "Travis Scott releases 'I KNOW ?' on 'Utopia', his long-awaited fourth album, a hazy, melodic track that floats over an F minor 7 vamp before shifting between C minor 7 and B-flat minor 7. Built with producers Oz and Scotty Coleman, it becomes one of the album's breakout songs on streaming as 'Utopia' debuts at No. 1 on the Billboard 200.",
  key: 'F minor',
  keyRoot: 65,
  mode: 'minor',
  tempo: 117,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: ['hip-hop'],
  techniques: [],
  credits: [
    {
      name: 'Travis Scott',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'travis-scott',
    },
    { name: 'Travis Scott', role: 'songwriter', artistGlobeId: 'travis-scott' },
    { name: 'Oz', role: 'songwriter', artistGlobeId: 'oz' },
    {
      name: 'Scotty Coleman',
      role: 'songwriter',
      artistGlobeId: 'scotty-coleman',
    },
    {
      name: 'Josiah Sherman',
      role: 'songwriter',
      artistGlobeId: 'josiah-sherman',
    },
    { name: 'Kobe Hood', role: 'songwriter', artistGlobeId: 'kobe-hood' },
    {
      name: 'Terrance George',
      role: 'songwriter',
      artistGlobeId: 'terrance-george',
    },
    { name: 'Travis Scott', role: 'producer', artistGlobeId: 'travis-scott' },
    { name: 'Oz', role: 'producer', artistGlobeId: 'oz' },
    {
      name: 'Scotty Coleman',
      role: 'producer',
      artistGlobeId: 'scotty-coleman',
    },
  ],
  releases: [{ releaseId: 'travis-scott-utopia' }],
  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=fmdLsdmYzTo' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
