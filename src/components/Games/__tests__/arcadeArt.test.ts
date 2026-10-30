import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ART_KINDS, buildArtScene } from '@/lib/art';
import { ARCADE_GAMES, artForGame, artForTitle } from '../arcadeGames';

describe("the Arcade's covers", () => {
  it('gives every game a cover of a known kind, seeded by its route', () => {
    for (const game of ARCADE_GAMES) {
      const art = artForGame(game);
      expect(ART_KINDS).toContain(art.kind);
      expect(art.seed).toBe(`arcade:${game.route ?? game.title}`);
    }
  });

  it('draws every game in the spectrum, each from its own seed', () => {
    for (const game of ARCADE_GAMES) {
      // No palette named: the cover takes the default, the key rainbow.
      expect(artForGame(game).palette).toBeUndefined();
    }
    const seeds = ARCADE_GAMES.map((g) => artForGame(g).seed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it('draws no two games alike: each its own Chladni figure', () => {
    const looks = ARCADE_GAMES.map((g) => {
      const art = artForGame(g);
      expect(art.kind, g.title).toBe('chladni');
      // (n, m) and (m, n) are one figure turned, so compare them sorted.
      const { n, m, sign } = art.mode!;
      return `${Math.max(n, m)},${Math.min(n, m)},${sign}`;
    });
    expect(new Set(looks).size).toBe(ARCADE_GAMES.length);
  });

  it('keeps every figure within budget, as a tile and as a banner', () => {
    for (const game of ARCADE_GAMES) {
      const art = artForGame(game);
      const tile = buildArtScene({ ...art, density: 'tile', aspect: 1 });
      expect(tile.bytes, game.title).toBeLessThanOrEqual(16_000);
      const banner = buildArtScene({ ...art, density: 'hero', aspect: 2.6 });
      expect(banner.bytes, game.title).toBeLessThanOrEqual(48_000);
      expect(tile.style).toBe('tones');
    }
  });

  it("alternates the glow's two colours down the catalog", () => {
    const hues = ARCADE_GAMES.map((g) => artForGame(g).hue);
    hues.slice(1).forEach((hue, i) => expect(hue).not.toBe(hues[i]));
  });

  it("gives a game header its game's cover, and a page not in the catalog one of its own", () => {
    const chroma = ARCADE_GAMES.find((g) => g.title === 'Chroma')!;
    expect(artForTitle('Chroma')).toEqual(artForGame(chroma));
    expect(artForTitle('Play Along')).toEqual({
      seed: 'arcade:Play Along',
      kind: 'chladni',
      hue: 0,
      phase: 0,
    });
  });

  it('no longer paints hex art, the missing login background or teal chrome', () => {
    const root = join(process.cwd(), 'src/components/Games');
    for (const file of [
      'dashboard/ArcadeHero.tsx',
      'dashboard/GameCard.tsx',
      'dashboard/ArcadeShelf.tsx',
      'dashboard/ArcadeTabBar.tsx',
      'ArcadeGameHeader.tsx',
      'ArcadeInlet.tsx',
    ]) {
      const source = readFileSync(join(root, file), 'utf8');
      for (const banned of [
        'HexWaveBackground',
        'generateStudioTileSvg',
        '#7ecfcf',
        'login-bg',
        "'friend'",
      ]) {
        expect(source.includes(banned), `${file}: ${banned}`).toBe(false);
      }
    }
  });
});
