import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type ComponentType, type ReactNode, useState } from 'react';
import { vi } from 'vitest';
import type { EntityId } from '@/content/graph/types';
import type { PickerKind } from '../../entities/entityKinds';
import { addSessionEntity } from '../../entities/sessionEntities';
import type { RecordEditorProps } from '../shared';

/**
 * Shared by the record editor tests. Each test file mocks the auth context
 * (no token, so nothing is fetched) and the capabilities (nothing served),
 * so every picker searches the repo's registries plus the records seeded
 * here as created this session — the kinds the repo has no registry of.
 */

export type Body = Record<string, unknown>;

/**
 * Render an editor the way a page holds it: the body in state, each change
 * applied, so the next edit starts from the last one. `onChange` records
 * every body the editor handed back.
 */
export function renderEditor(
  Editor: ComponentType<RecordEditorProps>,
  initial: Body,
  { readOnly }: { readOnly?: boolean } = {},
) {
  const onChange = vi.fn<(next: Body) => void>();
  const Host = () => {
    const [body, setBody] = useState(initial);
    return (
      <Editor
        body={body}
        readOnly={readOnly}
        onChange={(next) => {
          onChange(next);
          setBody(next);
        }}
      />
    );
  };
  const { container } = render(
    <QueryClientProvider client={new QueryClient()}>
      <Host />
    </QueryClientProvider>,
  );
  return { onChange, last: () => onChange.mock.lastCall?.[0], container };
}

/** Wrap a bare component (not an editor) in what the pickers need. */
export const wrap = (node: ReactNode) => (
  <QueryClientProvider client={client}>{node}</QueryClientProvider>
);
const client = new QueryClient();

/** A record the repo has no registry of (a label, a studio, a song). */
export function seed(kind: PickerKind, slug: string, name: string) {
  addSessionEntity({
    id: `${kind}:${slug}` as EntityId,
    kind,
    slug,
    name,
    source: 'draft',
  });
}

/**
 * Open a picker from its trigger, search, wait for `expected` to be listed,
 * and take the top hit (Tab), the way an author would.
 */
export async function pick(
  trigger: HTMLElement,
  search: string,
  expected: string | RegExp,
) {
  fireEvent.click(trigger);
  const input = await screen.findByPlaceholderText(/^Find /);
  fireEvent.change(input, { target: { value: search } });
  await screen.findAllByRole('option', { name: expected });
  fireEvent.keyDown(input, { key: 'Tab' });
  // A multi picker stays open for the next pick; close it as a person would.
  if (input.isConnected) fireEvent.keyDown(input, { key: 'Escape' });
  await settle();
}

/**
 * Let a closing popover finish: Radix hands focus back to the trigger a tick
 * later, and a popover opened before that would see the focus leave and close.
 */
async function settle() {
  await waitFor(() => {
    if (screen.queryByPlaceholderText(/^Find /)) throw new Error('still open');
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Open a single picker and choose Clear. */
export async function clearPicker(trigger: HTMLElement) {
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('option', { name: 'Clear' }));
  await settle();
}

/** `body` without `key`, for "the key is gone" expectations. */
export const without = (body: Body, ...keys: string[]): Body =>
  Object.fromEntries(Object.entries(body).filter(([k]) => !keys.includes(k)));

/** Type into an input the way a person does: the whole new value at once. */
export const type = (element: HTMLElement, value: string) =>
  fireEvent.change(element, { target: { value } });
