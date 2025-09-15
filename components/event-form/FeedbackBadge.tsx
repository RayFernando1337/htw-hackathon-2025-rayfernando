"use client";

import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useParams } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";

export default function FeedbackBadge({ fieldKey }: { fieldKey: string }) {
  const params = useParams();
  const eventId = (params as any)?.id as Id<"events"> | undefined;
  const threads = useQuery(
    api.feedback.getThreadsByEvent,
    eventId ? ({ eventId }) : "skip"
  ) as FunctionReturnType<typeof api.feedback.getThreadsByEvent> | undefined;

  if (!eventId || threads === undefined) return null;
  const thread = threads?.find((t) => t.fieldPath === fieldKey && t.status === "open");
  if (!thread) return null;
  return (
    <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">Feedback</Badge>
  );
}
