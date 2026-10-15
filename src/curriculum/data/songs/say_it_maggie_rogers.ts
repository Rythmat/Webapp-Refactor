import type { Song } from '@/curriculum/types/songLibrary';

export const say_it_maggie_rogers: Song = {
  id: 'say_it_maggie_rogers',
  title: 'Say It',
  artist: 'Maggie Rogers',
  composer: 'Maggie Rogers, Jack Hallenbeck and Tor Miller',
  year: 2019,
  historicalDescription:
    "Maggie Rogers sings 'Say It' on her major-label debut 'Heard It in a Past Life', a soft, unhurried R&B-tinged song about waiting for someone to name what is between you. Produced with Ricky Reed and Jack Hallenbeck, its lush E-flat 6/9 chords and gentle groove show the warmer side of an album that debuts at No. 2 on the Billboard 200.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 85,
  timeSignature: [4, 4],
  difficulty: 2,
  genreTags: ['pop', 'rnb'],
  techniques: [],
  credits: [
    {
      name: 'Maggie Rogers',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'maggie-rogers',
    },
    {
      name: 'Maggie Rogers',
      role: 'songwriter',
      artistGlobeId: 'maggie-rogers',
    },
    {
      name: 'Jack Hallenbeck',
      role: 'songwriter',
      artistGlobeId: 'jack-hallenbeck',
    },
    { name: 'Tor Miller', role: 'songwriter', artistGlobeId: 'tor-miller' },
    { name: 'Maggie Rogers', role: 'producer', artistGlobeId: 'maggie-rogers' },
    {
      name: 'Jack Hallenbeck',
      role: 'producer',
      artistGlobeId: 'jack-hallenbeck',
    },
    { name: 'Ricky Reed', role: 'producer', artistGlobeId: 'ricky-reed' },
  ],
  releases: [{ releaseId: 'maggie-rogers-heard-it-in-a-past-life' }],
  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '4 maj69', chordName: 'E♭6/9', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Dmin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        {
          chords: [
            { degree: '4 maj69', chordName: 'E♭6/9', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Gmin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj69', chordName: 'E♭6/9', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 dim', chordName: 'Adim', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Gmin', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '4 maj69', chordName: 'E♭6/9', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Gmin', beat: 1, duration: 4 },
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
            { degree: '4 maj69', chordName: 'E♭6/9', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 min', chordName: 'Dmin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        {
          chords: [
            { degree: '4 maj69', chordName: 'E♭6/9', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Gmin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj69', chordName: 'E♭6/9', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 dim', chordName: 'Adim', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Gmin', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '4 maj69', chordName: 'E♭6/9', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Gmin', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '4 maj69', chordName: 'E♭6/9', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Gmin', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          cue: 'Repeat and Fade',
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=qwWL6GTK1RA' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
