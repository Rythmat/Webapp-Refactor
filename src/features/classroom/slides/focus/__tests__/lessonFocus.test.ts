import { describe, expect, it } from 'vitest';
import type { Interaction } from '../../../types';
import { fixture, fixtureCatalog } from '../../cortex/__tests__/fixture';
import { cortexGroupActivity } from '../../cortex/buildDeck';
import { planCortexLesson } from '../../cortex/planLesson';
import { focusById, searchFocus } from '../../cortex/suggestFocus';
import {
  groupActivityOf,
  groupMatchesFocus,
  relatedForFocus,
} from '../lessonFocus';

const graph = fixture();
const catalog = fixtureCatalog();
const [ana] = searchFocus(graph, catalog, 'Ana Lux');
const plan = planCortexLesson(graph, catalog, ana);
const related = relatedForFocus(plan);

const atlas = (module: 'globe' | 'studio' | 'learn', ref: string) =>
  ({
    id: 'ix-group',
    type: 'atlas',
    question: { en: 'Go' },
    atlas: { module, activityRef: ref },
  }) as Interaction;

describe("the lesson's subject", () => {
  it('finds a stored subject again by its id', () => {
    expect(focusById(graph, catalog, ana.id)?.label).toBe('Ana Lux');
    expect(focusById(graph, catalog, 'artist:nobody')).toBeUndefined();
  });

  it('offers every role only what the subject relates to', () => {
    expect(related.promoter.map((o) => o.ref)).toEqual(['globe:mindmap']);
    expect(related.producer[0].ref).toBe(
      `studio:tutorial:${plan.producer[0].tutorial.id}`,
    );
    expect(related.performer.map((o) => o.ref)).toEqual(
      plan.performer.map((o) => o.activityRef),
    );
  });

  it("knows a Group Project that isn't about the subject", () => {
    const ours = groupActivityOf(atlas('learn', related.performer[0].ref));
    expect(ours).toEqual({ role: 'performer', ref: related.performer[0].ref });
    expect(groupMatchesFocus(ours!.ref, related)).toBe(true);

    const stranger = groupActivityOf(
      atlas('learn', 'song:somebody-else:lesson'),
    );
    expect(groupMatchesFocus(stranger!.ref, related)).toBe(false);
  });

  it('matches the Showcase in place, keeping the interaction id', () => {
    const match = cortexGroupActivity('ix-group', plan, 'performer');
    expect(match?.interaction.id).toBe('ix-group');
    expect(match?.interaction.atlas?.activityRef).toBe(
      related.performer[0].ref,
    );
    expect(match?.title.en).toBe('Group Project: Performer');
  });
});
