// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { parseKeys } from '@/daw/commands/keys';
import '@/daw/commands/keymaps';
import {
  getCommand,
  getScope,
  type CommandDef,
  type DeclaredCommand,
} from '@/daw/commands/registry';
import {
  matchScore,
  paletteGroups,
  paletteRow,
  paletteRows,
} from '../paletteModel';

/** A declared command, by id. */
function cmd(id: string): DeclaredCommand {
  const command = getCommand(id);
  if (!command) throw new Error(`No command "${id}"`);
  return command;
}

/** A command that isn't in the registry, in a scope that is. */
function fake(def: Omit<CommandDef, 'keys'> & { keys?: string[] }) {
  const keys = def.keys ?? [];
  return { ...def, keys, chords: keys.map(parseKeys) } as DeclaredCommand;
}

const ids = (commands: readonly DeclaredCommand[], query: string) =>
  paletteRows(paletteGroups(commands, query, true)).map((row) => row.id);

describe('paletteGroups', () => {
  const mixed = [
    cmd('score.slur'),
    cmd('tracks.mute'),
    cmd('transport.loop'),
    cmd('clip.split'),
    cmd('tracks.duplicate'),
    cmd('track.add'),
  ];

  it('groups by scope in the listing order, under each scope’s heading', () => {
    const groups = paletteGroups(mixed, '', true);
    expect(groups.map((g) => g.scope)).toEqual([
      'global',
      'arrange',
      'tracks',
      'score',
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      'Everywhere',
      'Create: timeline',
      'Track list',
      getScope('score')!.label,
    ]);
  });

  it('lists everything for an empty query, in the order given', () => {
    expect(ids(mixed, '')).toEqual([
      'transport.loop',
      'track.add',
      'clip.split',
      'tracks.mute',
      'tracks.duplicate',
      'score.slur',
    ]);
    expect(ids(mixed, '   ')).toEqual(ids(mixed, ''));
  });

  it('lists nothing when nothing matches', () => {
    expect(paletteGroups(mixed, 'zebra', true)).toEqual([]);
  });

  it('finds a command by the start of a word in its label', () => {
    expect(ids(mixed, 'dupl')).toEqual(['tracks.duplicate']);
    expect(ids(mixed, 'Slur')).toEqual(['score.slur']);
    // Not the middle of a word.
    expect(ids(mixed, 'uplicate')).toEqual([]);
  });

  it('finds a command by a keyword', () => {
    const commands = [
      cmd('view.effects'),
      cmd('view.mix'),
      cmd('track.add'),
      cmd('project.export'),
    ];
    expect(ids(commands, 'fx')).toEqual(['view.effects']);
    expect(ids(commands, 'mixer')).toEqual(['view.mix']);
    expect(ids(commands, 'instrument')).toEqual(['track.add']);
    expect(ids(commands, 'bounce')).toEqual(['project.export']);
  });

  it('shows a key only on the first command that takes it here', () => {
    // Opened from a track row: the row's ⌘D duplicates the track, so the
    // clip's Duplicate further down shows no ⌘D (it wouldn't run it).
    const groups = paletteGroups(
      [cmd('tracks.duplicate'), cmd('clip.duplicate'), cmd('transport.loop')],
      '',
      true,
    );
    const keys = Object.fromEntries(
      groups.flatMap((g) => g.rows).map((r) => [r.id, r.keys]),
    );
    expect(keys).toEqual({
      'tracks.duplicate': '⌘D',
      'clip.duplicate': null,
      'transport.loop': 'L',
    });
  });

  it('finds a command by its scope’s heading', () => {
    expect(ids(mixed, 'track list')).toEqual([
      'tracks.mute',
      'tracks.duplicate',
    ]);
    expect(ids(mixed, 'everywhere')).toEqual(['transport.loop', 'track.add']);
  });

  it('needs every word of the query to match', () => {
    expect(ids(mixed, 'mute track')).toEqual(['tracks.mute']);
    expect(ids(mixed, 'mute zebra')).toEqual([]);
    expect(ids(mixed, 'loop everywhere')).toEqual(['transport.loop']);
  });

  it('ignores case, accents and punctuation', () => {
    const commands = [cmd('view.settings'), cmd('view.score')];
    expect(ids(commands, 'AUDIO & midi')).toEqual(['view.settings']);
    expect(ids(commands, 'scóre')).toEqual(['view.score']);
  });

  it('ranks a match at the label’s start first within a group', () => {
    const later = fake({
      id: 'test.trackColour',
      scope: 'global',
      label: 'Track colour',
    });
    const earlier = fake({
      id: 'test.trackMenu',
      scope: 'global',
      label: 'Open the track menu',
    });
    expect(ids([earlier, later], 'track')).toEqual([
      'test.trackColour',
      'test.trackMenu',
    ]);
    // Without a query the given order holds.
    expect(ids([earlier, later], '')).toEqual([
      'test.trackMenu',
      'test.trackColour',
    ]);
  });

  it('ranks a label match above a keyword, and a keyword above the heading', () => {
    const byScope = fake({
      id: 'test.byScope',
      scope: 'global',
      label: 'Something else',
    });
    const byKeyword = fake({
      id: 'test.byKeyword',
      scope: 'global',
      label: 'Another thing',
      keywords: ['everywhere'],
    });
    const byLabel = fake({
      id: 'test.byLabel',
      scope: 'global',
      label: 'Works everywhere',
    });
    expect(ids([byScope, byKeyword, byLabel], 'everywhere')).toEqual([
      'test.byLabel',
      'test.byKeyword',
      'test.byScope',
    ]);
    expect(matchScore(byLabel, 'everywhere')).toBeGreaterThan(
      matchScore(byKeyword, 'everywhere'),
    );
    expect(matchScore(byKeyword, 'everywhere')).toBeGreaterThan(
      matchScore(byScope, 'everywhere'),
    );
    expect(matchScore(byScope, 'nowhere')).toBe(0);
  });

  it('never moves a row out of its scope’s group to rank it', () => {
    // The track list's row matches its label, the global one only a
    // keyword, but Everywhere still leads.
    const global = fake({
      id: 'test.global',
      scope: 'global',
      label: 'Something',
      keywords: ['track'],
    });
    const commands = [cmd('tracks.duplicate'), global];
    expect(matchScore(cmd('tracks.duplicate'), 'track')).toBeGreaterThan(
      matchScore(global, 'track'),
    );
    expect(ids(commands, 'track')).toEqual(['test.global', 'tracks.duplicate']);
  });
});

describe('paletteRow', () => {
  it('shows a long row of keys by its keysLabel', () => {
    expect(paletteRow(cmd('score.duration'), true).keys).toBe('2–7');
    expect(paletteRow(cmd('prism.pick'), false).keys).toBe('1–9');
  });

  it('names the first key for the keyboard the student has', () => {
    expect(paletteRow(cmd('help.palette'), true).keys).toBe('⌘K');
    expect(paletteRow(cmd('help.palette'), false).keys).toBe('Ctrl+K');
    expect(paletteRow(cmd('edit.redo'), true).keys).toBe('⇧⌘Z');
    expect(paletteRow(cmd('edit.redo'), false).keys).toBe('Ctrl+Shift+Z');
    expect(paletteRow(cmd('transport.playPause'), false).keys).toBe('Space');
  });

  it('has no keys for a command without', () => {
    expect(paletteRow(cmd('track.add'), true)).toEqual({
      id: 'track.add',
      label: 'Add a track…',
      keys: null,
    });
  });

  it('labels the rows of every group the same way', () => {
    const groups = paletteGroups([cmd('project.save')], '', false);
    expect(groups[0].rows).toEqual([
      { id: 'project.save', label: 'Save', keys: 'Ctrl+S' },
    ]);
  });
});
