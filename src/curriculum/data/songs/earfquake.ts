import type { Song } from '@/curriculum/types/songLibrary';

export const earfquake: Song = {
  id: 'earfquake',
  title: 'EARFQUAKE',
  artist: 'Tyler, The Creator',
  composer: 'Tyler, The Creator and Playboi Carti',
  year: 2019,
  historicalDescription:
    "Tyler, The Creator releases 'EARFQUAKE' from his album 'IGOR', a lovesick plea sung over a woozy loop of four seventh chords, with background vocals from Charlie Wilson and an uncredited verse from Playboi Carti. It becomes his highest-charting song to that point, reaching No. 13 on the Billboard Hot 100, and 'IGOR' wins the Grammy for Best Rap Album.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 80,
  timeSignature: [4, 4],
  difficulty: 2,
  genreTags: ['hip-hop', 'rnb'],
  techniques: [],
  credits: [
    {
      name: 'Tyler, The Creator',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'tyler-the-creator',
    },
    { name: 'Playboi Carti', role: 'vocals', artistGlobeId: 'playboi-carti' },
    { name: 'Charlie Wilson', role: 'vocals', artistGlobeId: 'charlie-wilson' },
    {
      name: 'Tyler, The Creator',
      role: 'songwriter',
      artistGlobeId: 'tyler-the-creator',
    },
    {
      name: 'Playboi Carti',
      role: 'songwriter',
      artistGlobeId: 'playboi-carti',
    },
    {
      name: 'Tyler, The Creator',
      role: 'producer',
      artistGlobeId: 'tyler-the-creator',
    },
  ],
  releases: [{ releaseId: 'tyler-the-creator-igor' }],
  sections: [
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '4 maj7', chordName: 'Amaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
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
            { degree: '4 maj7', chordName: 'Amaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
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
            { degree: '4 maj7', chordName: 'Amaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
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
            { degree: '4 maj7', chordName: 'Amaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
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
            { degree: '4 maj7', chordName: 'Amaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=HmAsUQEFYGI' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
