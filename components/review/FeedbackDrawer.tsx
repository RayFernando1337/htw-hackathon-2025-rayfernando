"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const QUICK_REASONS: Record<string, string> = {
  needs_clarity: "Needs more clarity",
  incorrect_format: "Incorrect format",
  missing_info: "Missing information",
  date_conflict: "Date conflict",
  venue_issue: "Venue issue",
  capacity_concern: "Capacity concern",
};

export interface FeedbackDrawerProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  fieldKey: string | null;
  title?: string;
  thread?: any;
  onSubmit: (message: string, reason?: string) => void;
}

export function FeedbackDrawer({ open, onClose, eventId, fieldKey, title, thread, onSubmit }: FeedbackDrawerProps) {
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState<string | undefined>(undefined);

  // Load existing draft when opening
  const draft = useQuery(
    api.feedbackDrafts.get,
    open && fieldKey ? ({ eventId: eventId as any, fieldPath: fieldKey } as any) : "skip"
  ) as any;
  const upsertDraft = useMutation(api.feedbackDrafts.upsert);
  const clearDraft = useMutation(api.feedbackDrafts.clear);

  useEffect(() => {
    if (open) {
      if (draft) {
        setMessage(draft.message || "");
        setReason(draft.reason);
      } else {
        setMessage("");
        setReason(undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft?._id]);

  const isRequestChanges = fieldKey === "_request_changes";

  return (
    <Sheet open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <SheetContent
        side="right"
        className="w-full max-w-[100vw] sm:w-[600px] sm:max-w-[600px] p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-4 sm:px-6 pt-4">
          <SheetTitle>{isRequestChanges ? "Request Changes" : `Feedback: ${title}`}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6 px-4 sm:px-6 pb-6 overflow-y-auto">
          {!isRequestChanges && (
            <div>
              <Label>Quick Reasons</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(QUICK_REASONS).map(([key, label]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={reason === key ? "default" : "outline"}
                    onClick={() => {
                      setReason(key);
                      if (fieldKey) {
                        upsertDraft({ eventId: eventId as any, fieldPath: fieldKey, reason: key, message: message || "" } as any);
                      }
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>{isRequestChanges ? "Overall Message" : "Feedback Message"}</Label>
            <Textarea
              className="mt-2"
              placeholder={isRequestChanges ? "Share an overall summary of requested changes..." : "Provide specific feedback for the host..."}
              value={message}
              onChange={(e) => {
                const val = e.target.value;
                setMessage(val);
                if (fieldKey) {
                  upsertDraft({ eventId: eventId as any, fieldPath: fieldKey, reason, message: val } as any);
                }
              }}
              rows={6}
            />
          </div>

          {thread?.comments?.length ? (
            <div>
              <Label>Previous Feedback</Label>
              <div className="mt-2 max-h-[240px] overflow-y-auto rounded border p-3">
                {thread.comments.map((comment: any) => (
                  <div key={comment._id} className="mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{comment.author?.name || "User"}</span>
                      <span className="text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{comment.message}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await onSubmit(message, reason);
                if (!isRequestChanges && fieldKey) {
                  await clearDraft({ eventId: eventId as any, fieldPath: fieldKey } as any);
                }
              }}
              disabled={!message.trim()}
            >
              {isRequestChanges ? "Send Request" : "Send Feedback"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
