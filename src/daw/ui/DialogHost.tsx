import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { PromptDialog, type PromptDialogProps } from './PromptDialog';

/**
 * Promise versions of ConfirmDialog and PromptDialog, so code that asked
 * window.confirm or window.prompt can ask the editor's own dialogs instead:
 *
 *   if (await confirmDialog({ title: 'Delete this track?', description, danger: true })) …
 *   const name = await promptDialog({ title: 'Rename marker', label: 'Name' });
 *
 * One <DialogHost /> shows them, one at a time, in the order asked.
 * Milestone 2.3 mounts it in the editor; with none mounted a request answers
 * at once as if cancelled (false, null), so nothing destructive goes ahead
 * unasked.
 */

export interface ConfirmOptions {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export type PromptOptions = Pick<
  PromptDialogProps,
  | 'title'
  | 'label'
  | 'description'
  | 'defaultValue'
  | 'placeholder'
  | 'confirmLabel'
  | 'cancelLabel'
  | 'validate'
  | 'maxLength'
>;

type Request =
  | {
      id: number;
      kind: 'confirm';
      options: ConfirmOptions;
      settle(answer: boolean): void;
    }
  | {
      id: number;
      kind: 'prompt';
      options: PromptOptions;
      settle(answer: string | null): void;
    };

let queue: readonly Request[] = [];
let nextRequestId = 1;
let nextHostId = 1;
/** Mounted hosts, oldest first; only the oldest shows dialogs. */
const hosts: number[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const cancelled = (request: Request) =>
  request.kind === 'confirm' ? request.settle(false) : request.settle(null);

function answer(id: number, value: boolean | string | null) {
  const request = queue.find((r) => r.id === id);
  if (!request) return;
  queue = queue.filter((r) => r.id !== id);
  if (request.kind === 'confirm') request.settle(value === true);
  else request.settle(typeof value === 'string' ? value : null);
  emit();
}

function warnNoHost(kind: string) {
  if (import.meta.env.DEV) {
    console.error(
      `${kind}Dialog: no <DialogHost /> is mounted, so the request was cancelled.`,
    );
  }
}

/** Asks a yes-or-no question; true when the action is chosen. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (hosts.length === 0) {
      warnNoHost('confirm');
      resolve(false);
      return;
    }
    queue = [
      ...queue,
      { id: nextRequestId++, kind: 'confirm', options, settle: resolve },
    ];
    emit();
  });
}

/** Asks for a short text; the text, or null when cancelled. */
export function promptDialog(options: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    if (hosts.length === 0) {
      warnNoHost('prompt');
      resolve(null);
      return;
    }
    queue = [
      ...queue,
      { id: nextRequestId++, kind: 'prompt', options, settle: resolve },
    ];
    emit();
  });
}

/**
 * Shows the requests confirmDialog and promptDialog queue. Mount one, near
 * the root of the editor. When the last host unmounts, whatever is still
 * waiting is answered as cancelled, so no promise hangs.
 */
export function DialogHost() {
  const [hostId] = useState(() => nextHostId++);
  useEffect(() => {
    hosts.push(hostId);
    emit();
    return () => {
      hosts.splice(hosts.indexOf(hostId), 1);
      if (hosts.length === 0) {
        const waiting = queue;
        queue = [];
        waiting.forEach(cancelled);
      }
      emit();
    };
  }, [hostId]);

  const active = useSyncExternalStore(subscribe, () => hosts[0] === hostId);
  const current = useSyncExternalStore(subscribe, () => queue[0] ?? null);
  if (!active || !current) return null;

  // Keyed by request, so each one opens fresh (focus, field text).
  if (current.kind === 'confirm') {
    return (
      <ConfirmDialog
        key={current.id}
        open
        onOpenChange={() => {}}
        {...current.options}
        onConfirm={() => answer(current.id, true)}
        onCancel={() => answer(current.id, false)}
      />
    );
  }
  return (
    <PromptDialog
      key={current.id}
      open
      onOpenChange={() => {}}
      {...current.options}
      onSubmit={(value) => answer(current.id, value)}
      onCancel={() => answer(current.id, null)}
    />
  );
}
