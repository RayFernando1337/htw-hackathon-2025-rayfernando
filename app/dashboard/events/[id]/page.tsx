"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  ExternalLink,
  MapPin,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  EventEditFormData,
  eventEditSchema,
  eventSchema,
  getFieldErrors,
} from "@/lib/validations/event";

import { AudienceStep, BasicsStep, LogisticsStep } from "@/components/event-form/form-steps";
import { DashboardSection, PageContainer, PageHeader } from "@/components/ui/page-container";
import { useFormDraft } from "@/hooks/useFormDraft";
import { AutoSaveIndicator } from "@/components/event-form/field-with-help";

const statusConfig = {
  draft: {
    label: "Draft",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    icon: Edit,
    description: "This event is still being edited and hasn't been submitted for review.",
  },
  submitted: {
    label: "Under Review",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    icon: Clock,
    description: "Your event has been submitted and is being reviewed by the HTW team.",
  },
  changes_requested: {
    label: "Changes Requested",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    icon: XCircle,
    description: "The HTW team has requested changes before this event can be approved.",
  },
  resubmitted: {
    label: "Resubmitted",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    icon: Clock,
    description: "Your updated event has been resubmitted and is under review.",
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    icon: CheckCircle,
    description: "Your event has been approved and will be published soon.",
  },
  published: {
    label: "Published",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    icon: ExternalLink,
    description: "Your event is live and accepting registrations.",
  },
} as const;

