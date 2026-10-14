import type { Song } from '@/curriculum/types/songLibrary';

export const glory: Song = {
  id: 'glory',
  title: 'Glory',
  artist: 'Common and John Legend',
  composer: 'John Legend, Common and Rhymefest',
  year: 2014,
  historicalDescription:
    "Common and John Legend release 'Glory', the closing song of Ava DuVernay's film 'Selma' about the 1965 voting-rights marches from Selma to Montgomery. Legend's gospel-rooted hook and Common's verses tie the civil-rights movement of the 1960s to the protests of their own day. The song wins the Golden Globe and the Academy Award for Best Original Song, and at the 2015 Oscars the two perform it on a staging of Selma's Edmund Pettus Bridge.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 84,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['hip-hop', 'rnb'],
  techniques: [],
  credits: [
    { name: 'Common', role: 'vocals', primary: true, artistGlobeId: 'common' },
    {
      name: 'John Legend',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'john-legend',
    },
    {
      name: 'John Legend',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'john-legend',
    },
    { name: 'John Legend', role: 'songwriter', artistGlobeId: 'john-legend' },
    { name: 'Common', role: 'songwriter', artistGlobeId: 'common' },
    { name: 'Rhymefest', role: 'songwriter', artistGlobeId: 'rhymefest' },
    { name: 'John Legend', role: 'producer', artistGlobeId: 'john-legend' },
  ],

  sections: [
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        {
          repeatStart: true,
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'C/E', beat: 1, duration: 3 },
            { degree: '♭6 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          repeatEnd: true,
          repeatTimes: 2,
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          repeatStart: true,
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '♭7 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'C/E', beat: 1, duration: 3 },
            { degree: '♭6 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          repeatEnd: true,
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          repeatStart: true,
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '♭7 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'C/E', beat: 1, duration: 3 },
            { degree: '♭6 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          repeatEnd: true,
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
          cue: 'Repeat through the verse',
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        {
          repeatStart: true,
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'C/E', beat: 1, duration: 3 },
            { degree: '♭6 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          repeatEnd: true,
          repeatTimes: 2,
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          repeatStart: true,
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '♭7 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'C/E', beat: 1, duration: 3 },
            { degree: '♭6 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          repeatEnd: true,
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '4 min', chordName: 'Dmin', beat: 1, duration: 3 },
            { degree: '♭3 maj/5', chordName: 'C/E', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'F', beat: 1, duration: 3 },
            { degree: '♭7 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min', chordName: 'Dmin', beat: 1, duration: 3 },
            { degree: '♭3 maj/5', chordName: 'C/E', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'F', beat: 1, duration: 3 },
            { degree: '♭7 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '1 min7', chordName: 'C/A', beat: 4, duration: 1 },
          ],
        },
        {
          cue: 'Back to the verse',
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          repeatStart: true,
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '♭7 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'C/E', beat: 1, duration: 3 },
            { degree: '♭6 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          repeatEnd: true,
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
          cue: 'Repeat through the verse',
        },
      ],
    },
    {
      id: 'pre_chorus_3',
      label: 'Pre-Chorus 3',
      bars: [
        {
          repeatStart: true,
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'C/E', beat: 1, duration: 3 },
            { degree: '♭6 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          repeatEnd: true,
          repeatTimes: 2,
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          repeatStart: true,
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '♭7 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'C/E', beat: 1, duration: 3 },
            { degree: '♭6 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          repeatEnd: true,
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatTimes: 2,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=HUZOKvYcx_o' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/john-legend.webp',
  popularity: 50,
};
