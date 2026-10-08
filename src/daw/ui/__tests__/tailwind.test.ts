import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig';
import { describe, expect, it } from 'vitest';
import { FLOATING_SURFACE, TRANSITION, TYPE_CLASS } from '../styles';

// ── The token classes, through the real Tailwind config ─────────────────────
// tailwind.config.ts adds the editor's keys (colors.daw, the daw motion
// steps) to the app's theme. Compiling with it shows each class becomes a
// read of its --daw-* custom property, and that the app's own classes still
// work.

const CONFIG = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../tailwind.config.ts',
);

async function compile(classes: string): Promise<string> {
  const config = loadConfig(CONFIG);
  const result = await postcss([
    tailwindcss({
      ...config,
      content: [{ raw: `<div class="${classes}"></div>` }],
    }),
  ]).process('@tailwind utilities;', { from: undefined });
  return result.css.replace(/\s+/g, ' ');
}

describe('the Tailwind config', () => {
  it('turns the colour classes into reads of the --daw-* tokens', async () => {
    const css = await compile(
      'bg-daw-surface-1 text-daw-text-3 border-daw-hairline outline-daw-focus stroke-daw-outline',
    );
    expect(css).toContain(
      '.bg-daw-surface-1 { background-color: var(--daw-surface-1) }',
    );
    expect(css).toContain('.text-daw-text-3 { color: var(--daw-text-3) }');
    expect(css).toContain('border-color: var(--daw-hairline)');
    expect(css).toContain('outline-color: var(--daw-focus)');
    expect(css).toContain('stroke: var(--daw-outline)');
  }, 30_000);

  it('names the motion steps, so they time transitions and animations alike', async () => {
    const css = await compile(TRANSITION);
    expect(css).toContain('transition-duration: var(--daw-motion-fast)');
    expect(css).toContain('animation-duration: var(--daw-motion-fast)');
    expect(css).toContain('transition-timing-function: var(--daw-ease)');
  }, 30_000);

  it('reads type sizes and layers from the tokens', async () => {
    const css = await compile(`${TYPE_CLASS.micro} ${FLOATING_SURFACE}`);
    expect(css).toContain('font-size: var(--daw-font-micro)');
    expect(css).toContain('line-height: var(--daw-leading-micro)');
    expect(css).toContain('letter-spacing: var(--daw-tracking-micro)');
    expect(css).toContain('z-index: var(--daw-z-popover)');
    expect(css).toContain('background-color: var(--daw-popover)');
  }, 30_000);

  it("keeps the app's own theme", async () => {
    const css = await compile('bg-surface-box text-primary duration-200');
    expect(css).toContain('.bg-surface-box');
    expect(css).toContain('.text-primary');
    expect(css).toContain('transition-duration: 200ms');
  }, 30_000);
});
