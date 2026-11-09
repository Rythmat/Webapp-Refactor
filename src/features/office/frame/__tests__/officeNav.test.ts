import { describe, expect, it } from 'vitest';
import {
  isOfficeFramePath,
  isOfficePresentPath,
  officeNav,
} from '../officeNav';

describe('officeNav', () => {
  it('is null outside the Office', () => {
    expect(officeNav('/learn')).toBeNull();
    expect(officeNav('/officehours')).toBeNull();
    expect(officeNav('/')).toBeNull();
  });

  it('opens on Today', () => {
    for (const path of ['/office', '/office/']) {
      const nav = officeNav(path);
      expect(nav?.scope).toBe('office');
      expect(nav?.active).toBe('today');
    }
  });

  it('names the Office pages, never as a classroom', () => {
    expect(officeNav('/office/classes')).toMatchObject({
      scope: 'office',
      active: 'classes',
    });
    expect(officeNav('/office/planner')?.active).toBe('planner');
    expect(officeNav('/office/library')?.active).toBe('library');
    expect(officeNav('/office/review')?.active).toBe('review');
  });

  it('gives a class its own tabs, each linking inside it', () => {
    const nav = officeNav('/office/c1');
    expect(nav).toMatchObject({ scope: 'class', classroomId: 'c1' });
    expect(nav?.active).toBe('overview');
    expect(nav?.tabs.map((t) => t.id)).toEqual([
      'overview',
      'plan',
      'assignments',
      'students',
      'progress',
    ]);
    for (const tab of nav?.tabs ?? []) expect(tab.to).toMatch(/^\/office\/c1/);
  });

  it('files deep pages under their tab', () => {
    const active = (p: string) => officeNav(p)?.active;
    expect(active('/office/c1/plan')).toBe('plan');
    expect(active('/office/c1/plan/annual')).toBe('plan');
    expect(active('/office/c1/plan/d1')).toBe('plan');
    expect(active('/office/c1/plan/d1/preview')).toBe('plan');
    expect(active('/office/c1/assignments/a1/progress')).toBe('assignments');
    expect(active('/office/c1/students')).toBe('students');
    expect(active('/office/c1/grades')).toBe('progress');
    expect(active('/office/c1/progress')).toBe('progress');
    expect(active('/office/c1/sessions/s1')).toBe('overview');
    expect(active('/office/c1/reports')).toBe('overview');
  });
});

describe('isOfficeFramePath', () => {
  it('frames the Office and its classes', () => {
    expect(isOfficeFramePath('/office')).toBe(true);
    expect(isOfficeFramePath('/office/classes')).toBe(true);
    expect(isOfficeFramePath('/office/c1/plan/d1')).toBe(true);
    expect(isOfficeFramePath('/office/c1/sessions/s1')).toBe(true);
  });

  it('leaves the projected surfaces the whole screen', () => {
    expect(isOfficeFramePath('/office/c1/present/d1')).toBe(false);
    expect(isOfficeFramePath('/office/c1/sessions/s1/projector')).toBe(false);
  });

  it('is false elsewhere', () => {
    expect(isOfficeFramePath('/teacher')).toBe(false);
    expect(isOfficeFramePath('/classrooms/c1')).toBe(false);
  });
});

describe('isOfficePresentPath', () => {
  it('is Present only', () => {
    expect(isOfficePresentPath('/office/c1/present/d1')).toBe(true);
    expect(isOfficePresentPath('/office/c1/plan/d1')).toBe(false);
    expect(isOfficePresentPath('/office/c1/sessions/s1/projector')).toBe(false);
  });
});
