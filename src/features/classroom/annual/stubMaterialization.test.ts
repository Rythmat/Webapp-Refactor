import { describe, expect, it } from 'vitest';
import { PHASES } from '../phases';
import { CANONICAL_ANNUAL_TEMPLATE } from './curriculumTemplate';
import { seededDayFromStub } from './stubMaterialization';

describe('seededDayFromStub', () => {
  it('carries the stub label onto the Day', () => {
    const stubs = CANONICAL_ANNUAL_TEMPLATE.autumn.units[0].dayStubs;
    const day = seededDayFromStub(stubs[0]);
    expect(day.label).toBe(stubs[0].label);
  });

  it('fills every phase cell present in phaseSeeds with the EN + ES prompt', () => {
    const stubs = CANONICAL_ANNUAL_TEMPLATE.autumn.units.find(
      (u) => u.slug === 'aug-welcome',
    )!.dayStubs;
    const day = seededDayFromStub(stubs[0]);
    for (const phase of PHASES) {
      const cell = day.cells[phase];
      // Prompt starts with the seed text — Connect may have song-line
      // enrichment appended, other phases are exact.
      expect(
        cell.presentation.prompt.en.startsWith(stubs[0].phaseSeeds[phase]!.en),
      ).toBe(true);
      expect(
        cell.presentation.prompt.es!.startsWith(
          stubs[0].phaseSeeds[phase]!.es!,
        ),
      ).toBe(true);
    }
  });

  it('sets a structured song reference on Connect when songId is set (never a raw slug in the prompt)', () => {
    const stub = {
      slug: 'test-song',
      label: 'Test',
      songId: 'lean_on_me',
      phaseSeeds: {
        connectRegulate: { en: 'Start', es: 'Comienza' },
        groupPractice: { en: 'a', es: 'a' },
        creativeProjects: { en: 'b', es: 'b' },
        presentPerform: { en: 'c', es: 'c' },
        respondReflectReset: { en: 'd', es: 'd' },
      },
    };
    const day = seededDayFromStub(stub);
    // Structured reference — resolved to artwork by the presentation surface.
    expect(day.cells.connectRegulate.presentation.song).toEqual({
      id: 'lean_on_me',
    });
    // The raw slug must NOT leak into the student-facing prompt prose.
    expect(day.cells.connectRegulate.presentation.prompt.en).toBe('Start');
    expect(day.cells.connectRegulate.presentation.prompt.en).not.toContain(
      '/songs/',
    );
    expect(day.cells.connectRegulate.presentation.prompt.es).not.toContain(
      '/songs/',
    );
  });

  it('adds a Globe LaunchTile to Connect for every globeEventId', () => {
    const stub = {
      slug: 'test-globe',
      label: 'Test',
      globeEventIds: ['evt-x', 'evt-y'],
      phaseSeeds: {
        connectRegulate: { en: 'Start', es: 'Comienza' },
        groupPractice: { en: 'a', es: 'a' },
        creativeProjects: { en: 'b', es: 'b' },
        presentPerform: { en: 'c', es: 'c' },
        respondReflectReset: { en: 'd', es: 'd' },
      },
    };
    const day = seededDayFromStub(stub);
    const tiles = day.cells.connectRegulate.presentation.launchTiles;
    expect(tiles).toHaveLength(2);
    expect(tiles[0].module).toBe('globe');
    expect(tiles[0].activityRef).toBe('evt-x');
    expect(tiles[1].activityRef).toBe('evt-y');
  });

  it('leaves scheduledDate unset — caller is expected to set it', () => {
    const stubs = CANONICAL_ANNUAL_TEMPLATE.autumn.units[0].dayStubs;
    const day = seededDayFromStub(stubs[0]);
    expect(day.scheduledDate).toBeUndefined();
  });
});
