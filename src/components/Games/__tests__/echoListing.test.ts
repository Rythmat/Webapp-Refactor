// @vitest-environment jsdom
/**
 * Echo in the Arcade: its listing (a free Ear Training game), its route,
 * /arcade/echo, and the page behind it, open to every player with no
 * Premium gate, as the last stop of Start Here must be.
 */

import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { matchRoutes, type RouteObject } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { GameRoutes } from '@/constants/routes';
import { ARCADE_GAMES, getGameByRoute, isGameFree } from '../arcadeGames';

const gate = vi.hoisted(() => ({
  RequirePremium: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/components/ui/RequirePremium', () => gate);

const { gamesPages } = await import('@/features/classroom/ClassroomPages');

const leafAt = (pathname: string) => {
  const matches = matchRoutes([gamesPages() as RouteObject], pathname);
  return matches?.at(-1)?.route;
};

describe('Echo in the Arcade', () => {
  it('is listed: a free Ear Training game, with a one-line blurb', () => {
    const echo = getGameByRoute('echo');
    expect(echo).toBeDefined();
    expect(ARCADE_GAMES).toContain(echo);
    expect(echo).toMatchObject({ title: 'Echo', category: 'Ear Training' });
    expect(echo!.blurb.length).toBeLessThan(80);
    // Sentence case: one capital to start, beyond names.
    expect(echo!.blurb[0]).toBe(echo!.blurb[0].toUpperCase());
    expect(isGameFree(echo!)).toBe(true);
  });

  it('lives at /arcade/echo, with no Premium gate', () => {
    expect(GameRoutes.echo()).toBe('/arcade/echo');
    const leaf = leafAt('/arcade/echo');
    expect(leaf?.path).toBe(GameRoutes.echo.definition);
    const element = leaf?.element as ReactElement;
    expect(isValidElement(element)).toBe(true);
    expect(element.type).not.toBe(gate.RequirePremium);
    // A Premium game is gated, for contrast.
    const foli = leafAt('/arcade/foli')?.element as ReactElement;
    expect(foli.type).toBe(gate.RequirePremium);
  });
});
