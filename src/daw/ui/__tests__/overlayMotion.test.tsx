// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss, { type AtRule } from 'postcss';
import tailwindcss from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Button } from '../Button';
import { DawDialog, Sheet } from '../DawDialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from '../Menu';
import { Popover, PopoverContent, PopoverTrigger } from '../Popover';
import { Select } from '../Select';
import { Tooltip } from '../Tooltip';
import { installDomShims } from './dom';

// ── Overlay motion, through the real Tailwind config ────────────────────────
// How an overlay moves as it opens and closes is decided by the CSS cascade
// over the kit's classes and the primitives' own, which no class assertion
// shows. These compile an overlay's classes through tailwind.config.ts and
// run the cascade on its element (importance, then specificity, then order).
// jsdom matches the selectors; it applies neither stylesheets nor media
// queries, so the cascade is done here.

const CONFIG = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../tailwind.config.ts',
);

interface Declared {
  value: string;
  important: boolean;
  specificity: number[];
  order: number;
}

/** Specificity of a selector as Tailwind writes them: one compound. */
function specificity(selector: string): number[] {
  // An escaped character belongs to a class name (`data-\[state\=open\]`).
  const s = selector.replace(/\\./g, '_');
  const count = (pattern: RegExp) => s.match(pattern)?.length ?? 0;
  return [
    count(/#[\w-]+/g),
    count(/\.[\w-]+/g) + count(/\[[^\]]+\]/g) + count(/(?<!:):[\w-]+/g),
    count(/(?:^|[\s>+~])[a-z][\w-]*/gi),
  ];
}

function beats(a: Declared, b: Declared): boolean {
  if (a.important !== b.important) return a.important;
  for (let i = 0; i < 3; i++) {
    if (a.specificity[i] !== b.specificity[i]) {
      return a.specificity[i] > b.specificity[i];
    }
  }
  return a.order > b.order;
}

/**
 * The values the cascade gives `element` from its own classes, by property,
 * as it is now (its data-state), with or without reduced motion.
 */
async function computed(
  element: Element,
  { reducedMotion = false } = {},
): Promise<Map<string, string>> {
  const config = loadConfig(CONFIG);
  const classes = element.getAttribute('class') ?? '';
  const { root } = await postcss([
    tailwindcss({
      ...config,
      content: [{ raw: `<i class="${classes}"></i>` }],
    }),
  ]).process('@tailwind utilities;', { from: undefined });

  const won = new Map<string, Declared>();
  let order = 0;
  root.walkRules((rule) => {
    const parent = rule.parent;
    if (parent?.type === 'atrule') {
      // Keyframes are not declarations on the element; of the media
      // queries, only reduced motion is in play here.
      const media = parent as AtRule;
      if (media.name !== 'media') return;
      if (!/prefers-reduced-motion:\s*reduce/.test(media.params)) return;
      if (!reducedMotion) return;
    }
    for (const selector of rule.selectors) {
      let applies = false;
      try {
        applies = element.matches(selector);
      } catch {
        // A pseudo-element or a selector jsdom can't read: not this element.
      }
      if (!applies) continue;
      rule.walkDecls((decl) => {
        order += 1;
        const longhands =
          decl.prop === 'animation' && decl.value === 'none'
            ? [
                ['animation-name', 'none'],
                ['animation-duration', '0s'],
              ]
            : [[decl.prop, decl.value]];
        for (const [prop, value] of longhands) {
          const next: Declared = {
            value,
            important: decl.important,
            specificity: specificity(selector),
            order,
          };
          const held = won.get(prop);
          if (!held || beats(next, held)) won.set(prop, next);
        }
      });
    }
  });
  return new Map([...won].map(([prop, declared]) => [prop, declared.value]));
}

beforeAll(installDomShims);
afterEach(cleanup);

