import type { Song } from '@/curriculum/types/songLibrary';

export const marry_me: Song = {
  id: 'marry_me',
  title: 'Marry Me',
  artist: 'Train',
  year: 2010,
  historicalDescription:
    "Train releases 'Marry Me', a sweeping pop ballad that becomes one of the defining wedding songs of its era. Written by frontman Pat Monahan, its delicate acoustic guitar and earnest romanticism cut through a pop landscape dominated by electronic production — a reminder that vulnerability still sells. The song revives Train's commercial momentum and cements their reputation as architects of adult contemporary radio.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 180,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    { name: 'Pat Monahan', role: 'songwriter', artistGlobeId: 'pat-monahan' },
    {
      name: 'Train',
      role: 'performer',
      ensemble: true,
      artistGlobeId: 'train',
      primary: true,
    },
  ],
  releases: [{ releaseId: 'train-save-me-san-francisco', track: 11 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '5 maj/7', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 maj/♯4', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/♯4', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 maj/♯4', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/♯4', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '5 maj/7', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 maj/♯4', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/♯4', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'F/A', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 maj/♯4', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/♯4', chordName: 'G/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '5 maj/7', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ghZt2cILcCU' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/train.webp',
  popularity: 50,
};
