"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, MessageSquare } from "lucide-react";
import { ReviewField } from "@/components/review/ReviewField";
import { FeedbackDrawer } from "@/components/review/FeedbackDrawer";
import { AuditTimeline } from "@/components/review/AuditTimeline";
import { PageContainer } from "@/components/ui/page-container";

export default function ReviewEventPage() {
  const params = useParams<{ id: string }>();
  const event = useQuery(api.events.getForReview, { id: params.id as any });
  const threads = useQuery(api.feedback.getThreadsByEvent, { eventId: params.id as any });

  const requestChanges = useMutation(api.events.requestChanges);
  const approveEvent = useMutation(api.events.approve);
  const createThread = useMutation(api.feedback.createThread);

  const [selectedField, setSelectedField] = useState<string | null>(null);

  const FIELD_GROUPS = useMemo(() => [
    {
      title: "Basic Information",
      fields: [
        { key: "title", label: "Event Title", required: true },
        { key: "shortDescription", label: "Description", required: true },
      ],
    },
    {
      title: "Logistics",
      fields: [
        { key: "eventDate", label: "Date & Time", required: true },
        { key: "venue", label: "Venue", required: true },
        { key: "capacity", label: "Capacity", required: true },
      ],
    },
    {
      title: "Audience & Format",
      fields: [
        { key: "formats", label: "Event Formats", required: true },
        { key: "targetAudience", label: "Target Audience", required: true },
        { key: "isPublic", label: "Public Event", required: true },
      ],
    },
  ], []);

  const selectedThread = threads?.find((t: any) => t.fieldPath === selectedField);
  const selectedTitle = FIELD_GROUPS.flatMap((g) => g.fields).find((f) => f.key === selectedField)?.label;

  async function handleSubmitFeedback(message: string, reason?: string) {
    if (!event?._id || !selectedField) return;
    if (selectedField === "_request_changes") {
      await requestChanges({ id: event._id, message });
      setSelectedField(null);
      return;
    }
    await createThread({ eventId: event._id, fieldPath: selectedField, message, reason });
    setSelectedField(null);
  }

  if (event === undefined) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }
  if (event === null) {
    return <div className="text-sm text-muted-foreground">Not found or unauthorized.</div>;
  }

  return (
    <PageContainer className="" maxWidth="full">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="col-span-1 lg:col-span-2 space-y-4 sm:space-y-6">
          <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{event?.title}</CardTitle>
                <CardDescription>
                  Submitted by {event?.host?.name} {event?.host?.orgName ? `• ${event.host.orgName}` : ""}
                </CardDescription>
              </div>
              <Badge variant="outline">{event?.status}</Badge>
            </div>
          </CardHeader>
        </Card>

        {FIELD_GROUPS.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle className="text-lg">{group.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.fields.map((field) => (
                <ReviewField
                  key={field.key}
                  field={field as any}
                  value={(event as any)?.[field.key]}
                  thread={threads?.find((t: any) => t.fieldPath === field.key)}
                  onFeedback={() => setSelectedField(field.key)}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

        <div className="space-y-4 col-span-1">
          <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="default" onClick={() => approveEvent({ id: event._id })}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Event
            </Button>
            <Button className="w-full" variant="outline" onClick={() => setSelectedField("_request_changes") }>
              <MessageSquare className="mr-2 h-4 w-4" />
              Request Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditTimeline eventId={event._id} />
          </CardContent>
        </Card>
        </div>
           </div>

        <FeedbackDrawer
        open={!!selectedField}
        onClose={() => setSelectedField(null)}
        fieldKey={selectedField}
        title={selectedTitle}
        thread={selectedThread}
        onSubmit={handleSubmitFeedback}
        />
          </PageContainer>
  );
}