describe('DawDialog', () => {
  it('opens and closes from the middle of the window, where it sits', async () => {
    render(<DawDialog open title="Export audio" />);
    const panel = screen.getByRole('dialog');

    // Where it sits: pulled back by half its size from the window's middle.
    const open = await computed(panel);
    expect(open.get('--tw-translate-x')).toBe('-50%');
    expect(open.get('--tw-translate-y')).toBe('-50%');
    // The opening frame replaces that transform, so it must carry the same
    // pull, or the panel starts with its corner at the middle.
    expect(open.get('animation-name')).toBe('enter');
    expect(open.get('--tw-enter-translate-x')).toBe('-50%');
    expect(open.get('--tw-enter-translate-y')).toBe('-50%');

    panel.setAttribute('data-state', 'closed');
    const closing = await computed(panel);
    expect(closing.get('animation-name')).toBe('exit');
    expect(closing.get('--tw-exit-translate-x')).toBe('-50%');
    expect(closing.get('--tw-exit-translate-y')).toBe('-50%');
  }, 30_000);
});

/** The overlays, each rendered open, by the element that animates. */
const OVERLAYS: Array<{
  name: string;
  step: 'fast' | 'base';
  open(): Element;
}> = [
  {
    name: 'a DawDialog',
    step: 'base',
    open() {
      render(<DawDialog open title="Export audio" />);
      return screen.getByRole('dialog');
    },
  },
  {
    name: "a DawDialog's scrim",
    step: 'base',
    open() {
      render(<DawDialog open title="Export audio" />);
      return screen.getByRole('dialog').previousElementSibling!;
    },
  },
  {
    name: 'a Sheet',
    step: 'base',
    open() {
      render(<Sheet open title="Add a track" />);
      return screen.getByRole('dialog');
    },
  },
  {
    name: 'a Menu',
    step: 'fast',
    open() {
      render(
        <Menu open>
          <MenuTrigger asChild>
            <Button>More</Button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem>Rename</MenuItem>
          </MenuContent>
        </Menu>,
      );
      return screen.getByRole('menu');
    },
  },
  {
    name: 'a ContextMenu',
    step: 'fast',
    open() {
      render(
        <ContextMenu>
          <ContextMenuTrigger>Clip</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Copy</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>,
      );
      fireEvent.contextMenu(screen.getByText('Clip'));
      return screen.getByRole('menu');
    },
  },
  {
    name: "a Select's list",
    step: 'fast',
    open() {
      render(
        <Select
          label="Format"
          open
          defaultValue="wav"
          options={[
            { value: 'wav', label: 'WAV' },
            { value: 'mp3', label: 'MP3' },
          ]}
        />,
      );
      return screen.getByRole('listbox');
    },
  },
  {
    name: 'a Popover',
    step: 'fast',
    open() {
      render(
        <Popover open>
          <PopoverTrigger asChild>
            <Button>Key</Button>
          </PopoverTrigger>
          <PopoverContent>C major</PopoverContent>
        </Popover>,
      );
      return screen.getByRole('dialog');
    },
  },
  {
    name: 'a Tooltip',
    step: 'fast',
    open() {
      render(
        <Tooltip content="Loop">
          <Button>Loop</Button>
        </Tooltip>,
      );
      // Keyboard focus opens it at once.
      act(() => screen.getByRole('button', { name: 'Loop' }).focus());
      return screen.getByRole('tooltip').parentElement!;
    },
  },
];

describe.each(OVERLAYS)('$name', ({ step, open }) => {
  it(`opens and closes at the ${step} motion step`, async () => {
    const element = open();
    const opening = await computed(element);
    expect(opening.get('animation-name')).toBe('enter');
    expect(opening.get('animation-duration')).toBe(`var(--daw-motion-${step})`);

    element.setAttribute('data-state', 'closed');
    const closing = await computed(element);
    expect(closing.get('animation-name')).toBe('exit');
    expect(closing.get('animation-duration')).toBe(`var(--daw-motion-${step})`);
  }, 30_000);

  it('does not move at all under reduced motion', async () => {
    const element = open();
    const opening = await computed(element, { reducedMotion: true });
    expect(opening.get('animation-name')).toBe('none');

    element.setAttribute('data-state', 'closed');
    const closing = await computed(element, { reducedMotion: true });
    expect(closing.get('animation-name')).toBe('none');
  }, 30_000);
});
