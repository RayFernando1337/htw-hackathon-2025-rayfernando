"use client";

import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import * as React from "react";

interface FieldWithHelpProps {
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode; // e.g., feedback badge
}

export function FieldWithHelp({
  label,
  help,
  error,
  required = false,
  children,
  className,
  right,
}: FieldWithHelpProps) {
  return (
    <FormItem className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FormLabel>
        {right}
      </div>
      <FormControl>{children}</FormControl>
      {help && <FormDescription className="text-xs text-muted-foreground">{help}</FormDescription>}
      {error && <FormMessage>{error}</FormMessage>}
    </FormItem>
  );
}

// Step indicator component for multi-step form
export interface Step {
  id: string;
  title: string;
  fields?: string[];
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn("space-y-4 sm:space-y-0", className)}>
      {/* Mobile: Current Step Highlight */}
      <div className="sm:hidden bg-muted/30 rounded-lg p-4 border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              {currentStep + 1}
            </div>
            <div>
              <h3 className="font-semibold">{steps[currentStep].title}</h3>
              <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-muted-foreground">Progress</div>
            <div className="text-lg font-bold">
              {Math.round(((currentStep + 1) / steps.length) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Full Step Indicator */}
      <div className="hidden sm:flex sm:items-center sm:justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex items-center min-w-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                  index < currentStep
                    ? "bg-primary text-primary-foreground"
                    : index === currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                )}
                aria-current={index === currentStep ? "step" : undefined}
              >
                {index < currentStep ? "✓" : index + 1}
              </div>
              <div className="ml-3 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium whitespace-normal break-words",
                    index <= currentStep ? "text-foreground" : "text-muted-foreground"
                  )}
                  title={step.title}
                >
                  {step.title}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex flex-1 h-px mx-4",
                  index < currentStep ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Multi-select component for event formats
export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: ReadonlyArray<MultiSelectOption>;
  value: string[];
  onChange: (value: string[]) => void;
  maxSelections?: number;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  maxSelections = 3,
  placeholder = "Select options...",
  className,
}: MultiSelectProps) {
  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];

    if (newValue.length <= maxSelections) {
      onChange(newValue);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {options.map((option) => {
          const isSelected = value.includes(option.value);
          const isDisabled = !isSelected && value.length >= maxSelections;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleToggle(option.value)}
              disabled={isDisabled}
              className={cn(
                "w-full min-h-9 px-3 py-2 text-sm rounded-md border text-left transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input hover:bg-accent hover:text-accent-foreground",
                isDisabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Selected: {value.join(", ")} ({value.length}/{maxSelections})
        </p>
      )}
    </div>
  );
}

// Date picker wrapper (uses HTML date input for simplicity)
interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  min?: string;
}

export function DatePicker({ value, onChange, className, placeholder, min }: DatePickerProps) {
  // Get today's date in YYYY-MM-DD format as minimum
  const today = new Date().toISOString().split("T")[0];

  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min || today}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      placeholder={placeholder}
    />
  );
}

// Auto-save indicator component
interface AutoSaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
  className?: string;
}

export function AutoSaveIndicator({ status, className }: AutoSaveIndicatorProps) {
  const statusConfig = {
    idle: { text: "", color: "text-muted-foreground" },
    saving: { text: "Saving...", color: "text-blue-600" },
    saved: { text: "Saved", color: "text-green-600" },
    error: { text: "Error saving", color: "text-red-600" },
  };

  const config = statusConfig[status];

  // Always reserve space to prevent layout shifts on mobile.
  return (
    <div
      className={cn("flex items-center text-xs h-4", config.color, className)}
      aria-live="polite"
      aria-atomic="true"
    >
      {status === "saving" && (
        <div className="w-3 h-3 mr-1 border border-current border-t-transparent rounded-full animate-spin" />
      )}
      {/* Keep text invisible when idle to maintain dimensions */}
      <span className={cn(status === "idle" && "opacity-0")}>{config.text || "Saved"}</span>
    </div>
  );
}
