"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "full";

const maxWidthClass: Record<MaxWidth, string> = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  "4xl": "max-w-4xl",
  full: "max-w-full",
};

export function PageContainer({
  children,
  className,
  maxWidth = "full",
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: MaxWidth;
}) {
  return (
    <div className={cn("w-full mx-auto px-4 sm:px-6", maxWidthClass[maxWidth], className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 sm:mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {right && <div className="flex-none">{right}</div>}
    </div>
  );
}

export function DashboardSection({
  title,
  description,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4 sm:space-y-6", className)}>
      {(title || description) && (
        <header className="space-y-1">
          {title && <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
