import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  coverMotion,
  coverStill,
  PROJECT_COVERS,
  projectCover,
} from '../projectCovers';

const PUBLIC = join(__dirname, '../../../../public');

describe('the project images', () => {
  it('ships both files of every image, under unique ids', () => {
    expect(new Set(PROJECT_COVERS.map((c) => c.id)).size).toBe(
      PROJECT_COVERS.length,
    );
    for (const cover of PROJECT_COVERS) {
      expect(existsSync(join(PUBLIC, coverMotion(cover.id))), cover.id).toBe(
        true,
      );
      expect(existsSync(join(PUBLIC, coverStill(cover.id))), cover.id).toBe(
        true,
      );
      expect(cover.colour).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('finds one by id; none, or one no longer in the set, draws the default', () => {
    expect(projectCover('pink-text')?.id).toBe('pink-text');
    expect(projectCover('gone')).toBeNull();
    expect(projectCover(null)).toBeNull();
  });
});
