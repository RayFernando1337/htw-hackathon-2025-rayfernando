"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export interface ReviewFieldProps {
  field: { key: string; label: string; required?: boolean };
  value: any;
  thread?: any;
  onFeedback: () => void;
}

export function ReviewField({ field, value, thread, onFeedback }: ReviewFieldProps) {
  const hasFeedback = !!thread && thread.status === "open";

  return (
    <div className={`p-3 rounded border ${hasFeedback ? "bg-yellow-50 border-yellow-200" : "border-transparent"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{field.label}</span>
            {field.required ? <Badge variant="secondary">Required</Badge> : null}
            {hasFeedback ? (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">Feedback</Badge>
            ) : null}
          </div>
          <div className="text-sm text-muted-foreground mt-1 break-words">
            {renderValue(value)}
          </div>
        </div>
        <div className="shrink-0">
          <Button size="sm" variant={hasFeedback ? "outline" : "secondary"} onClick={onFeedback}>
            <MessageSquare className="h-4 w-4 mr-2" />
            {hasFeedback ? "Update Feedback" : "Add Feedback"}
          </Button>
        </div>
      </div>
      {hasFeedback && thread?.reason ? (
        <div className="text-xs text-yellow-800 mt-2">Reason: {thread.reason}</div>
      ) : null}
      {hasFeedback && thread?.comments?.length ? (
        <div className="mt-2 space-y-1">
          {thread.comments.slice(-2).map((c: any) => (
            <div key={c._id} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{c.author?.name || "User"}:</span> {c.message}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function renderValue(value: any) {
  if (value === undefined || value === null || value === "") return <em>Empty</em>;
  if (Array.isArray(value)) return value.length ? value.join(", ") : <em>Empty</em>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
