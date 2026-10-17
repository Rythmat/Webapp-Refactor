import { describe, expect, it } from 'vitest';
import { hubTurnLabel } from '../LiteracyCallPanel';

describe('the hub’s label', () => {
  it('says whose turn it is: the teacher’s through the words and the call', () => {
    expect(hubTurnLabel(true, 'countIn')).toBe('Ready');
    expect(hubTurnLabel(true, 'words')).toBe('My turn');
    expect(hubTurnLabel(true, 'call')).toBe('My turn');
    expect(hubTurnLabel(true, 'response')).toBe('Your turn');
  });

  it('names the call when no run is going, or before its first beat', () => {
    expect(hubTurnLabel(false, null)).toBe('The call');
    expect(hubTurnLabel(false, 'response')).toBe('The call');
    expect(hubTurnLabel(true, null)).toBe('The call');
  });
});
