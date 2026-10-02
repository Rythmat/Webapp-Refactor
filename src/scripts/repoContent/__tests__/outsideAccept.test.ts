import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  Suggestion,
  SuggestionDecision,
} from '@/content/suggestions/types';
import type { MockViewer } from '@/features/admin/content/mock/contentMockServer';
import type { GitRunner } from '../gitStatus';
import { CATALOGUE_MENTION } from '../importRules';
import { LiveRepoStore, refuseCatalogueMentions } from '../repoStore';
import { ARTISTS_FILE } from '../sources/artists';
import { RepoContentError } from '../sources/common';
import { songFileOf } from '../sources/songs';
import { scratchCopy } from './scratchCopy';

/**
 * A person's accept of an outside suggestion, in repo mode, over a copy of
 * the repo's data: the owner decided on 30 September 2026 that no data file
 * the site reads names an outside catalogue, carries one of its ids, or
 * marks a value unconfirmed. The bulk import writes bare; so must a single
 * accept from the Table, which is how the owner settles what the import
 * left. The repo's own files are only read, to make the copy.
 */

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };
const noGit: GitRunner = async () => '';

let root: string;
let live: LiveRepoStore;

beforeAll(async () => {
  root = await scratchCopy('repo-outside-');
  live = await LiveRepoStore.open({ root, planners: false, git: noGit });
}, 120_000);

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

const read = (path: string) => readFileSync(join(root, path), 'utf8');

/** The lines a write added to a file. */
const added = (before: string, after: string) => {
  const had = new Set(before.split('\n'));
  return after.split('\n').filter((line) => !had.has(line));
};

/** Provenance a data file must never gain: names, links, ids, marks. */
const PROVENANCE =
  /musicbrainz|wikidata|metabrainz|\bmbids?\b|externalIds|unverified|\bsource\b/i;

describe('a single accept of an outside suggestion, in repo mode', () => {
  it('writes the song and the records it makes bare', async () => {
    const listed = await live.handle({
      method: 'GET',
      path: '/suggestions',
      viewer: ADMIN,
      query: { kind: 'song', status: 'open', limit: '500' },
    });
    expect(listed.status).toBe(200);
    // Open credits from outside that carry a catalogue link and make an
    // artist record first: the case that leaked before.
    const candidates = (
      listed.body as { items: { suggestion: Suggestion }[] }
    ).items
      .map((row) => row.suggestion)
      .filter(
        (suggestion) =>
          suggestion.path === 'credits[]' &&
          suggestion.sources.some((source) => source.provider !== 'app') &&
          JSON.stringify(suggestion.value).match(CATALOGUE_MENTION) &&
          suggestion.requires?.some((record) => record.kind === 'artist'),
      );
    expect(candidates.length).toBeGreaterThan(0);

    let saved: Suggestion | null = null;
    for (const suggestion of candidates.slice(0, 25)) {
      const songFile = songFileOf(suggestion.target.slug);
      const before = { song: read(songFile), artists: read(ARTISTS_FILE) };
      const answer = await live.handle({
        method: 'POST',
        path: '/suggestions/decisions',
        viewer: ADMIN,
        body: { decisions: [{ suggestionId: suggestion.id, op: 'accept' }] },
      });
      expect(answer.status).toBe(200);
      const [result] = (
        answer.body as {
          results: { outcome?: string; decision?: SuggestionDecision }[];
        }
      ).results;
      if (result.outcome !== 'saved') continue;
      saved = suggestion;
      const songLines = added(before.song, read(songFile));
      const artistLines = added(before.artists, read(ARTISTS_FILE));
      expect(songLines.length).toBeGreaterThan(0);
      expect(songLines.filter((line) => PROVENANCE.test(line))).toEqual([]);
      expect(artistLines.filter((line) => PROVENANCE.test(line))).toEqual([]);
      break;
    }
    expect(saved, 'no candidate could be saved').not.toBeNull();
  });
});

describe('refuseCatalogueMentions', () => {
  const plan = (before: string | null, text: string | null) => ({
    path: 'src/content/data/labels.json',
    before,
    text,
  });

  it('refuses a plan that adds a catalogue name, link or id, naming none', () => {
    for (const text of [
      '{"slug":"x","source":"https://musicbrainz.org/label/1"}',
      '{"slug":"x","note":"see Wikidata"}',
      '{"slug":"x","externalIds":{"mbid":"x"}}',
      '{"slug":"x","id":"3cacb92d-79cb-4983-b17f-ab33b1eb5cfa"}',
    ]) {
      let thrown: unknown = null;
      try {
        refuseCatalogueMentions([plan('{"slug":"x"}', text)]);
      } catch (error) {
        thrown = error;
      }
      expect(thrown, text).toBeInstanceOf(RepoContentError);
      expect((thrown as RepoContentError).code).toBe('REPO_BAD_CHANGE');
      expect((thrown as Error).message).not.toMatch(CATALOGUE_MENTION);
    }
  });

  it('lets a file keep a mention it already had, and a person mark a guess', () => {
    const comment = '// read from MusicBrainz once\n';
    expect(() =>
      refuseCatalogueMentions([
        plan(`${comment}a`, `${comment}b`),
        plan('{"born":{}}', '{"born":{"date":"1939","unverified":true}}'),
        plan('a', null),
      ]),
    ).not.toThrow();
  });
});
