import type { Song } from '@/curriculum/types/songLibrary';

export const making_flippy_floppy: Song = {
  id: 'making_flippy_floppy',
  title: 'Making Flippy Floppy',
  artist: 'Talking Heads',
  year: 1983,
  historicalDescription:
    "Talking Heads release 'Making Flippy Floppy' on their landmark album 'Speaking in Tongues' — their first record written and recorded entirely as a full band. The track pulses with polyrhythmic funk grooves and David Byrne's jittery, stream-of-consciousness lyricism, capturing the New York art-rock scene at its most restless and danceable. It signals Talking Heads pushing deeper into the Afrobeat and funk territory that defines their early 1980s peak.",
  key: 'G mixolydian',
  keyRoot: 67,
  mode: 'mixolydian',
  tempo: 123,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    {
      name: 'Jerry Harrison',
      role: 'performer',
      artistGlobeId: 'jerry-harrison',
    },
    {
      name: 'Jerry Harrison',
      role: 'songwriter',
      artistGlobeId: 'jerry-harrison',
    },
    { name: 'Butch Jones', role: 'engineer' },
    {
      name: 'Chris Frantz',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'chris-frantz',
    },
    {
      name: 'Chris Frantz',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'chris-frantz',
    },
    { name: 'David Byrne', role: 'songwriter', artistGlobeId: 'david-byrne' },
    {
      name: 'David Byrne',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'david-byrne',
    },
    {
      name: 'Chris Frantz',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'chris-frantz',
    },
    { name: 'David Byrne', role: 'performer', artistGlobeId: 'david-byrne' },
    { name: 'Alex Weir', role: 'performer' },
    { name: 'David Byrne', role: 'vocals', artistGlobeId: 'david-byrne' },
    {
      name: 'Talking Heads',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'talking-heads',
    },
    { name: 'Chris Frantz', role: 'songwriter', artistGlobeId: 'chris-frantz' },
    {
      name: 'Tina Weymouth',
      role: 'songwriter',
      artistGlobeId: 'tina-weymouth',
    },
    {
      name: 'Tina Weymouth',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'tina-weymouth',
    },
    {
      name: 'Jerry Harrison',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'jerry-harrison',
    },
    { name: 'Alex Sadkin', role: 'engineer' },
    {
      name: 'Tina Weymouth',
      role: 'performer',
      artistGlobeId: 'tina-weymouth',
    },
    { name: 'Shankar', role: 'performer', instrument: 'violin' },
    {
      name: 'Tina Weymouth',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'tina-weymouth',
    },
  ],
  releases: [{ releaseId: 'talking-heads-speaking-in-tongues' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'F/G', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'F/G', beat: 1, duration: 4 },
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
            { degree: '♭7 maj/1', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 3,
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=xphLY5ucIpQ' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
