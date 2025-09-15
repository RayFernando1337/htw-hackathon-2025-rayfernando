"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface AdminStatusControlsProps {
  eventId: Id<"events">;
  currentStatus: string;
  hasLumaUrl?: boolean;
  className?: string;
}

const statusOptions = [
  { value: "draft", label: "Draft", description: "Move back to draft for major edits" },
  { value: "submitted", label: "Submitted", description: "Mark as submitted for review" },
  {
    value: "changes_requested",
    label: "Changes Requested",
    description: "Request changes from host",
  },
  { value: "resubmitted", label: "Resubmitted", description: "Mark as resubmitted after changes" },
  { value: "approved", label: "Approved", description: "Approve for publishing" },
  { value: "published", label: "Published", description: "Publish to live calendar" },
];

export function AdminStatusControls({
  eventId,
  currentStatus,
  hasLumaUrl = false,
  className,
}: AdminStatusControlsProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  const changeEventStatus = useMutation(api.events.changeEventStatus);

  const handleStatusChange = async () => {
    if (!selectedStatus || selectedStatus === currentStatus) {
      toast.error("Please select a different status");
      return;
    }

    try {
      setIsChanging(true);
      await changeEventStatus({
        id: eventId,
        newStatus: selectedStatus as any,
        reason: reason.trim() || undefined,
      });

      toast.success(
        `Event status changed to ${statusOptions.find((s) => s.value === selectedStatus)?.label}`
      );
      setSelectedStatus("");
      setReason("");
    } catch (error: any) {
      toast.error(error.message || "Failed to change event status");
    } finally {
      setIsChanging(false);
    }
  };

  // Filter out current status from options
  const availableOptions = statusOptions.filter((option) => option.value !== currentStatus);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Admin Status Controls</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current:</span>
          <Badge variant="outline">
            {statusOptions.find((s) => s.value === currentStatus)?.label || currentStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="status-select">Change Status To:</Label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select new status..." />
            </SelectTrigger>
            <SelectContent>
              {availableOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedStatus && (
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why are you changing the status? This will be logged and sent to the host."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        )}

        {/* Warning for publishing without Lu.ma URL */}
        {selectedStatus === "published" && !hasLumaUrl && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-950 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ This event doesn't have a Lu.ma URL yet. Consider asking the host to add one first.
            </p>
          </div>
        )}

        <Button
          onClick={handleStatusChange}
          disabled={!selectedStatus || selectedStatus === currentStatus || isChanging}
          className="w-full"
        >
          {isChanging ? "Updating..." : "Update Status"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Quick action buttons for common status changes
export function QuickAdminActions({
  eventId,
  currentStatus,
  hasLumaUrl = false,
  className,
}: AdminStatusControlsProps) {
  const changeEventStatus = useMutation(api.events.changeEventStatus);
  const [isChanging, setIsChanging] = useState<string | null>(null);

  const handleQuickChange = async (newStatus: string, reason: string) => {
    try {
      setIsChanging(newStatus);
      await changeEventStatus({
        id: eventId,
        newStatus: newStatus as any,
        reason,
      });

      toast.success(`Event ${reason.toLowerCase()}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update event status");
    } finally {
      setIsChanging(null);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {currentStatus !== "approved" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickChange("approved", "Approved by admin")}
          disabled={!!isChanging}
        >
          {isChanging === "approved" ? "..." : "Quick Approve"}
        </Button>
      )}

      {currentStatus === "approved" && hasLumaUrl && (
        <Button
          size="sm"
          variant="default"
          onClick={() => handleQuickChange("published", "Published by admin")}
          disabled={!!isChanging}
        >
          {isChanging === "published" ? "..." : "Publish Now"}
        </Button>
      )}

      {currentStatus !== "draft" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickChange("draft", "Moved back to draft by admin")}
          disabled={!!isChanging}
        >
          {isChanging === "draft" ? "..." : "Back to Draft"}
        </Button>
      )}
    </div>
  );
}
