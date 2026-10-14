import type { Song } from '@/curriculum/types/songLibrary';

export const best_part: Song = {
  id: 'best_part',
  title: 'Best Part',
  artist: 'Daniel Caesar featuring H.E.R.',
  composer: 'Daniel Caesar, H.E.R. and Teddy Genius',
  year: 2017,
  historicalDescription:
    "Daniel Caesar and H.E.R. trade verses on 'Best Part', a hushed duet from Caesar's debut album 'Freudian' built on a slow loop of four seventh chords with a borrowed B♭ major 7 at the end. It becomes both singers' second No. 1 on Billboard's Adult R&B chart and wins the Grammy for Best R&B Performance in 2019, and it goes on to be one of the most covered love songs of its generation.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 75,
  timeSignature: [4, 4],
  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],
  credits: [
    {
      name: 'Daniel Caesar',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'daniel-caesar',
    },
    { name: 'H.E.R.', role: 'vocals', primary: true, artistGlobeId: 'h-e-r' },
    {
      name: 'Daniel Caesar',
      role: 'songwriter',
      artistGlobeId: 'daniel-caesar',
    },
    { name: 'H.E.R.', role: 'songwriter', artistGlobeId: 'h-e-r' },
    { name: 'Teddy Genius', role: 'songwriter', artistGlobeId: 'teddy-genius' },
    { name: 'Jordan Evans', role: 'producer', artistGlobeId: 'jordan-evans' },
    {
      name: 'Matthew Burnett',
      role: 'producer',
      artistGlobeId: 'matthew-burnett',
    },
  ],
  releases: [{ releaseId: 'daniel-caesar-freudian' }],
  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      notes:
        "The chords are played on beat 1, the 'and' of 2 (tied into beat 3), with rests between: a lazy, behind-the-beat comp.",
      bars: [
        {
          chords: [
            { degree: '1 maj7', chordName: 'Dmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj7', chordName: 'B♭maj7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      notes:
        "The chords are played on beat 1, the 'and' of 2 (tied into beat 3), with rests between: a lazy, behind-the-beat comp.",
      bars: [
        {
          chords: [
            { degree: '1 maj7', chordName: 'Dmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj7', chordName: 'B♭maj7', beat: 1, duration: 4 },
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
            { degree: '1 maj7', chordName: 'Dmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj7', chordName: 'B♭maj7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      notes:
        "The chords are played on beat 1, the 'and' of 2 (tied into beat 3), with rests between: a lazy, behind-the-beat comp.",
      bars: [
        {
          chords: [
            { degree: '1 maj7', chordName: 'Dmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj7', chordName: 'B♭maj7', beat: 1, duration: 4 },
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
            { degree: '1 maj7', chordName: 'Dmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj7', chordName: 'B♭maj7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      notes:
        "The chords are played on beat 1, the 'and' of 2 (tied into beat 3), with rests between: a lazy, behind-the-beat comp.",
      bars: [
        {
          chords: [
            { degree: '1 maj7', chordName: 'Dmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj7', chordName: 'B♭maj7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=hKgl5-lkT8U' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
