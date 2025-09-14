"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function AuditTimeline({ eventId }: { eventId: string }) {
  const items = useQuery(api.feedback.getAuditByEvent, { eventId: eventId as any });

  if (items === undefined) return <div className="text-sm text-muted-foreground">Loading...</div>;
  if (!items?.length) return <div className="text-sm text-muted-foreground">No activity yet.</div>;

  return (
    <div className="space-y-3">
      {items.map((it: any) => (
        <div key={it._id} className="text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{it.actor?.name || "User"}</span>
            <span className="text-muted-foreground">{describeAction(it)}</span>
            <span className="ml-auto text-[12px] text-muted-foreground">{new Date(it.timestamp).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function describeAction(it: any) {
  switch (it.action) {
    case "feedback_added":
      return `added feedback${it.metadata?.fieldPath ? ` on ${it.metadata.fieldPath}` : ""}`;
    case "feedback_commented":
      return `commented${it.metadata?.fieldPath ? ` on ${it.metadata.fieldPath}` : ""}`;
    case "feedback_resolved":
      return `resolved feedback${it.metadata?.fieldPath ? ` on ${it.metadata.fieldPath}` : ""}`;
    case "status_change":
      return `changed status from ${it.fromValue} to ${it.toValue}`;
    default:
      return it.action;
  }
}
