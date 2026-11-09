import { createContext, useContext, type ReactNode } from 'react';

type PlaceholderProps = {
  label: string;
  minHeight?: number;
  className?: string;
};

/**
 * Draws what stands in for a student's own data, or null: render the real
 * thing. The console's mirror of the app provides one (ConsoleMirrorShell),
 * so its pages show students' layouts without per-user data or the per-user
 * APIs behind it; the student and teacher app never sees a difference.
 */
export const PerStudentPreviewContext = createContext<
  ((props: PlaceholderProps) => ReactNode) | null
>(null);

/**
 * A part of a page that shows a student's own data (their projects, their
 * recent activity). Its children render as usual, and in the console's mirror
 * a placeholder of the same shape stands in, the children never mounting.
 */
export const PerStudent = ({
  children,
  ...placeholder
}: PlaceholderProps & { children: ReactNode }) => {
  const render = useContext(PerStudentPreviewContext);
  return <>{render ? render(placeholder) : children}</>;
};
