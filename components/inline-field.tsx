"use client";

import { useEffect, useRef } from "react";

export interface InlineFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocus: (label: string | null) => void;
  placeholder?: string;
  className?: string;
  minWidth?: number;
  autoFocus?: boolean;
  multiline?: boolean;
}

// Auto-sizing text input that looks like plain styled text until focused.
// When focused, the parent's `onFocus(label)` is called so the editor can
// show a floating "EDITING — LABEL" eyebrow.
export function InlineField({
  id,
  label,
  value,
  onChange,
  onFocus,
  placeholder,
  className,
  minWidth = 40,
  autoFocus = false,
}: InlineFieldProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  // Auto-size: width follows content + a small buffer.
  // Using `size` attribute on an <input> gives this for free.
  const displayed = value || placeholder || "";
  const size = Math.max(displayed.length + 1, 2);

  return (
    <input
      ref={ref}
      id={id}
      type="text"
      className={`inline-field ${className ?? ""}`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => onFocus(label)}
      onBlur={() => onFocus(null)}
      size={size}
      style={{ minWidth }}
      autoComplete="off"
      spellCheck={false}
    />
  );
}
