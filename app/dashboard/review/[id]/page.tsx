"use client";

import { AuditTimeline } from "@/components/review/AuditTimeline";
import { FeedbackDrawer } from "@/components/review/FeedbackDrawer";
import { ReviewField } from "@/components/review/ReviewField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/ui/page-container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Steps } from "@/components/ui/steps";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FIELD_GROUPS } from "@/lib/events/fields";
import { statusToStepIndex } from "@/lib/events/status";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { CheckCircle, MessageSquare } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function ReviewEventPage() {
  const params = useParams<{ id: string }>();
  const event = useQuery(api.events.getForReview, { id: params.id as Id<"events"> });
  const threads = useQuery(api.feedback.getThreadsByEvent, {
    eventId: params.id as Id<"events">,
  }) as FunctionReturnType<typeof api.feedback.getThreadsByEvent> | undefined;
  const threadsByField = useMemo(() => {
    if (!threads) return {} as Record<string, any>;
    const byField: Record<string, any> = {};
    for (const t of threads as any[]) {
      const last = t.lastActivity ?? t.comments?.[t.comments.length - 1]?.createdAt ?? t.createdAt;
      const cur = byField[t.fieldPath];
      if (!cur || last > (cur._last || 0)) byField[t.fieldPath] = { ...t, _last: last };
    }
    return byField;
  }, [threads]);

  const requestChanges = useMutation(api.events.requestChanges);
  const approveEvent = useMutation(api.events.approve);
  const publishEvent = useMutation(api.events.publish);
  const updateLumaUrl = useMutation(api.events.updateLumaUrl);
  const adminSetStatus = useMutation(api.events.adminSetStatus);
  const createThread = useMutation(api.feedback.createThread);

  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [lumaInput, setLumaInput] = useState("");
  const [savingLuma, setSavingLuma] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [forcedStatus, setForcedStatus] = useState<string>("");

  const selectedThread = threads?.find((t: any) => t.fieldPath === selectedField);
  const selectedTitle = FIELD_GROUPS.flatMap((g) => g.fields).find(
    (f) => f.key === selectedField
  )?.label;

  async function handleSubmitFeedback(
    message: string,
    reason?: string,
    fieldsWithIssues?: string[]
  ) {
    if (!event?._id || !selectedField) return;
    if (selectedField === "_request_changes") {
      await requestChanges({ id: event._id, message, reason, fieldsWithIssues } as any);
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
                    Submitted by {event?.host?.name}{" "}
                    {event?.host?.orgName ? `• ${event.host.orgName}` : ""}
                  </CardDescription>
                </div>
                <Badge variant="outline">{event?.status}</Badge>
              </div>
              <div className="mt-3">
                <Steps
                  steps={[
                    { label: "Draft" },
                    { label: "Under Review" },
                    { label: "Changes Requested" },
                    { label: "Approved" },
                    { label: "Published" },
                  ]}
                  current={statusToStepIndex((event?.status as any) || "draft")}
                />
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
                    thread={threadsByField[field.key]}
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
              {/* Luma URL (admin editable at any time) */}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Lu.ma URL</div>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://lu.ma/..."
                    value={lumaInput ?? (event?.lumaUrl || "")}
                    onChange={(e) => setLumaInput(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        setSavingLuma(true);
                        await updateLumaUrl({
                          id: event._id,
                          lumaUrl: lumaInput || event.lumaUrl || "",
                        });
                      } finally {
                        setSavingLuma(false);
                      }
                    }}
                  >
                    {savingLuma ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>

              {/* Force status (admin only) */}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Set Status (Admin)</div>
                <div className="flex gap-2 items-center">
                  <Select
                    value={forcedStatus || (event?.status as string)}
                    onValueChange={setForcedStatus}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="changes_requested">Changes Requested</SelectItem>
                      <SelectItem value="resubmitted">Resubmitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      if (!forcedStatus) return;
                      await adminSetStatus({ id: event._id, status: forcedStatus as any });
                    }}
                  >
                    Update
                  </Button>
                </div>
              </div>

              <Button
                className="w-full"
                variant="default"
                onClick={() => approveEvent({ id: event._id })}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Event
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setSelectedField("_request_changes")}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Request Changes
              </Button>

              <Button
                className="w-full"
                variant="secondary"
                disabled={publishing || event.status !== "approved"}
                onClick={async () => {
                  try {
                    setPublishing(true);
                    await publishEvent({ id: event._id });
                  } finally {
                    setPublishing(false);
                  }
                }}
              >
                {publishing ? "Publishing..." : "Publish"}
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
        eventId={event._id}
        fieldKey={selectedField}
        title={selectedTitle}
        thread={selectedThread}
        availableFields={FIELD_GROUPS.flatMap((g) => g.fields)}
        onSubmit={handleSubmitFeedback}
      />
    </PageContainer>
  );
}
