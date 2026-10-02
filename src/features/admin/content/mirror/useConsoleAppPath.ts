import { useLocation } from 'react-router-dom';
import { consoleAppPath } from './mirrorPaths';

/** The app section the current console page belongs to (see `consoleAppPath`). */
export const useConsoleAppPath = (): string | null =>
  consoleAppPath(useLocation().pathname);
