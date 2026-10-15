// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import postcss, { type AtRule, type Rule } from 'postcss';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LEADSHEET_PRINT_CLASS, useLeadSheetPrint } from './useLeadSheetPrint';

// ── The lead sheet's print rules stay with the lead sheet ──────────────────
// leadsheet-print.css stays loaded for the session once the Studio has
// opened, and its print rules used to hide everything without a lead sheet
// in it, so a set list printed afterwards came out blank. They now wait for
// a body class the lead sheet and score views hold only while printing.

function View() {
  useLeadSheetPrint();
  return null;
}

const printing = () => document.body.classList.contains(LEADSHEET_PRINT_CLASS);
const fire = (type: 'beforeprint' | 'afterprint') =>
  window.dispatchEvent(new Event(type));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.className = '';
});

describe('useLeadSheetPrint', () => {
  it('holds the class only while the page prints', () => {
    render(<View />);
    expect(printing()).toBe(false);
    fire('beforeprint');
    expect(printing()).toBe(true);
    fire('afterprint');
    expect(printing()).toBe(false);
  });

  it('leaves other pages alone once the views are gone', () => {
    const { unmount } = render(<View />);
    unmount();
    fire('beforeprint');
    expect(printing()).toBe(false);
  });

  it('keeps the class while another view still prints, and never leaks it', () => {
    const first = render(<View />);
    const second = render(<View />);
    fire('beforeprint');
    first.unmount();
    expect(printing()).toBe(true);
    // The last view leaving mid-print takes the class with it.
    second.unmount();
    expect(printing()).toBe(false);
    fire('beforeprint');
    expect(printing()).toBe(false);
  });

  it('follows emulated print media, as the score page does', () => {
    let onChange: ((event: { matches: boolean }) => void) | undefined;
    const media = {
      matches: false,
      addEventListener: (_: string, listener: typeof onChange) => {
        onChange = listener;
      },
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', () => media);

    const { unmount } = render(<View />);
    onChange?.({ matches: true });
    expect(printing()).toBe(true);
    onChange?.({ matches: false });
    expect(printing()).toBe(false);
    unmount();
    expect(media.removeEventListener).toHaveBeenCalledWith('change', onChange);
  });

  it('mounts where print media takes no listeners, and still prints', () => {
    // Older Safari's MediaQueryList: a throw here would replace the editor
    // with the error page.
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const { unmount } = render(<View />);
    fire('beforeprint');
    expect(printing()).toBe(true);
    unmount();
    expect(printing()).toBe(false);
  });
});

describe('leadsheet-print.css', () => {
  // jsdom applies no stylesheets, so the rules are read as text. From the
  // repo root, where the test runner starts.
  const sheet = postcss.parse(
    readFileSync('src/daw/components/LeadSheet/leadsheet-print.css', 'utf8'),
  );
  const scoped = (selector: string) =>
    selector.startsWith(`body.${LEADSHEET_PRINT_CLASS} `) ||
    selector === `body.${LEADSHEET_PRINT_CLASS}` ||
    selector === `html:has(> body.${LEADSHEET_PRINT_CLASS})`;

  it('scopes every print rule to the class', () => {
    const rules: Rule[] = [];
    sheet.walkAtRules('media', (media: AtRule) => {
      if (media.params.trim() !== 'print') return;
      media.walkRules((rule) => {
        rules.push(rule);
      });
    });
    expect(rules.length).toBeGreaterThan(20);
    for (const rule of rules) {
      for (const selector of rule.selectors) {
        expect(scoped(selector.replace(/\s+/g, ' ')), selector).toBe(true);
      }
    }
  });

  it('sets up paper only on pages it names', () => {
    const pages: string[] = [];
    sheet.walkAtRules('page', (page: AtRule) => {
      pages.push(page.params.trim());
    });
    expect(pages).toEqual(['leadsheet', 'score']);
  });
});
