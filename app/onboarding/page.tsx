"use client";

import { ChatMaxingIconColoured } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const onboardingSchema = z.object({
  orgName: z.string().optional(),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  linkedin: z.string().url("Please enter a valid LinkedIn URL").optional().or(z.literal("")),
  x: z.string().url("Please enter a valid X/Twitter URL").optional().or(z.literal("")),
  instagram: z.string().url("Please enter a valid Instagram URL").optional().or(z.literal("")),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      orgName: "",
      website: "",
      linkedin: "",
      x: "",
      instagram: "",
    },
  });

  const onSubmit = async (data: OnboardingFormValues) => {
    try {
      setIsLoading(true);

      // Filter out empty strings
      const cleanData = {
        ...(data.orgName && { orgName: data.orgName }),
        ...(data.website && { website: data.website }),
        ...((data.linkedin || data.x || data.instagram) && {
          socials: {
            ...(data.linkedin && { linkedin: data.linkedin }),
            ...(data.x && { x: data.x }),
            ...(data.instagram && { instagram: data.instagram }),
          },
        }),
      };

      await completeOnboarding(cleanData);
      toast.success("Welcome! Your profile has been set up.");
      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <ChatMaxingIconColoured className="mx-auto h-12 w-12" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Welcome to HTW Events</h2>
          <p className="mt-2 text-sm text-gray-600">Let's set up your profile to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Complete your profile</CardTitle>
            <CardDescription>
              Help us understand who you are and how to reach you (all fields optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="orgName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Tech Startup Inc." {...field} />
                      </FormControl>
                      <FormDescription>The name of your company or organization</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourcompany.com" {...field} />
                      </FormControl>
                      <FormDescription>Your company or personal website</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="text-sm font-medium text-gray-900">Social Media (Optional)</div>

                  <FormField
                    control={form.control}
                    name="linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn</FormLabel>
                        <FormControl>
                          <Input placeholder="https://linkedin.com/in/yourprofile" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="x"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>X (Twitter)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://x.com/yourhandle" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <FormControl>
                          <Input placeholder="https://instagram.com/yourhandle" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onSubmit({})}
                    disabled={isLoading}
                  >
                    Skip for now
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? "Setting up..." : "Complete Setup"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
