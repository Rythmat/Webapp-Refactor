import type { Song } from '@/curriculum/types/songLibrary';

export const still_dre: Song = {
  id: 'still_dre',
  title: 'Still D.R.E.',
  artist: 'Dr. Dre featuring Snoop Dogg',
  composer: 'Dr. Dre, Jay-Z, Mel-Man and Scott Storch',
  year: 1999,
  historicalDescription:
    "Dr. Dre returns with 'Still D.R.E.', the lead single from '2001', reuniting with Snoop Dogg over a stark, staccato piano riff that Scott Storch brings to the session; Jay-Z ghostwrites the verses. The riff becomes one of the most recognisable in hip hop, the video passes a billion views, and in 2022 Dre and Snoop close the Super Bowl LVI halftime show with it.",
  key: 'B♭ minor',
  keyRoot: 70,
  mode: 'minor',
  tempo: 90,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: ['hip-hop'],
  techniques: [],
  credits: [
    { name: 'Dr. Dre', role: 'vocals', primary: true, artistGlobeId: 'dr-dre' },
    {
      name: 'Snoop Dogg',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'snoop-dogg',
    },
    {
      name: 'Scott Storch',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'scott-storch',
    },
    { name: 'Dr. Dre', role: 'songwriter', artistGlobeId: 'dr-dre' },
    { name: 'Jay-Z', role: 'songwriter', artistGlobeId: 'jay-z' },
    { name: 'Mel-Man', role: 'songwriter', artistGlobeId: 'mel-man' },
    { name: 'Scott Storch', role: 'songwriter', artistGlobeId: 'scott-storch' },
    { name: 'Dr. Dre', role: 'producer', artistGlobeId: 'dr-dre' },
    { name: 'Mel-Man', role: 'producer', artistGlobeId: 'mel-man' },
    { name: 'Scott Storch', role: 'producer', artistGlobeId: 'scott-storch' },
  ],
  releases: [{ releaseId: 'dr-dre-2001' }],
  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      notes:
        "The piano riff is straight eighth notes, accented on beat 1, and in the second bar on beat 1 and the 'and' of 2, where F minor arrives.",
      bars: [
        {
          chords: [
            { degree: '1 min', chordName: 'B♭min', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 sus4', chordName: 'Fsus4', beat: 1, duration: 1.5 },
            { degree: '5 min', chordName: 'Fmin', beat: 2.5, duration: 2.5 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min', chordName: 'B♭min', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 sus4', chordName: 'Fsus4', beat: 1, duration: 1.5 },
            { degree: '5 min', chordName: 'Fmin', beat: 2.5, duration: 2.5 },
          ],
          repeatEnd: true,
          cue: 'Repeat through the verse',
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '1 min', chordName: 'B♭min', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 sus4', chordName: 'Fsus4', beat: 1, duration: 1.5 },
            { degree: '5 min', chordName: 'Fmin', beat: 2.5, duration: 2.5 },
          ],
          repeatEnd: true,
          repeatTimes: 4,
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min', chordName: 'B♭min', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 sus4', chordName: 'Fsus4', beat: 1, duration: 1.5 },
            { degree: '5 min', chordName: 'Fmin', beat: 2.5, duration: 2.5 },
          ],
          repeatEnd: true,
          cue: 'Repeat through the verse',
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '1 min', chordName: 'B♭min', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 sus4', chordName: 'Fsus4', beat: 1, duration: 1.5 },
            { degree: '5 min', chordName: 'Fmin', beat: 2.5, duration: 2.5 },
          ],
          repeatEnd: true,
          repeatTimes: 4,
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 min', chordName: 'B♭min', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 sus4', chordName: 'Fsus4', beat: 1, duration: 1.5 },
            { degree: '5 min', chordName: 'Fmin', beat: 2.5, duration: 2.5 },
          ],
          repeatEnd: true,
          cue: 'Repeat through the verse',
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '1 min', chordName: 'B♭min', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 sus4', chordName: 'Fsus4', beat: 1, duration: 1.5 },
            { degree: '5 min', chordName: 'Fmin', beat: 2.5, duration: 2.5 },
          ],
          repeatEnd: true,
          repeatTimes: 4,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 min', chordName: 'B♭min', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 sus4', chordName: 'Fsus4', beat: 1, duration: 1.5 },
            { degree: '5 min', chordName: 'Fmin', beat: 2.5, duration: 2.5 },
          ],
          repeatEnd: true,
          cue: 'Repeat and Fade',
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=_CL6n0FJZpk' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
