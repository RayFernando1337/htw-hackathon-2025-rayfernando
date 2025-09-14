"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, ArrowRight } from "lucide-react";

export default function ReviewQueuePage() {
  const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "resubmitted">("submitted");
  const events = useQuery(api.events.getReviewQueue, {
    status: statusFilter === "all" ? ["all"] : [statusFilter],
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Review Queue</h1>
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v: any) => setStatusFilter(v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pending</SelectItem>
              <SelectItem value="submitted">New Submissions</SelectItem>
              <SelectItem value="resubmitted">Resubmitted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {events?.map((event: any) => (
          <Card key={event._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{event.title || "Untitled Event"}</CardTitle>
                  <CardDescription>
                    Submitted by {event.host?.name || "Host"}
                    {event.submittedAt ? (
                      <> • {formatDistanceToNow(event.submittedAt)} ago</>
                    ) : null}
                  </CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  {event.hasOpenThreads && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                      <MessageSquare className="mr-1 h-3 w-3" />
                      {event.openThreadCount} feedback
                    </Badge>
                  )}
                  <Badge variant="outline">{event.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {event.shortDescription ? (
                  <p className="text-sm">{event.shortDescription}</p>
                ) : null}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {event.eventDate ? <span>📅 {format(new Date(event.eventDate), "PPP")}</span> : null}
                  {event.venue ? <span>📍 {event.venue}</span> : null}
                  {event.capacity ? <span>👥 {event.capacity} people</span> : null}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link href={`/dashboard/review/${event._id}`}>
                  Review Event
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
