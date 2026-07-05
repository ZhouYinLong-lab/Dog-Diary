"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export type IconProps = {
  /** Size in px (sets both width and height) */
  size?: number;
  /** Accessible label for screen readers. Use for meaningful icons. */
  label?: string;
  /** If true, the icon is purely decorative (aria-hidden) */
  decorative?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
};

type LucideProps = IconProps & {
  icon: LucideIcon;
  /** Font Awesome icon (mutually exclusive with lucide icon) */
  faIcon?: never;
};

type FontAwesomeProps = IconProps & {
  faIcon: IconDefinition;
  icon?: never;
};

type Props = LucideProps | FontAwesomeProps;

/**
 * Unified Icon wrapper.
 *
 * Usage:
 *   <Icon icon={CalendarDays} size={18} label="日期" />
 *   <Icon faIcon={faHome} size={20} decorative />
 *
 * Rules:
 * - Always provide `label` for meaningful icons.
 * - Set `decorative` for purely visual icons (no label needed).
 * - Do NOT mix icon styles within the same UI block.
 */
export function Icon({ icon: LucideComponent, faIcon, size = 20, label, decorative, className, style }: Props) {
  const isDecorative = decorative || !label;
  const ariaProps = isDecorative
    ? { "aria-hidden": true as const }
    : { "aria-label": label, role: "img" as const };

  if (faIcon) {
    return (
      <FontAwesomeIcon
        icon={faIcon}
        {...ariaProps}
        className={className}
        style={{ width: size, height: size, flexShrink: 0, ...style }}
      />
    );
  }

  if (!LucideComponent) {
    console.warn("Icon: neither icon nor faIcon provided");
    return null;
  }

  return (
    <LucideComponent
      {...ariaProps}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
    />
  );
}
