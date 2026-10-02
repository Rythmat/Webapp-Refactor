/**
 * One write at a time per content item, across everything in the Table that
 * writes one: a cell's commit (the write queue), the row panel's Save, and
 * Link… from another row (ConfirmConnectionDialog).
 *
 * Each of them reads the item again just before it writes and lays its
 * change onto what it read. Two of them doing that at once would each read
 * the same version, and the second write would quietly put back what the
 * first one changed. Holding the item's lock from the read to the write
 * closes that window on this page; the server's `expectedRevision` check
 * (when it has one) closes it against other people.
 *
 * An item is named `kind:slug` (`itemKeyOf`), so the panel, a cell and a
 * link that writes the same owner all queue behind one another. The lock is
 * never held across a person's decision, only across a read and a write,
 * so waiting on it is a matter of milliseconds.
 *
 * Pure: no React, no fetch (the purity test holds this).
 */

/** Runs `run` while holding `item`'s lock; resolves or rejects as it does. */
export type WithItemLock = <T>(
  item: string,
  run: () => Promise<T>,
) => Promise<T>;

/** How the Table names an item for its lock and its write queue. */
export const itemKeyOf = (kind: string, slug: string): string =>
  `${kind}:${slug}`;

/** No lock at all: what a page outside the Table's provider gets. */
export const runUnlocked: WithItemLock = (_item, run) => run();

/**
 * The locks, one queue of holders per item. A holder runs once every
 * earlier holder of the same item has finished, whether it resolved or
 * threw; holders of different items never wait for one another.
 */
export class ItemLocks {
  /** Per item, the promise that settles when its last holder is done. */
  private readonly tails = new Map<string, Promise<void>>();

  /** Whether anything holds or waits for `item`'s lock. */
  held = (item: string): boolean => this.tails.has(item);

  run: WithItemLock = <T>(item: string, run: () => Promise<T>) => {
    const before = this.tails.get(item) ?? Promise.resolve();
    let release = () => {};
    const done = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = before.then(() => done);
    this.tails.set(item, tail);
    return before.then(run).finally(() => {
      release();
      if (this.tails.get(item) === tail) this.tails.delete(item);
    });
  };
}
