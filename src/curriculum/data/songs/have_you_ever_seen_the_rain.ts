import type { Song } from '@/curriculum/types/songLibrary';

export const have_you_ever_seen_the_rain: Song = {
  id: 'have_you_ever_seen_the_rain',
  title: 'Have You Ever Seen The Rain?',
  artist: 'Creedence Clearwater Revival',
  year: 1970,
  historicalDescription:
    "Creedence Clearwater Revival record 'Have You Ever Seen The Rain?' during one of the most turbulent periods in American history, as the Vietnam War divides the nation. Written by John Fogerty as a reflection on turmoil within the band itself, the song transcends its origins — becoming an enduring anthem of bittersweet resilience that resonates across generations.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 116,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'wally-heider-studios' },
  credits: [
    { name: 'John Fogerty', role: 'arranger', artistGlobeId: 'john-fogerty' },
    { name: 'John Fogerty', role: 'songwriter', artistGlobeId: 'john-fogerty' },
    { name: 'Russ Gary', role: 'engineer' },
    { name: 'John Fogerty', role: 'producer', artistGlobeId: 'john-fogerty' },
    {
      name: 'Stu Cook',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'stu-cook',
    },
    { name: 'John Fogerty', role: 'performer', artistGlobeId: 'john-fogerty' },
    {
      name: 'Doug Clifford',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'doug-clifford',
    },
    { name: 'John Fogerty', role: 'vocals', artistGlobeId: 'john-fogerty' },
    { name: 'Tom Fogerty', role: 'performer', artistGlobeId: 'tom-fogerty' },
  ],
  releases: [{ releaseId: 'creedence-clearwater-revival-pendulum' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'G/B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '6 min7/5', chordName: 'Amin7/G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj/7', chordName: 'C/B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '6 min7/5', chordName: 'Amin7/G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'G/B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '6 min7/5', chordName: 'Amin7/G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=u1V8YRJnr4Q' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/creedence-clearwater-revival.webp',
  popularity: 50,
};
