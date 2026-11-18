import { describe, expect, it } from 'vitest';
import type {
  ChordBar,
  Song,
  SongSection,
} from '@/curriculum/types/songLibrary';
import { sectionTypeOfLabel } from '@/daw/model/sections';
import { exportSongToChordRegions } from '../exportToStudio';
import { isSectionLabel, parseSectionLabel } from '../sectionNames';

/**
 * Section names as a chart writes them (owner, 2026-11-15): a label may
 * name the passes it covers ("Verse 1 & 2") and say it is instrumental
 * ("Instrumental Verse"), and the Studio still reads each as its section.
 */

describe('a section’s label', () => {
  it('takes a name and one number, as always', () => {
    expect(parseSectionLabel('Verse 2')).toEqual({
      name: 'Verse',
      number: 2,
      numbers: [2],
      qualifier: null,
      instrumental: false,
    });
    expect(parseSectionLabel('Chorus')?.number).toBeNull();
  });

  it('takes the passes it covers', () => {
    expect(parseSectionLabel('Verse 1 & 2')).toMatchObject({
      name: 'Verse',
      number: 1,
      numbers: [1, 2],
    });
    expect(parseSectionLabel('Verse 4, 5 and 6')?.numbers).toEqual([4, 5, 6]);
  });

  it('takes Instrumental before the name', () => {
    expect(parseSectionLabel('Instrumental Chorus')).toMatchObject({
      name: 'Chorus',
      instrumental: true,
    });
  });

  it('takes Rap before the name, and Coda as a name', () => {
    // California Gurls' Rap Verse; La Vie en Rose's Coda (owner, 2026-11-17).
    expect(parseSectionLabel('Rap Verse')).toMatchObject({
      name: 'Verse',
      qualifier: 'Rap',
      instrumental: false,
    });
    expect(parseSectionLabel('Coda')?.name).toBe('Coda');
  });

  it('still refuses what no chart writes', () => {
    for (const label of [
      'Section J',
      'Verse &',
      'Chorus Instrumental',
      'Verse Rap',
      'A',
    ])
      expect(isSectionLabel(label)).toBe(false);
  });
});

describe('in the Studio', () => {
  it('reads a pass list and an instrumental pass as their section', () => {
    expect(sectionTypeOfLabel('Verse 1 & 2')).toBe('verse');
    expect(sectionTypeOfLabel('Instrumental Verse')).toBe('verse');
    expect(sectionTypeOfLabel('Instrumental Chorus')).toBe('chorus');
    expect(sectionTypeOfLabel('Instrumental')).toBe('interlude');
    expect(sectionTypeOfLabel('Rap Verse')).toBe('verse');
    expect(sectionTypeOfLabel('Coda')).toBe('coda');
  });

  it('numbers the sung verses in order, leaving the instrumental one its name', () => {
    const bar = (marks: Partial<ChordBar> = {}): ChordBar => ({
      chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
      ...marks,
    });
    const section = (label: string, bars: ChordBar[]): SongSection => ({
      id: label,
      label,
      bars,
    });
    const song = {
      id: 't',
      title: 'T',
      artist: 'T',
      key: 'C major',
      keyRoot: 60,
      mode: 'major',
      tempo: 120,
      timeSignature: [4, 4],
      difficulty: 1,
      genreTags: [],
      techniques: [],
      sections: [
        // Played twice: its passes 1 and 2.
        section('Verse 1 & 2', [
          bar({ repeatStart: true }),
          bar({ repeatEnd: true }),
        ]),
        section('Instrumental Verse', [bar(), bar()]),
        section('Verse 3', [bar(), bar()]),
        section('Rap Verse', [bar(), bar()]),
      ],
      audioSources: [],
      artistImageSource: 'none',
    } as Song;
    const { sections } = exportSongToChordRegions(song, {
      voicingMode: 'auto',
      bassLine: false,
    });
    expect(sections.map((s) => s.label)).toEqual([
      'Verse 1',
      'Verse 2',
      'Instrumental Verse',
      'Verse 3',
      'Rap Verse',
    ]);
  });
});
