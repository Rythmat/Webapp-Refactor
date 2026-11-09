import type { ReactNode } from 'react';
import { OFFICE_PAGE } from '../ui/styles';

/**
 * The stage's page column, for the class pages written before the Office
 * frame (Plan, Calendar, Students), which bring no gutters of their own.
 */
export const OfficePage = ({ children }: { children: ReactNode }) => (
  <div className={OFFICE_PAGE}>{children}</div>
);
