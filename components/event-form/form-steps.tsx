"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FieldWithHelp, MultiSelect, DatePicker } from "./field-with-help";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventFormData, EVENT_FORMATS } from "@/lib/validations/event";

interface StepProps {
  form: UseFormReturn<EventFormData>;
  onNext?: () => void;
  onPrev?: () => void;
  isLoading?: boolean;
}

// Step 1: Event Basics
export function BasicsStep({ form, onNext, isLoading }: StepProps) {
  const { control, trigger } = form;

  const handleNext = async () => {
    const isValid = await trigger(["title", "shortDescription"]);
    if (isValid && onNext) {
      onNext();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Basics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="title"
          render={({ field, fieldState: { error } }) => (
            <FieldWithHelp
              label="Event Title"
              help="Be compelling and clear. This will be the first thing people see."
              error={error?.message}
              required
            >
              <Input 
                placeholder="e.g., AI Founders Mixer: Building the Future"
                {...field}
              />
            </FieldWithHelp>
          )}
        />

        <FormField
          control={control}
          name="shortDescription"
          render={({ field, fieldState: { error } }) => (
            <FieldWithHelp
              label="Short Description"
              help="Include speakers, what makes this event special, and key takeaways. This appears in listings."
              error={error?.message}
              required
            >
              <Textarea 
                placeholder="Join us for an evening of networking with AI startup founders. We'll discuss fundraising strategies, product development, and the latest trends in artificial intelligence..."
                rows={4}
                {...field}
              />
            </FieldWithHelp>
          )}
        />

        <div className="flex justify-end">
          <Button 
            type="button" 
            onClick={handleNext}
            disabled={isLoading}
          >
            Next: Logistics
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 2: Logistics
export function LogisticsStep({ form, onNext, onPrev, isLoading }: StepProps) {
  const { control, trigger } = form;

  const handleNext = async () => {
    const isValid = await trigger(["eventDate", "venue", "capacity"]);
    if (isValid && onNext) {
      onNext();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Logistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="eventDate"
          render={({ field, fieldState: { error } }) => (
            <FieldWithHelp
              label="Event Date & Time"
              help="Check the HTW calendar for conflicts. Consider timezone for virtual events."
              error={error?.message}
              required
            >
              <DatePicker 
                value={field.value}
                onChange={field.onChange}
                placeholder="Select date"
              />
            </FieldWithHelp>
          )}
        />

        <FormField
          control={control}
          name="venue"
          render={({ field, fieldState: { error } }) => (
            <FieldWithHelp
              label="Venue"
              help="Your office, a partner's space, or see the approved venue list."
              error={error?.message}
              required
            >
              <Input 
                placeholder="e.g., Acme Corp Office, 123 Main St, SF"
                {...field}
              />
            </FieldWithHelp>
          )}
        />

        <FormField
          control={control}
          name="capacity"
          render={({ field, fieldState: { error } }) => (
            <FieldWithHelp
              label="Target Capacity"
              help="Set 20-30% above your ideal attendance to account for no-shows."
              error={error?.message}
              required
            >
              <Input 
                type="number"
                min="10"
                max="1000"
                placeholder="50"
                value={field.value || ""}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")}
              />
            </FieldWithHelp>
          )}
        />

        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline"
            onClick={onPrev}
            disabled={isLoading}
          >
            Previous
          </Button>
          <Button 
            type="button" 
            onClick={handleNext}
            disabled={isLoading}
          >
            Next: Audience
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 3: Audience & Format
export function AudienceStep({ form, onNext, onPrev, isLoading }: StepProps) {
  const { control, trigger, watch } = form;

  const handleNext = async () => {
    const isValid = await trigger(["formats", "isPublic", "targetAudience", "hasHostedBefore"]);
    if (isValid && onNext) {
      onNext();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audience & Format</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="formats"
          render={({ field, fieldState: { error } }) => (
            <FieldWithHelp
              label="Event Format (Select up to 3)"
              help="Choose the formats that best describe your event structure."
              error={error?.message}
              required
            >
              <MultiSelect
                options={EVENT_FORMATS}
                value={field.value || []}
                onChange={field.onChange}
                maxSelections={3}
              />
            </FieldWithHelp>
          )}
        />

        <FormField
          control={control}
          name="isPublic"
          render={({ field, fieldState: { error } }) => (
            <FieldWithHelp
              label="Event Type"
              help="Public events have open registration. Private events are invitation-only."
              error={error?.message}
              required
            >
              <RadioGroup
                value={field.value ? "public" : "private"}
                onValueChange={(value) => field.onChange(value === "public")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public">Public - Open registration</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private">Private - Invitation only</Label>
                </div>
              </RadioGroup>
            </FieldWithHelp>
          )}
        />

        <FormField
          control={control}
          name="targetAudience"
          render={({ field, fieldState: { error } }) => (
            <FieldWithHelp
              label="Target Audience"
              help="Be specific about who would benefit most from this event (e.g., 'B2B SaaS founders', 'ML engineers', 'early-stage startup founders')."
              error={error?.message}
              required
            >
              <Textarea 
                placeholder="e.g., AI startup founders and CTOs building B2B products, particularly those in Series A-B stage looking to scale their teams..."
                rows={3}
                {...field}
              />
            </FieldWithHelp>
          )}
        />

        <FormField
          control={control}
          name="hasHostedBefore"
          render={({ field, fieldState: { error } }) => (
            <FieldWithHelp
              label="Hosting Experience"
              help="This helps us provide the right level of guidance and support."
              error={error?.message}
              required
            >
              <RadioGroup
                value={field.value ? "yes" : "no"}
                onValueChange={(value) => field.onChange(value === "yes")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="hosted-yes" />
                  <Label htmlFor="hosted-yes">Yes, I've hosted HTW events before</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="hosted-no" />
                  <Label htmlFor="hosted-no">No, this is my first HTW event</Label>
                </div>
              </RadioGroup>
            </FieldWithHelp>
          )}
        />

        <FormField
          control={control}
          name="planningDocUrl"
          render={({ field, fieldState: { error } }) => (
            <FieldWithHelp
              label="Planning Document (Optional)"
              help="Share a Google Doc or similar with your event planning details, agenda, or speaker information."
              error={error?.message}
            >
              <Input 
                placeholder="https://docs.google.com/..."
                {...field}
              />
            </FieldWithHelp>
          )}
        />

        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline"
            onClick={onPrev}
            disabled={isLoading}
          >
            Previous
          </Button>
          <Button 
            type="button" 
            onClick={handleNext}
            disabled={isLoading}
          >
            Next: Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 4: Review & Submit
export function ReviewStep({ form, onPrev, isLoading, onSubmit }: StepProps & { onSubmit: () => Promise<void> }) {
  const { control, watch } = form;
  const values = watch();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review & Submit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Event Summary */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold">Event Summary</h3>
          <div className="grid gap-2 text-sm">
            <div><strong>Title:</strong> {values.title}</div>
            <div><strong>Date:</strong> {values.eventDate ? new Date(values.eventDate).toLocaleDateString() : "Not set"}</div>
            <div><strong>Venue:</strong> {values.venue}</div>
            <div><strong>Capacity:</strong> {values.capacity} people</div>
            <div><strong>Format:</strong> {values.formats?.join(", ")}</div>
            <div><strong>Type:</strong> {values.isPublic ? "Public" : "Private"}</div>
            <div><strong>Target Audience:</strong> {values.targetAudience}</div>
            {values.planningDocUrl && <div><strong>Planning Doc:</strong> <a href={values.planningDocUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View Document</a></div>}
          </div>
        </div>

        {/* Agreement */}
        <FormField
          control={control}
          name="agreementAccepted"
          render={({ field, fieldState: { error } }) => (
            <FieldWithHelp
              label=""
              error={error?.message}
              required
            >
              <div className="flex items-start space-x-2">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <div className="grid gap-1.5 leading-none">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I accept the HTW Host Agreement *
                  </label>
                  <p className="text-xs text-muted-foreground">
                    By submitting this event, I agree to follow HTW guidelines, provide a professional experience, and maintain the community standards. 
                    <a href="/host-agreement" target="_blank" className="text-primary hover:underline ml-1">
                      View full agreement
                    </a>
                  </p>
                </div>
              </div>
            </FieldWithHelp>
          )}
        />

        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline"
            onClick={onPrev}
            disabled={isLoading}
          >
            Previous
          </Button>
          <Button 
            type="submit"
            disabled={isLoading || !values.agreementAccepted}
          >
            {isLoading ? "Submitting..." : "Submit Event for Review"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
