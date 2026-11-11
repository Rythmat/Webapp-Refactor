import { describe, expect, it } from 'vitest';
import {
  isUntitledSessionName,
  sessionDisplayName,
  UNTITLED_SESSION,
} from '../sessionName';

describe('a session’s name', () => {
  it('shows the old default and no name as Untitled Session', () => {
    expect(UNTITLED_SESSION).toBe('Untitled Session');
    expect(sessionDisplayName('Untitled Project')).toBe('Untitled Session');
    expect(sessionDisplayName('  ')).toBe('Untitled Session');
    expect(sessionDisplayName(null)).toBe('Untitled Session');
    expect(sessionDisplayName(' Night Drive ')).toBe('Night Drive');
  });

  it('counts both defaults as untitled', () => {
    expect(isUntitledSessionName('Untitled Project')).toBe(true);
    expect(isUntitledSessionName('Untitled Session')).toBe(true);
    expect(isUntitledSessionName('Untitled Project 2')).toBe(false);
  });
});
