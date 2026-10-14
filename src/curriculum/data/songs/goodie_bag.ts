import type { Song } from '@/curriculum/types/songLibrary';

export const goodie_bag: Song = {
  id: 'goodie_bag',
  title: 'Goodie Bag',
  artist: 'Still Woozy',
  year: 2017,
  historicalDescription:
    "Still Woozy releases 'Goodie Bag', a lo-fi, home-made slice of bedroom pop from the Oakland songwriter, all wobbly guitars and soft falsetto over four seventh chords. Shared without a label, it spreads through streaming playlists into one of the defining songs of the late-2010s bedroom-pop wave.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 138,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    {
      name: 'Still Woozy',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'still-woozy',
    },
  ],
  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      notes:
        'F major 7 and G minor 7 arrive on beat 4 and tie over the barline.',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 3 },
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 4, duration: 1 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'B♭maj7', beat: 1, duration: 3 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
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
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 3 },
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 4, duration: 1 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'B♭maj7', beat: 1, duration: 3 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
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
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 3 },
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 4, duration: 1 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'B♭maj7', beat: 1, duration: 3 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
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
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 3 },
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 4, duration: 1 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Fmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'B♭maj7', beat: 1, duration: 3 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=zL3wWykAKfs' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
