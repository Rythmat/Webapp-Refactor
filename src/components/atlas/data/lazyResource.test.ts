import { describe, expect, it, vi } from 'vitest';
import { lazyResource } from './lazyResource';
import { connectionsData, guidesData, stateBoundariesData } from './loaders';

describe('lazyResource', () => {
  it('loads once, however many callers ask', async () => {
    const loader = vi.fn(async () => ['data']);
    const resource = lazyResource(loader);
    expect(resource.peek()).toBeUndefined();
    expect(resource.getSnapshot().status).toBe('idle');
    expect(loader).not.toHaveBeenCalled();

    const [a, b] = await Promise.all([resource.load(), resource.load()]);
    expect(a).toBe(b);
    expect(await resource.load()).toBe(a);
    expect(resource.peek()).toBe(a);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('reports loading, then ready, to subscribers', async () => {
    const resource = lazyResource(async () => 42);
    const seen: string[] = [];
    const unsubscribe = resource.subscribe(() =>
      seen.push(resource.getSnapshot().status),
    );
    await resource.load();
    unsubscribe();
    expect(seen).toEqual(['loading', 'ready']);
    expect(resource.getSnapshot()).toEqual({ status: 'ready', data: 42 });
  });

  it('keeps one snapshot object until the state changes', async () => {
    const resource = lazyResource(async () => 1);
    expect(resource.getSnapshot()).toBe(resource.getSnapshot());
    await resource.load();
    expect(resource.getSnapshot()).toBe(resource.getSnapshot());
  });

  it('forgets a failure, so the next load retries', async () => {
    const loader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('ok');
    const resource = lazyResource(loader);

    await expect(resource.load()).rejects.toThrow('offline');
    expect(resource.getSnapshot().status).toBe('error');
    expect(resource.peek()).toBeUndefined();

    await expect(resource.load()).resolves.toBe('ok');
    expect(resource.peek()).toBe('ok');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('runs the loader asynchronously, so a throw becomes a rejection', async () => {
    const resource = lazyResource<number>(() => {
      throw new Error('sync');
    });
    await expect(resource.load()).rejects.toThrow('sync');
    expect(resource.getSnapshot().status).toBe('error');
  });
});

describe('the Globe loaders', () => {
  it('load the data the first frame leaves out', async () => {
    const outlines = await stateBoundariesData.load();
    expect(outlines.length).toBeGreaterThan(60); // 50 states + DC + 13 provinces/territories
    expect(outlines.some((s) => s.name === 'Ohio')).toBe(true);

    const graph = await connectionsData.load();
    expect(typeof graph.getRecursiveArcsForEvent).toBe('function');

    const guides = await guidesData.load();
    expect(guides.GUIDED_TOURS.length).toBeGreaterThan(0);
    const tour = guides.GUIDED_TOURS[0];
    expect(guides.getTour(tour.id)).toBe(tour);
    const pathway = guides.HISTORICAL_MODULES[0];
    expect(guides.getModuleById(pathway.id)).toBe(pathway);
  });
});
