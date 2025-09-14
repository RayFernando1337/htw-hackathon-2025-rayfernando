"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { useFormDraft } from "@/hooks/useFormDraft";

import { AutoSaveIndicator, StepIndicator } from "@/components/event-form/field-with-help";
import {
  AudienceStep,
  BasicsStep,
  LogisticsStep,
  ReviewStep,
} from "@/components/event-form/form-steps";
import { Form } from "@/components/ui/form";
import { PageContainer, PageHeader } from "@/components/ui/page-container";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  EventEditFormData,
  eventDraftSchema,
  eventSchema,
  getFieldErrors,
} from "@/lib/validations/event";

const FORM_STEPS = [
  { id: "basics", title: "Event Basics", fields: ["title", "shortDescription"] },
  { id: "logistics", title: "Logistics", fields: ["eventDate", "venue", "capacity"] },
  { id: "audience", title: "Audience", fields: ["formats", "isPublic", "targetAudience"] },
  { id: "review", title: "Review & Submit" },
];

export default function CreateEventPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [draftId, setDraftId] = useState<Id<"events"> | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  const router = useRouter();
  const createDraft = useMutation(api.events.createDraft);
  const updateDraft = useMutation(api.events.updateDraft);
  const submitEvent = useMutation(api.events.submitEvent);

  const form = useForm<EventEditFormData>({
    resolver: zodResolver(eventDraftSchema),
    defaultValues: {
      title: "",
      shortDescription: "",
      eventDate: "",
      venue: "",
      capacity: 50,
      formats: [],
      isPublic: true,
      hasHostedBefore: false,
      targetAudience: "",
      planningDocUrl: "",
      agreementAccepted: false,
    },
  });

  // Generic draft autosave (in addition to server-side draft writes)
  const { clear: clearLocalDraft } = useFormDraft({ key: "event-create", data: form.watch(), enabled: true });

  // Auto-save functionality
  const debouncedSave = useDebouncedCallback(async (data: Partial<EventEditFormData>) => {
    if (!data || Object.keys(data).length === 0) return;

    setAutoSaveStatus("saving");

    try {
      // Transform agreementAccepted to agreementAcceptedAt for backend
      const saveData = { ...data };
      if ("agreementAccepted" in saveData) {
        if (saveData.agreementAccepted) {
          (saveData as any).agreementAcceptedAt = Date.now();
        }
        delete (saveData as any).agreementAccepted;
      }

      if (draftId) {
        await updateDraft({ id: draftId, ...saveData });
      } else {
        const id = await createDraft(saveData);
        setDraftId(id);
      }
      setAutoSaveStatus("saved");

      // Reset to idle after 2 seconds
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Auto-save failed:", error);
      setAutoSaveStatus("error");
      setTimeout(() => setAutoSaveStatus("idle"), 3000);
    }
  }, 1000);

  // Watch form changes for auto-save
  React.useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (type === "change" && name && name in value) {
        const fieldValue = (value as any)[name];
        if (fieldValue !== undefined) {
          debouncedSave({ [name]: fieldValue });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, debouncedSave]);

  const onSubmit = async (data: EventEditFormData) => {
    if (!draftId) {
      toast.error("Please save your draft first");
      return;
    }

    try {
      // Pre-validate against full submission schema for clear UI feedback
      const result = eventSchema.safeParse(data);
      if (!result.success) {
        const fieldErrors = getFieldErrors(result.error);
        Object.entries(fieldErrors).forEach(([name, message]) => {
          form.setError(name as any, { type: "manual", message });
        });

        // Navigate to the earliest step that contains an error
        const firstErrorField = Object.keys(fieldErrors)[0];
        if (firstErrorField) {
          const stepIndex = FORM_STEPS.findIndex((s) => s.fields?.includes(firstErrorField));
          if (stepIndex >= 0) setCurrentStep(stepIndex);
          form.setFocus(firstErrorField as any);
        }

        toast.error("Please complete required fields before submitting.");
        return;
      }

      // Transform the data for backend, removing agreementAccepted and using agreementAcceptedAt
      const { agreementAccepted, ...submitData } = data;

      // Update with final data including agreement
      await updateDraft({
        id: draftId,
        ...submitData,
        agreementAcceptedAt: agreementAccepted ? Date.now() : undefined,
      });

      // Submit the event
      await submitEvent({ id: draftId });

      // Clear local autosave draft
      await clearLocalDraft();

      toast.success("Event submitted for review!");
      router.push("/dashboard/events");
    } catch (error: any) {
      console.error("Submission failed:", error);
      toast.error(error.message || "Failed to submit event");
    }
  };

  // Explicit save-as-draft (no validation)
  const saveDraftNow = async () => {
    try {
      const values = form.getValues();
      let id = draftId as Id<"events"> | null;
      if (!id) {
        id = await createDraft({
          title: values.title || "",
          shortDescription: values.shortDescription || "",
        });
        setDraftId(id);
      }
      const { agreementAccepted, ...rest } = values;
      await updateDraft({
        id: id!,
        ...rest,
        agreementAcceptedAt: values.agreementAccepted ? Date.now() : undefined,
      });
      await clearLocalDraft();
      toast.success("Draft saved");
      router.push(`/dashboard/events/${id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to save draft");
    }
  };

  const nextStep = () => {
    if (currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageContainer className="py-4 sm:py-6" maxWidth="4xl">
        <PageHeader
          title="Create New Event"
          subtitle={
            <span className="sm:hidden">
              Step {currentStep + 1} of {FORM_STEPS.length}: {FORM_STEPS[currentStep].title}
            </span>
          }
          right={
            <div className="flex items-center gap-2">
              <AutoSaveIndicator status={autoSaveStatus} />
              <Button variant="outline" size="sm" onClick={saveDraftNow}>
                Save Draft
              </Button>
            </div>
          }
        />

        {/* Step Progress */}
        <div className="mb-6 sm:mb-8">
          <StepIndicator steps={FORM_STEPS} currentStep={currentStep} />
        </div>

        {/* Form Content */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="pb-6">
            {currentStep === 0 && (
              <BasicsStep form={form} onNext={nextStep} isLoading={autoSaveStatus === "saving"} />
            )}

            {currentStep === 1 && (
              <LogisticsStep
                form={form}
                onNext={nextStep}
                onPrev={prevStep}
                isLoading={autoSaveStatus === "saving"}
              />
            )}

            {currentStep === 2 && (
              <AudienceStep
                form={form}
                onNext={nextStep}
                onPrev={prevStep}
                isLoading={autoSaveStatus === "saving"}
              />
            )}

            {currentStep === 3 && (
              <ReviewStep
                form={form}
                onPrev={prevStep}
                onSubmit={async () => {
                  await form.handleSubmit(onSubmit)();
                }}
                isLoading={form.formState.isSubmitting}
              />
            )}
          </form>
        </Form>
      </PageContainer>
    </div>
  );
}
