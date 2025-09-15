"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface StepsProps {
  steps: { label: string }[];
  current: number; // 0-indexed
}

export function Steps({ steps, current }: StepsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {steps.map((s, i) => {
        const isActive = i <= current;
        const isCurrent = i === current;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-2",
            )}>
              <div className={cn(
                "size-6 rounded-full border flex items-center justify-center text-xs font-medium",
                isActive ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border",
                isCurrent && "ring-2 ring-primary/30"
              )}>
                {i + 1}
              </div>
              <div className={cn("text-sm whitespace-nowrap", isActive ? "text-foreground" : "text-muted-foreground")}>{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("h-px w-8 sm:w-12", isActive ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
