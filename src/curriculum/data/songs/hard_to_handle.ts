import type { Song } from '@/curriculum/types/songLibrary';

export const hard_to_handle: Song = {
  id: 'hard_to_handle',
  title: 'Hard To Handle',
  artist: 'The Black Crowes',
  year: 1990,
  historicalDescription:
    "The Black Crowes release their swaggering cover of Otis Redding's 'Hard To Handle' as one of the breakout moments from their debut era, transplanting raw Southern soul into a hard rock framework. From Atlanta, the Robinson brothers channel the spirit of classic rock and R&B at a time when grunge is beginning to dominate — proving there's still an appetite for unabashed, groove-driven rock and roll.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 96,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  credits: [
    { name: 'Jeff Cease', role: 'performer', artistGlobeId: 'jeff-cease' },
    {
      name: 'George Drakoulias',
      role: 'producer',
      artistGlobeId: 'george-drakoulias',
    },
    { name: 'Johnny Colt', role: 'performer', artistGlobeId: 'johnny-colt' },
    { name: 'Otis Redding', role: 'songwriter', artistGlobeId: 'otis-redding' },
    {
      name: 'Alvertis Isbell',
      role: 'songwriter',
      artistGlobeId: 'alvertis-isbell',
    },
    {
      name: 'Brendan O’Brien',
      role: 'engineer',
      artistGlobeId: 'brendan-obrien',
    },
    {
      name: 'Rich Robinson',
      role: 'performer',
      artistGlobeId: 'rich-robinson',
    },
    {
      name: 'Steve Gorman',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'steve-gorman',
    },
    { name: 'Chris Robinson', role: 'vocals', artistGlobeId: 'chris-robinson' },
    { name: 'Allen Jones', role: 'songwriter', artistGlobeId: 'allen-jones' },
  ],
  releases: [
    { releaseId: 'the-black-crowes-shake-your-money-maker', track: 6 },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [] }, { chords: [] }, { chords: [] }, { chords: [] }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        { chords: [], restBars: 2 },
        {
          chords: [
            { degree: '4 maj', chordName: 'E♭', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'F', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
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
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        { chords: [], restBars: 2 },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=BRcs_OzQb14' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-black-crowes.webp',
  popularity: 50,
};
