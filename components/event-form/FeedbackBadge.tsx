"use client";

import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";

export default function FeedbackBadge({ fieldKey }: { fieldKey: string }) {
  const params = useParams();
  const eventId = (params as any)?.id as string | undefined;
  const threads = useQuery(
    api.feedback.getThreadsByEvent,
    eventId ? ({ eventId } as any) : "skip"
  ) as any;

  if (!eventId || threads === undefined) return null;
  const thread = threads?.find((t: any) => t.fieldPath === fieldKey && t.status === "open");
  if (!thread) return null;
  return (
    <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">Feedback</Badge>
  );
}
