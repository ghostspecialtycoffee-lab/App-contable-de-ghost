"use client";

import type { BrandAsset } from "@ghost/domain";

interface BrandLogoProps {
  asset?: BrandAsset | null;
  organizationName?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-base",
  xl: "h-32 w-32 text-lg",
};

export function BrandLogo({
  asset,
  organizationName = "G",
  size = "sm",
  className = "",
}: BrandLogoProps) {
  const label = organizationName.trim().charAt(0).toUpperCase() || "G";
  const sizeClass = sizeClasses[size];

  if (asset?.dataUrl) {
    return (
      <div
        className={[
          "overflow-hidden rounded-lg border border-[var(--ghost-border)] bg-white",
          sizeClass,
          className,
        ].join(" ")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.dataUrl}
          alt={asset.name}
          className="h-full w-full object-contain p-1"
        />
      </div>
    );
  }

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-2)] font-semibold text-[var(--ghost-text-muted)]",
        sizeClass,
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}
