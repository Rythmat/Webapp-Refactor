import { describe, expect, it } from 'vitest';
import { suggestionId } from '../keys';
import { mergeSuggestions } from '../merge';
import type { Suggestion } from '../types';

/**
 * The app's planners and the importer offering one fact are one suggestion,
 * and which is read first changes nothing: the importer's batch decides its
 * calibration, and its identity dependency gates the bulk accept.
 */

const target = { kind: 'artist', slug: 'marvin-gaye' };
const id = suggestionId({
  target,
  path: 'basedInPlaceId',
  op: 'set',
  value: 'detroit',
});
const offer = (extra: Partial<Suggestion>): Suggestion => ({
  id,
  target,
  path: 'basedInPlaceId',
  op: 'set',
  value: 'detroit',
  display: 'City: Detroit',
  sources: [],
  evidence: [],
  confidence: 0.7,
  tier: 'likely',
  batch: 'app-stage1',
  ...extra,
});

const app = offer({
  sources: [{ provider: 'app', label: 'artist_location "marvin gaye" city' }],
  evidence: ['song pins'],
});
const imported = offer({
  display: 'City: Detroit (MusicBrainz area)',
  sources: [{ provider: 'musicbrainz', url: 'https://musicbrainz.org/x' }],
  evidence: ['area'],
  confidence: 0.92,
  tier: 'sure',
  batch: 'mb-2026-09-30',
  dependsOn: 'identity',
});

describe('merging two offers of one fact', () => {
  it("keeps every source and reason, the surer tier, and the importer's batch and identity", () => {
    for (const merged of [
      mergeSuggestions([app], [imported]),
      mergeSuggestions([imported, app]),
    ]) {
      expect(merged).toHaveLength(1);
      expect(merged[0]).toMatchObject({
        id,
        tier: 'sure',
        confidence: 0.92,
        display: imported.display,
        batch: 'mb-2026-09-30',
        dependsOn: 'identity',
      });
      expect(merged[0].sources.map((s) => s.provider).sort()).toEqual([
        'app',
        'musicbrainz',
      ]);
      expect([...merged[0].evidence].sort()).toEqual(['area', 'song pins']);
    }
  });

  it('keeps the first batch when neither offer is the importer’s', () => {
    const again = offer({ ...app, batch: 'app-2026-10-01' });
    expect(mergeSuggestions([app, again])[0].batch).toBe('app-stage1');
    expect(mergeSuggestions([app, app])).toEqual([app]);
  });
});
