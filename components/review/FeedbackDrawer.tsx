"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
  fieldKey: string | null;
  title?: string;
  thread?: any;
  onSubmit: (message: string, reason?: string) => void;
}

export function FeedbackDrawer({ open, onClose, fieldKey, title, thread, onSubmit }: FeedbackDrawerProps) {
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setMessage("");
      setReason(undefined);
    }
  }, [open]);

  const isRequestChanges = fieldKey === "_request_changes";

  return (
    <Sheet open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <SheetContent side="right" className="w-full max-w-[100vw] sm:w-[600px] sm:max-w-[600px] p-0">
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
                    onClick={() => setReason(key)}
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
              onChange={(e) => setMessage(e.target.value)}
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
            <Button onClick={() => onSubmit(message, reason)} disabled={!message.trim()}>
              {isRequestChanges ? "Send Request" : "Send Feedback"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
