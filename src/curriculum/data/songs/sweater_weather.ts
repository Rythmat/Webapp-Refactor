import type { Song } from '@/curriculum/types/songLibrary';

export const sweater_weather: Song = {
  id: 'sweater_weather',
  title: 'Sweater Weather',
  artist: 'The Neighbourhood',
  composer: 'Jesse Rutherford, Zach Abels and Jeremy Freedman',
  year: 2012,
  historicalDescription:
    "The Neighbourhood release 'Sweater Weather', the lead single from their debut album 'I Love You.', a moody, reverb-soaked love song from the California band. It tops Billboard's Alternative Airplay chart for 11 weeks and reaches No. 14 on the Hot 100, then finds a second life on TikTok in 2020 and becomes one of the most streamed songs in Spotify's history.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 124,
  timeSignature: [4, 4],
  difficulty: 2,
  genreTags: ['rock', 'pop'],
  techniques: [],
  credits: [
    {
      name: 'Jesse Rutherford',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'jesse-rutherford',
    },
    {
      name: 'The Neighbourhood',
      role: 'performer',
      ensemble: true,
      primary: true,
      artistGlobeId: 'the-neighbourhood',
    },
    {
      name: 'Jesse Rutherford',
      role: 'songwriter',
      artistGlobeId: 'jesse-rutherford',
    },
    { name: 'Zach Abels', role: 'songwriter', artistGlobeId: 'zach-abels' },
    {
      name: 'Jeremy Freedman',
      role: 'songwriter',
      artistGlobeId: 'jeremy-freedman',
    },
    {
      name: 'Justyn Pilbrow',
      role: 'producer',
      artistGlobeId: 'justyn-pilbrow',
    },
  ],
  releases: [{ releaseId: 'the-neighbourhood-i-love-you' }],
  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '4 maj7', chordName: 'E♭maj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom9sus4', chordName: 'Gmin/C', beat: 1, duration: 2 },
            { degree: '1 maj6', chordName: 'Gmin/B♭', beat: 3, duration: 2 },
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
            { degree: '4 maj7', chordName: 'E♭maj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
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
            { degree: '4 maj7', chordName: 'E♭maj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom9sus4', chordName: 'Gmin/C', beat: 1, duration: 2 },
            { degree: '1 maj6', chordName: 'Gmin/B♭', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '4 maj7', chordName: 'E♭maj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          repeatEnd: true,
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
            { degree: '4 maj7', chordName: 'E♭maj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom9sus4', chordName: 'Gmin/C', beat: 1, duration: 2 },
            { degree: '1 maj6', chordName: 'Gmin/B♭', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '4 maj7', chordName: 'E♭maj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=GCdwKhTtNNw' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
