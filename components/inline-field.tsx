"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export const FieldErrorsContext = createContext<Record<string, string>>({});

function fieldKey(id: string): string {
  if (id.startsWith("sig-name")) return "fullName";
  if (id === "sig-job") return "jobTitle";
  return id.replace(/^sig-/, "");
}

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
  const measuredWidthRef = useRef(minWidth);
  const [measuredWidth, setMeasuredWidth] = useState(minWidth);
  const field = fieldKey(id);
  const error = useContext(FieldErrorsContext)[field];

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  // Auto-size against the actual rendered font. Browser `size` units leave
  // oversized gaps with display fonts, especially in split-name templates.
  const displayed = value || placeholder || "";
  const size = Math.max(displayed.length + 1, 2);

  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    let isActive = true;

    const measure = () => {
      if (!isActive) return;

      const styles = window.getComputedStyle(input);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return;

      context.font = `${styles.fontStyle} ${styles.fontVariant} ${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
      const displayText =
        styles.textTransform === "uppercase"
          ? displayed.toUpperCase()
          : styles.textTransform === "lowercase"
            ? displayed.toLowerCase()
            : displayed;
      const text = displayText || " ";
      const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
      // Canvas measureText ignores CSS letter-spacing — without this, tracked
      // uppercase fields (e.g. the Underline job title) clip their last character.
      const letterSpacing = Number.parseFloat(styles.letterSpacing) || 0;
      const trackingWidth = letterSpacing * Array.from(text).length;
      const nextWidth = Math.ceil(context.measureText(text).width + trackingWidth + horizontalPadding + 6);
      const clampedWidth = Math.max(minWidth, nextWidth);

      if (clampedWidth !== measuredWidthRef.current) {
        measuredWidthRef.current = clampedWidth;
        setMeasuredWidth(clampedWidth);
      }
    };

    const frame = window.requestAnimationFrame(measure);
    void document.fonts?.ready.then(measure);
    return () => {
      isActive = false;
      window.cancelAnimationFrame(frame);
    };
  });

  return (
    <input
      ref={ref}
      id={id}
      aria-label={label}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `validation-${field}` : undefined}
      type="text"
      className={`inline-field ${className ?? ""}`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => onFocus(label)}
      onBlur={() => onFocus(null)}
      size={size}
      style={{ minWidth, width: measuredWidth }}
      autoComplete="off"
      spellCheck={false}
    />
  );
}
