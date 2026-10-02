import { describe, expect, it } from 'vitest';
import { itemKeyOf, ItemLocks } from '../itemLock';

/**
 * The item lock the cell writes, the row panel's Save and Link… share:
 * holders of one item run one after another, in the order they asked,
 * whatever the one before did; holders of different items never wait.
 */

const later = () => new Promise<void>((resolve) => setTimeout(resolve, 5));

describe('the item lock', () => {
  it('names an item kind:slug', () => {
    expect(itemKeyOf('song', 'africa')).toBe('song:africa');
  });

  it('runs one item’s holders one at a time, in order', async () => {
    const locks = new ItemLocks();
    const order: string[] = [];
    const hold = (name: string) =>
      locks.run('song:africa', async () => {
        order.push(`${name} in`);
        await later();
        order.push(`${name} out`);
        return name;
      });
    const results = await Promise.all([hold('a'), hold('b'), hold('c')]);
    expect(results).toEqual(['a', 'b', 'c']);
    expect(order).toEqual(['a in', 'a out', 'b in', 'b out', 'c in', 'c out']);
    expect(locks.held('song:africa')).toBe(false);
  });

  it('lets the next holder in when one throws, and passes the error on', async () => {
    const locks = new ItemLocks();
    const failing = locks.run('song:africa', async () => {
      throw new Error('refused');
    });
    const next = locks.run('song:africa', async () => 'ran');
    await expect(failing).rejects.toThrow('refused');
    await expect(next).resolves.toBe('ran');
  });

  it('never makes one item wait for another', async () => {
    const locks = new ItemLocks();
    let release = () => {};
    const slow = locks.run(
      'song:africa',
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    await expect(locks.run('artist:toto', async () => 'free')).resolves.toBe(
      'free',
    );
    expect(locks.held('song:africa')).toBe(true);
    release();
    await slow;
  });
});
