"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { FieldWithHelp } from "./field-with-help";

type HostAgreementFieldProps<TForm extends { agreementAccepted?: boolean }> = {
  form: UseFormReturn<TForm>;
  name?: keyof TForm & string; // defaults to "agreementAccepted"
};

export function HostAgreementField<TForm extends { agreementAccepted?: boolean }>({
  form,
  name = "agreementAccepted" as keyof TForm & string,
}: HostAgreementFieldProps<TForm>) {
  return (
    <FormField
      control={form.control as any}
      name={name as any}
      render={({ field, fieldState: { error } }) => (
        <FieldWithHelp label="" error={error?.message} required>
          <div className="flex items-start space-x-2">
            <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
            <div className="grid gap-1.5 leading-none">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I accept the HTW Host Agreement *
              </label>
              <p className="text-xs text-muted-foreground">
                By submitting this event, I agree to follow HTW guidelines, provide a professional
                experience, and maintain the community standards.
                <a
                  href="/host-agreement"
                  target="_blank"
                  className="text-primary hover:underline ml-1"
                >
                  View full agreement
                </a>
              </p>
            </div>
          </div>
        </FieldWithHelp>
      )}
    />
  );
}
