import { describe, expect, it } from 'vitest';
import { resolveInspectorPanel } from './inspectorModel';

describe('the Inspector’s panel', () => {
  it('shows the one the student chose', () => {
    expect(
      resolveInspectorPanel({
        panel: 'layers',
        mindmap: true,
        hasDetails: true,
      }),
    ).toBe('layers');
  });

  it('shows nothing once they close it', () => {
    expect(
      resolveInspectorPanel({ panel: 'none', mindmap: true, hasDetails: true }),
    ).toBeNull();
  });

  it('keeps a lesson’s mind map up until another panel is chosen', () => {
    expect(
      resolveInspectorPanel({ panel: null, mindmap: true, hasDetails: true }),
    ).toBe('mindmap');
  });

  it('opens on the stop’s details when it has any', () => {
    expect(
      resolveInspectorPanel({ panel: null, mindmap: false, hasDetails: true }),
    ).toBe('details');
    expect(
      resolveInspectorPanel({ panel: null, mindmap: false, hasDetails: false }),
    ).toBeNull();
  });
});