function EventDetailLoading() {
  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="flex-1">
          <Skeleton className="h-8 w-1/2 mb-2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const eventId = params.id as Id<"events">;
  const event = useQuery(api.events.getEventById, { id: eventId });
  const updateDraft = useMutation(api.events.updateDraft);
  const submitEvent = useMutation(api.events.submitEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);
  const threads = useQuery(api.feedback.getThreadsByEvent, { eventId } as any);
  const addComment = useMutation(api.feedback.addComment);

  const form = useForm<EventEditFormData>({
    resolver: zodResolver(eventEditSchema),
    values: event
      ? {
          title: event.title,
          shortDescription: event.shortDescription,
          eventDate: event.eventDate,
          venue: event.venue,
          capacity: event.capacity,
          formats: event.formats,
          isPublic: event.isPublic,
          hasHostedBefore: event.hasHostedBefore,
          targetAudience: event.targetAudience,
          planningDocUrl: event.planningDocUrl || "",
          agreementAccepted: !!event.agreementAcceptedAt,
        }
      : undefined,
  });

  // Autosave form draft while editing
  const draftKey = `event-edit:${eventId}`;
  const watched = form.watch();
  const { status: draftStatus, restore, clear: clearFormDraft } = useFormDraft({
    key: draftKey,
    data: isEditing ? watched : undefined,
    enabled: Boolean(event) && isEditing,
  });

  // If a draft exists and we're entering edit mode, merge it once
  const appliedRestoreRef = useRef(false);
  useEffect(() => {
    if (isEditing && restore && event && !appliedRestoreRef.current) {
      Object.entries(restore as any).forEach(([k, v]) => {
        if (v !== undefined) {
          // @ts-ignore
          form.setValue(k, v, { shouldDirty: false });
        }
      });
      appliedRestoreRef.current = true;
    }
    if (!isEditing) appliedRestoreRef.current = false;
  }, [isEditing, restore, event, form]);

  if (event === undefined) {
    return <EventDetailLoading />;
  }

  if (event === null) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
        <p className="text-muted-foreground mb-4">
          The event you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button onClick={() => router.push("/dashboard/events")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Events
        </Button>
      </div>
    );
  }

  const config = statusConfig[event.status];
  const canEdit = event.status === "draft" || event.status === "changes_requested";
  const canDelete = event.status === "draft";
  const canSubmit = event.status === "draft" || event.status === "changes_requested";
  const StatusIcon = config.icon;

  const handleSave = async (data: EventEditFormData) => {
    try {
      // Do not send agreementAccepted to backend; convert to agreementAcceptedAt
      const { agreementAccepted, ...rest } = data;
      await updateDraft({
        id: eventId,
        ...rest,
        agreementAcceptedAt: agreementAccepted ? Date.now() : undefined,
      });
      toast.success("Event updated successfully!");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update event");
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate current form values against full schema for UX feedback
      const values = form.getValues();
      const validation = eventSchema.safeParse(values);
      if (!validation.success) {
        const fieldErrors = getFieldErrors(validation.error);
        Object.entries(fieldErrors).forEach(([name, message]) => {
          form.setError(name as any, { type: "manual", message });
        });
        // Focus first error field
        const firstError = Object.keys(fieldErrors)[0];
        if (firstError) form.setFocus(firstError as any);
        toast.error("Please complete required fields before submitting.");
        return;
      }

      await submitEvent({ id: eventId });
      await clearFormDraft();
      toast.success("Event submitted for review!");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit event");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEvent({ id: eventId });
      toast.success("Event deleted successfully!");
      router.push("/dashboard/events");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete event");
    }
  };

  return (
    <PageContainer className="space-y-6" maxWidth="full">
      {/* Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold break-words">{event.title}</h1>
            <Badge className={config.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
            {isEditing && <AutoSaveIndicator status={draftStatus} />}
          </div>
        }
        subtitle={`Created ${format(new Date(event._creationTime), "PPP")}`}
        right={
          <div className="flex items-center gap-2">
            {/* Mobile: primary CTA + actions menu */}
            {!isEditing && canSubmit ? (
              <Button onClick={handleSubmit} className="sm:hidden">
                Submit for Review
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="sm:hidden">
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/dashboard/events`)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Events
                </DropdownMenuItem>
                {canEdit && !isEditing && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                )}
                {canSubmit && !isEditing && (
                  <DropdownMenuItem onClick={handleSubmit}>Submit for Review</DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem asChild>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="w-full text-left text-red-600">Delete</button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Event</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this event? This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Desktop: show full actions */}
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/events`)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Events
              </Button>
              {canEdit && !isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
              )}
              {canSubmit && !isEditing && <Button onClick={handleSubmit}>Submit for Review</Button>}
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Event</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this event? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        }
      />

      {/* Status Alert */}
      <Alert>
        <StatusIcon className="h-4 w-4" />
        <AlertDescription>{config.description}</AlertDescription>
      </Alert>

      {/* Feedback (if any) */}
      {threads && threads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Feedback from Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {threads
              ?.filter((t: any) => t.status === "open")
              .map((t: any) => (
                <div key={t._id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Field: {t.fieldPath}</div>
                    {t.reason && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">{t.reason}</Badge>
                    )}
                  </div>
                  <div className="mt-2 space-y-2">
                    {t.comments?.map((c: any) => (
                      <div key={c._id} className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">{c.author?.name || "User"}:</span> {c.message}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Reply to feedback..."
                      className="flex-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      onKeyDown={async (e) => {
                        const target = e.target as HTMLInputElement;
                        if (e.key === "Enter" && target.value.trim()) {
                          await addComment({ threadId: t._id, message: target.value.trim() } as any);
                          target.value = "";
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={async (e) => {
                        const input = (e.currentTarget.previousSibling as HTMLInputElement);
                        if (input && input.value.trim()) {
                          await addComment({ threadId: t._id, message: input.value.trim() } as any);
                          input.value = "";
                        }
                      }}
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Edit Form or View Mode */}
      {isEditing ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSave, () =>
              toast.error("Please fix any invalid values and try again.")
            )}
            className="space-y-6"
          >
            <BasicsStep form={form} />
            <LogisticsStep form={form} />
            <AudienceStep form={form} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <DashboardSection>
          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Description</h3>
                <p>{event.shortDescription}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {event.eventDate ? format(new Date(event.eventDate), "PPP") : "Date TBD"}
                    </div>
                    <div className="text-sm text-muted-foreground">Event Date</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{event.venue}</div>
                    <div className="text-sm text-muted-foreground">Venue</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{event.capacity} people</div>
                    <div className="text-sm text-muted-foreground">Capacity</div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">Event Formats</h3>
                <div className="flex flex-wrap gap-2">
                  {event.formats.map((format) => (
                    <Badge key={format} variant="secondary">
                      {format}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-1">Event Type</h3>
                  <p>
                    {event.isPublic ? "Public - Open registration" : "Private - Invitation only"}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-1">
                    First Time Host
                  </h3>
                  <p>
                    {event.hasHostedBefore
                      ? "No, I've hosted before"
                      : "Yes, this is my first HTW event"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Target Audience</h3>
                <p>{event.targetAudience}</p>
              </div>

              {event.planningDocUrl && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-1">
                    Planning Document
                  </h3>
                  <a
                    href={event.planningDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    View Document <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Links and Actions for Published Events */}
          {event.status === "published" && (
            <Card>
              <CardHeader>
                <CardTitle>Event Links</CardTitle>
              </CardHeader>
              <CardContent>
                {event.lumaUrl && (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Luma Event Page</h3>
                      <p className="text-sm text-muted-foreground">
                        Registration and event details
                      </p>
                    </div>
                    <Button asChild variant="outline">
                      <a href={event.lumaUrl} target="_blank" rel="noopener noreferrer">
                        View Event <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </DashboardSection>
      )}
    </PageContainer>
  );
}
