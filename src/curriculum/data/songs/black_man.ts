import type { Song } from '@/curriculum/types/songLibrary';

export const black_man: Song = {
  id: 'black_man',
  title: 'Black Man',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'Black Man' as part of his landmark double album 'Songs in the Key of Life' in 1976 — a sprawling, ambitious celebration of Black contributions to American history. The song calls out overlooked heroes by name, weaving funk grooves with a civics lesson, insisting that the American story belongs to everyone who built it. It stands as one of Wonder's most overtly political statements.",
  key: 'B♭ minor',
  keyRoot: 70,
  mode: 'minor',
  tempo: 110,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk'],
  techniques: [],
  credits: [
    {
      name: 'Stevie Wonder',
      role: 'songwriter',
      artistGlobeId: 'stevie-wonder',
    },
    { name: 'Steve Madaio', role: 'performer', instrument: 'trumpet' },
    { name: 'Glenn Ferris', role: 'performer', instrument: 'trombone' },
    { name: 'George Bohanon', role: 'performer', instrument: 'trombone' },
    { name: 'Hank Redd', role: 'performer', instrument: 'alto-sax' },
    {
      name: 'Stevie Wonder',
      role: 'vocals',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'Hank Redd', role: 'performer', instrument: 'tenor-sax' },
    {
      name: 'Al Fann Theatrical Ensemble',
      role: 'performer',
      instrument: 'backing-vocals',
      ensemble: true,
    },
    { name: 'Stevie Wonder', role: 'producer', artistGlobeId: 'stevie-wonder' },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'Gary Byrd', role: 'songwriter', artistGlobeId: 'gary-byrd' },
  ],
  releases: [{ releaseId: 'stevie-wonder-songs-in-the-key-of-life' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 3 }, { chords: [] }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom7', chordName: 'G♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7(♯9)', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom7', chordName: 'G♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7(♯9)', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 2, duration: 1 },
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 3, duration: 1 },
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 2, duration: 1 },
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 3, duration: 1 },
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 2, duration: 1 },
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 3, duration: 1 },
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 2, duration: 1 },
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 3, duration: 1 },
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom7', chordName: 'G♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7(♯9)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 maj/♭6', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=pEoE2UQXduA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
