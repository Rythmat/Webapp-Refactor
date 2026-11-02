// @vitest-environment node
import { expect, it, vi } from 'vitest';

vi.mock('react', () => {
  throw new Error('react must not load with orbitSlots');
});
vi.mock('react-dom', () => {
  throw new Error('react-dom must not load with orbitSlots');
});
vi.mock('react-router-dom', () => {
  throw new Error('react-router-dom must not load with orbitSlots');
});

it('orbitSlots needs neither React nor a page', async () => {
  const slots = await import('../orbitSlots');
  expect(slots.assignSlots(['a'], [], 1)).toEqual(['a']);
  expect(typeof document).toBe('undefined');
});
