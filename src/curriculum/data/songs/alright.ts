import type { Song } from '@/curriculum/types/songLibrary';

export const alright: Song = {
  id: 'alright',
  title: 'Alright',
  artist: 'Kendrick Lamar',
  composer: 'Kendrick Lamar, Pharrell Williams and Sounwave',
  year: 2015,
  historicalDescription:
    "Kendrick Lamar releases 'Alright' from 'To Pimp a Butterfly', a jazz-inflected anthem of hope produced by Pharrell Williams and Sounwave over a G minor 9 vamp. Within weeks protesters against police brutality are chanting its chorus in the streets, and it becomes an unofficial anthem of the Black Lives Matter movement. It wins the Grammys for Best Rap Performance and Best Rap Song, and Pitchfork names it the best song of the 2010s.",
  key: 'G dorian',
  keyRoot: 67,
  mode: 'dorian',
  tempo: 110,
  timeSignature: [4, 4],
  difficulty: 2,
  genreTags: ['hip-hop', 'jazz'],
  techniques: [],
  credits: [
    {
      name: 'Kendrick Lamar',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'kendrick-lamar',
    },
    {
      name: 'Pharrell Williams',
      role: 'vocals',
      artistGlobeId: 'pharrell-williams',
    },
    {
      name: 'Kendrick Lamar',
      role: 'songwriter',
      artistGlobeId: 'kendrick-lamar',
    },
    {
      name: 'Pharrell Williams',
      role: 'songwriter',
      artistGlobeId: 'pharrell-williams',
    },
    { name: 'Sounwave', role: 'songwriter', artistGlobeId: 'sounwave' },
    {
      name: 'Pharrell Williams',
      role: 'producer',
      artistGlobeId: 'pharrell-williams',
    },
    { name: 'Sounwave', role: 'producer', artistGlobeId: 'sounwave' },
  ],
  releases: [{ releaseId: 'kendrick-lamar-to-pimp-a-butterfly' }],
  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      notes: 'G minor 9 arrives on beat 4 and ties over the barline.',
      bars: [
        {
          chords: [
            { degree: '♭2 min9', chordName: 'A♭min9', beat: 1, duration: 3 },
            { degree: '1 min9', chordName: 'Gmin9', beat: 4, duration: 1 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
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
            { degree: '♭2 min9', chordName: 'A♭min9', beat: 1, duration: 3 },
            { degree: '1 min9', chordName: 'Gmin9', beat: 4, duration: 1 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
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
            { degree: '♭2 min9', chordName: 'A♭min9', beat: 1, duration: 3 },
            { degree: '1 min9', chordName: 'Gmin9', beat: 4, duration: 1 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
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
            { degree: '♭2 min9', chordName: 'A♭min9', beat: 1, duration: 3 },
            { degree: '1 min9', chordName: 'Gmin9', beat: 4, duration: 1 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
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
            { degree: '♭2 min9', chordName: 'A♭min9', beat: 1, duration: 3 },
            { degree: '1 min9', chordName: 'Gmin9', beat: 4, duration: 1 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
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
            { degree: '♭2 min9', chordName: 'A♭min9', beat: 1, duration: 3 },
            { degree: '1 min9', chordName: 'Gmin9', beat: 4, duration: 1 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '♭2 min9', chordName: 'A♭min9', beat: 1, duration: 3 },
            { degree: '1 min9', chordName: 'Gmin9', beat: 4, duration: 1 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          cue: 'Repeat through the verse',
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '♭2 min9', chordName: 'A♭min9', beat: 1, duration: 3 },
            { degree: '1 min9', chordName: 'Gmin9', beat: 4, duration: 1 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min9', chordName: 'Gmin9', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          cue: 'Repeat and Fade',
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Z-48u_uWMHY' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
