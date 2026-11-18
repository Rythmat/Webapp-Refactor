import type { Song } from '@/curriculum/types/songLibrary';

export const never_gonna_give_you_up: Song = {
  id: 'never_gonna_give_you_up',
  title: 'Never Gonna Give You Up',
  artist: 'Rick Astley',
  year: 1987,
  historicalDescription:
    "Rick Astley releases 'Never Gonna Give You Up', a polished synth-pop anthem that shoots to #1 in the UK and the US, launching the then-21-year-old from Newton-le-Willows into global stardom. Produced by Stock Aitken Waterman, it becomes the defining sound of late-80s British pop — glossy, euphoric, and inescapable. Decades later, the song is reborn as 'Rickrolling', one of the internet's most enduring pranks.",
  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 114,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['electronic', 'pop'],
  techniques: [],
  session: { studioId: 'pwl-studios' },
  credits: [
    {
      name: 'Rick Astley',
      role: 'vocals',
      artistGlobeId: 'rick-astley',
      primary: true,
    },
    { name: 'Matt Aitken', role: 'performer', artistGlobeId: 'matt-aitken' },
    { name: 'Mark McGuire', role: 'engineer' },
    { name: 'Mike Stock', role: 'performer', artistGlobeId: 'mike-stock' },
    { name: 'Mike Stock', role: 'producer', artistGlobeId: 'mike-stock' },
    {
      name: 'Stock Aitken Waterman',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'stock-aitken-waterman',
    },
    { name: 'Phil Harding', role: 'engineer' },
    { name: 'Mae McKenna', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Jamie Bromfield', role: 'engineer' },
    { name: 'Matt Aitken', role: 'producer', artistGlobeId: 'matt-aitken' },
    { name: 'Matt Aitken', role: 'songwriter', artistGlobeId: 'matt-aitken' },
    {
      name: 'Pete Waterman',
      role: 'songwriter',
      artistGlobeId: 'pete-waterman',
    },
    { name: 'Mike Stock', role: 'songwriter', artistGlobeId: 'mike-stock' },
    { name: 'A. Linn', role: 'performer', instrument: 'drum-kit' },
    {
      name: 'Suzanne Rhatigan',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    { name: 'Pete Hammond', role: 'engineer' },
    { name: 'Dee Lewis', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Karen Hewitt', role: 'engineer' },
    { name: 'Gordon Jenkins', role: 'arranger' },
    { name: 'Shirley Lewis', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Mike Duffy', role: 'engineer' },
    { name: 'Pete Waterman', role: 'producer', artistGlobeId: 'pete-waterman' },
  ],
  releases: [{ releaseId: 'rick-astley-whenever-you-need-somebody' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭m7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fm7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'B♭m', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', stem: 'down', dot: true },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭m7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fm7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'B♭m', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', stem: 'down' },
            { value: '2', dot: true, stem: 'down' },
          ],
        },
      ],
      repeatCount: 2,
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [
            {
              degree: '4 maj7/6',
              chordName: 'G♭maj7/B♭',
              beat: 1,
              duration: 3.5,
            },
            {
              degree: '3 min7/6',
              chordName: 'Fm7/B♭',
              beat: 4.5,
              duration: 0.5,
            },
          ],
          repeatStart: true,
        },
        {
          chords: [],
        },
        {
          chords: [
            {
              degree: '4 maj7/6',
              chordName: 'G♭maj7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true, rest: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            {
              degree: '2 min9',
              chordName: 'E♭m9',
              beat: 1,
              duration: 1.5,
            },
            {
              degree: '3 min7/5',
              chordName: 'Fm7/A♭',
              beat: 2.5,
              duration: 2.5,
            },
          ],
          rhythm: [
            { value: '4', stem: 'down' },
            { value: '8', rest: true },
            { value: '8', stem: 'down', tie: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            {
              degree: '4 maj7/6',
              chordName: 'G♭maj7/B♭',
              beat: 1,
              duration: 3.5,
            },
            {
              degree: '3 min7/6',
              chordName: 'Fm7/B♭',
              beat: 4.5,
              duration: 0.5,
            },
          ],
        },
        {
          chords: [],
        },
        {
          chords: [
            {
              degree: '4 maj7/6',
              chordName: 'G♭maj7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true, rest: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            {
              degree: '2 min9',
              chordName: 'E♭m9',
              beat: 1,
              duration: 1.5,
            },
            {
              degree: '3 min7/5',
              chordName: 'Fm7/A♭',
              beat: 2.5,
              duration: 2.5,
            },
          ],
          rhythm: [
            { value: '4', stem: 'down' },
            { value: '8', rest: true },
            { value: '8', stem: 'down', tie: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [
            {
              degree: '4 maj7/6',
              chordName: 'G♭maj7/B♭',
              beat: 1,
              duration: 3.5,
            },
            {
              degree: '3 min7/6',
              chordName: 'Fm7/B♭',
              beat: 4.5,
              duration: 0.5,
            },
          ],
        },
        {
          chords: [],
        },
        {
          chords: [
            {
              degree: '4 maj7/6',
              chordName: 'G♭maj7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true, rest: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            {
              degree: '4 maj7/6',
              chordName: 'G♭maj7/B♭',
              beat: 1,
              duration: 1.5,
            },
            {
              degree: '3 min7/6',
              chordName: 'Fm7/B♭',
              beat: 2.5,
              duration: 2.5,
            },
          ],
          rhythm: [
            { value: '4', stem: 'down' },
            { value: '8', rest: true },
            { value: '8', stem: 'down', tie: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭m7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fm7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'B♭m', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭m7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fm7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'B♭m', beat: 2, duration: 2 },
          ],
          rhythm: [
            { value: '4', stem: 'down' },
            { value: '2', dot: true, stem: 'down', rest: true },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭m7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fm7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'B♭m', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭m7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fm7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'B♭m', beat: 2, duration: 2 },
          ],
          rhythm: [
            { value: '4', stem: 'down' },
            { value: '2', dot: true, stem: 'down' },
          ],
        },
      ],
    },
    {
      id: 'chorus_10',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭m7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fm7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'B♭m', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭m7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fm7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'B♭m', beat: 2, duration: 2 },
          ],
          rhythm: [
            { value: '4', stem: 'down' },
            { value: '2', dot: true, stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭m7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fm7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'B♭m', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭m7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fm7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'B♭m', beat: 2, duration: 2 },
          ],
          rhythm: [
            { value: '4', stem: 'down' },
            { value: '2', dot: true, stem: 'down' },
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
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
          cue: 'Instrumental breakdown',
          repeatStart: true,
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_11',
      label: 'Verse',
      bars: [
        {
          chords: [],
          repeatStart: true,
          cue: 'Vocals alone with Drums',
        },
        {
          chords: [],
        },
        {
          chords: [],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true, rest: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            { degree: '2 min9', chordName: 'E♭m9', beat: 1, duration: 1.5 },
            {
              degree: '3 min7/5',
              chordName: 'Fm7/A♭',
              beat: 2.5,
              duration: 2.5,
            },
          ],
          rhythm: [
            { value: '4', stem: 'down' },
            { value: '8', rest: true },
            { value: '8', stem: 'down', tie: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
          cue: 'Chords Enter',
        },
        {
          chords: [],
          repeatStart: true,
          cue: 'Vocals alone with Drums',
        },
        {
          chords: [],
        },
        {
          chords: [],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true, rest: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            { degree: '2 min9', chordName: 'E♭m9', beat: 1, duration: 1.5 },
            {
              degree: '3 min7/5',
              chordName: 'Fm7/A♭',
              beat: 2.5,
              duration: 2.5,
            },
          ],
          rhythm: [
            { value: '4', stem: 'down' },
            { value: '8', rest: true },
            { value: '8', stem: 'down', tie: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
          cue: 'Chords Enter',
        },
      ],
    },
    {
      id: 'pre_chorus_12',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [
            {
              degree: '4 maj7/6',
              chordName: 'G♭maj7/B♭',
              beat: 1,
              duration: 3.5,
            },
            {
              degree: '3 min7/6',
              chordName: 'Fm7/B♭',
              beat: 4.5,
              duration: 0.5,
            },
          ],
        },
        {
          chords: [],
        },
        {
          chords: [
            {
              degree: '4 maj7/6',
              chordName: 'G♭maj7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true, rest: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            {
              degree: '4 maj7/6',
              chordName: 'G♭maj7/B♭',
              beat: 1,
              duration: 1.5,
            },
            {
              degree: '3 min7/6',
              chordName: 'Fm7/B♭',
              beat: 2.5,
              duration: 2.5,
            },
          ],
          rhythm: [
            { value: '4', stem: 'down' },
            { value: '8', rest: true },
            { value: '8', stem: 'down', tie: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
      ],
    },
    {
      id: 'chorus_9',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭m7', beat: 1, duration: 1.5 },
            { degree: '5 maj', chordName: 'A♭', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fm7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'B♭m', beat: 2, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭m7', beat: 1, duration: 1.5 },
            { degree: '5 maj', chordName: 'A♭', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fm7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'B♭m', beat: 2, duration: 2 },
          ],
          rhythm: [
            { value: '4', stem: 'down' },
            { value: '2', dot: true, stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭m7', beat: 1, duration: 1.5 },
            { degree: '5 maj', chordName: 'A♭', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fm7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'B♭m', beat: 2, duration: 2 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭m7', beat: 1, duration: 1.5 },
            { degree: '5 maj', chordName: 'A♭', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true, stem: 'down' },
            { value: '8', stem: 'down', tie: true },
            { value: '2', stem: 'down' },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fm7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'B♭m', beat: 2, duration: 2 },
          ],
          rhythm: [
            { value: '4', stem: 'down' },
            { value: '2', dot: true, stem: 'down' },
          ],
          repeatEnd: true,
          cue: 'Vamp and Fade',
        },
      ],
      repeatCount: 4,
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=dQw4w9WgXcQ' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/rick-astley.webp',
  popularity: 50,
};
