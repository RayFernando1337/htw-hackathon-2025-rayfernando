"use client";

import { cn } from "@/lib/utils";

export interface StepsProps {
  steps: { label: string }[];
  current: number; // 0-indexed
}

export function Steps({ steps, current }: StepsProps) {
  return (
    <div className="w-full">
      {/* Mobile: Compact current step indicator */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
              {current + 1}
            </div>
            <div className="text-sm font-medium">{steps[current].label}</div>
          </div>
          <div className="text-xs text-muted-foreground">
            {current + 1} of {steps.length}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: Full step indicator */}
      <div className="hidden sm:flex sm:items-center sm:gap-2">
        {steps.map((s, i) => {
          const isActive = i <= current;
          const isCurrent = i === current;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "size-6 rounded-full border flex items-center justify-center text-xs font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border",
                    isCurrent && "ring-2 ring-primary/30"
                  )}
                >
                  {i + 1}
                </div>
                <div
                  className={cn(
                    "text-sm whitespace-nowrap",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className={cn("h-px w-8 sm:w-12", isActive ? "bg-primary" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
