import { z } from "zod";

// Event form validation schema matching Fillout exactly
export const eventSchema = z.object({
  title: z
    .string()
    .min(1, "Event title is required")
    .max(100, "Title must be under 100 characters"),

  shortDescription: z
    .string()
    .min(50, "Description must be at least 50 characters")
    .max(500, "Description must be under 500 characters"),

  eventDate: z
    .string()
    .min(1, "Event date is required")
    .refine(
      (date) => {
        const selectedDate = new Date(date);
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Reset to start of today
        return selectedDate >= now;
      },
      {
        message: "Event date must be today or in the future",
      }
    ),

  venue: z.string().min(1, "Venue is required").max(200, "Venue name must be under 200 characters"),

  capacity: z
    .number()
    .min(10, "Minimum capacity is 10 people")
    .max(1000, "Maximum capacity is 1000 people"),

  formats: z
    .array(z.string())
    .min(1, "Please select at least one event format")
    .max(3, "Maximum 3 formats allowed"),

  isPublic: z.boolean(),

  hasHostedBefore: z.boolean(),

  targetAudience: z
    .string()
    .min(1, "Target audience is required")
    .max(300, "Target audience description must be under 300 characters"),

  planningDocUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),

  agreementAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the host agreement to proceed",
  }),
});

// Partial schema for draft saving (all fields optional except basic info)
export const eventDraftSchema = z.object({
  title: z.string().max(100, "Title must be under 100 characters").optional(),
  shortDescription: z.string().max(500, "Description must be under 500 characters").optional(),
  eventDate: z.string().optional(),
  venue: z.string().max(200, "Venue name must be under 200 characters").optional(),
  capacity: z.number().min(10).max(1000).optional(),
  formats: z.array(z.string()).max(3).optional(),
  isPublic: z.boolean().optional(),
  hasHostedBefore: z.boolean().optional(),
  targetAudience: z
    .string()
    .max(300, "Target audience description must be under 300 characters")
    .optional(),
  planningDocUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

// Edit form schema (draft-friendly) that also includes optional agreement flag
export const eventEditSchema = eventDraftSchema.extend({
  agreementAccepted: z.boolean().optional(),
});

// Step-specific validation schemas
export const basicsStepSchema = z.object({
  title: eventSchema.shape.title,
  shortDescription: eventSchema.shape.shortDescription,
});

export const logisticsStepSchema = z.object({
  eventDate: eventSchema.shape.eventDate,
  venue: eventSchema.shape.venue,
  capacity: eventSchema.shape.capacity,
});

export const audienceStepSchema = z.object({
  formats: eventSchema.shape.formats,
  isPublic: eventSchema.shape.isPublic,
  targetAudience: eventSchema.shape.targetAudience,
  hasHostedBefore: eventSchema.shape.hasHostedBefore,
  planningDocUrl: eventSchema.shape.planningDocUrl,
});

export const reviewStepSchema = z.object({
  agreementAccepted: eventSchema.shape.agreementAccepted,
});

// Type inference
export type EventFormData = z.infer<typeof eventSchema>;
export type EventDraftData = z.infer<typeof eventDraftSchema>;
export type EventEditFormData = z.infer<typeof eventEditSchema>;
export type BasicsStepData = z.infer<typeof basicsStepSchema>;
export type LogisticsStepData = z.infer<typeof logisticsStepSchema>;
export type AudienceStepData = z.infer<typeof audienceStepSchema>;
export type ReviewStepData = z.infer<typeof reviewStepSchema>;

// Event format options (matching Fillout)
export const EVENT_FORMATS = [
  { value: "panel", label: "Panel Discussion" },
  { value: "mixer", label: "Networking Mixer" },
  { value: "workshop", label: "Workshop" },
  { value: "demo", label: "Product Demo" },
  { value: "fireside", label: "Fireside Chat" },
  { value: "roundtable", label: "Roundtable" },
  { value: "presentation", label: "Presentation" },
  { value: "social", label: "Social Event" },
] as const;

// Helper function to validate step data
export function validateStep(step: number, data: Partial<EventFormData>) {
  switch (step) {
    case 0:
      return basicsStepSchema.safeParse(data);
    case 1:
      return logisticsStepSchema.safeParse(data);
    case 2:
      return audienceStepSchema.safeParse(data);
    case 3:
      return reviewStepSchema.safeParse(data);
    default:
      return { success: false, error: { issues: [{ message: "Invalid step" }] } };
  }
}

// Helper function to get field errors for form display
export function getFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};

  error.issues.forEach((issue) => {
    if (issue.path.length > 0) {
      fieldErrors[issue.path[0] as string] = issue.message;
    }
  });

  return fieldErrors;
}
