"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { AlertCircle, Clock, MapPin, User } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface VenueConflictWarningProps {
  eventDate: string;
  venue: string;
  excludeId?: Id<"events">;
  className?: string;
}

interface VenueConflictData {
  id: Id<"events">;
  title: string;
  eventDate: string;
  venue: string;
  hostName: string;
  status: "submitted" | "resubmitted" | "approved" | "published";
  timeDifferenceHours: number;
  isDirectConflict: boolean;
}

const statusConfig = {
  submitted: { label: "Under Review", color: "bg-blue-100 text-blue-800" },
  resubmitted: { label: "Resubmitted", color: "bg-blue-100 text-blue-800" },
  approved: { label: "Approved", color: "bg-green-100 text-green-800" },
  published: { label: "Published", color: "bg-purple-100 text-purple-800" },
};

function VenueConflictItem({ conflict }: { conflict: VenueConflictData }) {
  const statusInfo = statusConfig[conflict.status];
  const isDirectConflict = conflict.isDirectConflict;

  const conflictColor = isDirectConflict
    ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
    : "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950";

  return (
    <div className={cn("rounded-lg border p-4", conflictColor)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <AlertCircle
              className={cn(
                "h-4 w-4 shrink-0",
                isDirectConflict
                  ? "text-red-600 dark:text-red-400"
                  : "text-yellow-600 dark:text-yellow-400"
              )}
            />
            <h4 className="font-medium text-sm truncate">{conflict.title}</h4>
            <Badge variant="outline" className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
            {isDirectConflict && (
              <Badge variant="destructive" className="text-xs">
                Direct Conflict
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {format(new Date(conflict.eventDate), "MMM d, h:mm a")}
                {conflict.timeDifferenceHours < 1
                  ? " (same time!)"
                  : ` (${conflict.timeDifferenceHours}h apart)`}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate font-medium">{conflict.venue}</span>
            </div>

            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate">Host: {conflict.hostName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VenueConflictWarning({
  eventDate,
  venue,
  excludeId,
  className,
}: VenueConflictWarningProps) {
  const conflicts = useQuery(api.events.detectVenueConflicts, {
    eventDate: eventDate || "",
    venue: venue || "",
    excludeId,
  });

  // Don't show anything if no date/venue or no conflicts
  if (!eventDate || !venue || !conflicts || conflicts.length === 0) {
    return null;
  }

  // Group conflicts by severity
  const directConflicts = conflicts.filter((c) => c.isDirectConflict);
  const nearbyConflicts = conflicts.filter((c) => !c.isDirectConflict);

  const hasDirectConflicts = directConflicts.length > 0;
  const hasNearbyConflicts = nearbyConflicts.length > 0;

  // Determine overall alert level
  const alertLevel = hasDirectConflicts ? "destructive" : "default";
  const AlertIconComponent = AlertCircle;
  const alertIconColor = hasDirectConflicts
    ? "text-red-600 dark:text-red-400"
    : "text-yellow-600 dark:text-yellow-400";

  return (
    <div className={cn("space-y-4", className)}>
      <Alert
        variant={alertLevel}
        className={cn(
          hasDirectConflicts && "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
          !hasDirectConflicts &&
            "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950"
        )}
      >
        <AlertIconComponent className={cn("h-4 w-4", alertIconColor)} />
        <AlertTitle>
          {hasDirectConflicts ? "⚠️ Venue Double-Booking Detected" : "Venue Scheduling Notice"}
        </AlertTitle>
        <AlertDescription>
          {conflicts.length} event{conflicts.length > 1 ? "s" : ""} found at the same venue
          {hasDirectConflicts
            ? ". This is a critical conflict that needs immediate resolution."
            : " within a 3-hour window. Consider setup/cleanup time."}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Venue Conflicts</CardTitle>
          <CardDescription>
            Events at "{venue}" within 3 hours of your proposed time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Show direct conflicts first (most critical) */}
            {directConflicts.map((conflict) => (
              <VenueConflictItem key={conflict.id} conflict={conflict} />
            ))}

            {/* Then nearby conflicts */}
            {nearbyConflicts.map((conflict) => (
              <VenueConflictItem key={conflict.id} conflict={conflict} />
            ))}
          </div>

          {conflicts.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Admin Note:</strong>
                {hasDirectConflicts
                  ? " Direct conflicts require immediate attention - contact the hosts to resolve scheduling."
                  : " Allow 1-2 hours between events at the same venue for setup and cleanup."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default VenueConflictWarning;

// Keep the old name for backward compatibility
export const CollisionWarning = VenueConflictWarning;
