import type { ComponentType } from 'react';

/**
 * Shared types for the content back office's per-kind WYSIWYG editors.
 *
 * Kept in their own module (not in kinds.ts) so an editor component can import
 * the props type while kinds.ts imports the component value, without a cycle.
 */

/**
 * Props a per-kind structural editor receives. It owns the subset of the
 * content body declared in `KindSpec.structuralKeys` and edits it in place via
 * `onChange`, which replaces the whole body (the editor makes immutable copies).
 */
export interface StructuredEditorProps {
  body: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

export type StructuredEditor = ComponentType<StructuredEditorProps>;

/** A read-only preview that renders the app's real component for a body. */
export type ContentPreview = ComponentType<{
  body: Record<string, unknown>;
}>;
