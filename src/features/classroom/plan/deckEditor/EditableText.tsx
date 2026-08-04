/**
 * EditableText — an in-place, auto-growing, transparent textarea styled to
 * match the slide text it replaces. It inherits font/weight/colour from its
 * container and takes the same `--slide-*-fz` token the static `SlideHeading`
 * uses, so the caret sits on glyphs at the exact size they present at.
 *
 * Deliberately a textarea (not contentEditable): each instance binds to ONE
 * `LocalizedText` language field, and title/prompt render as separately-styled
 * nodes — a single editable HTML subtree would fight React-controlled updates
 * and per-line styling.
 */
import { useLayoutEffect, useRef } from 'react';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** e.g. 'var(--slide-title-fz)'. */
  fontSizeVar: string;
  /** Colour / weight / leading utilities matching the static node. */
  className?: string;
  ariaLabel: string;
}

export const EditableText = ({
  value,
  onChange,
  placeholder,
  fontSizeVar,
  className,
  ariaLabel,
}: EditableTextProps) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow: collapse then grow to content so there's never an inner scrollbar.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, fontSizeVar]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      spellCheck
      className={`w-full resize-none border-0 bg-transparent p-0 leading-tight outline-none placeholder:text-white/25 focus:outline-none focus-visible:outline-none ${className ?? ''}`}
      style={{ fontSize: fontSizeVar, fontFamily: 'inherit' }}
    />
  );
};
