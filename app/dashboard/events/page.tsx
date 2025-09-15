"use client";

import { PageContainer, PageHeader } from "@/components/ui/page-container";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { Calendar, MapPin, Plus, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { FunctionReturnType } from "convex/server";

// Type for individual event from the getMyEvents query
type Event = FunctionReturnType<typeof api.events.getMyEvents>[0];
type EventStatus = Event["status"];

const statusConfig: Record<EventStatus, { label: string; color: string; description: string }> = {
  draft: {
    label: "Draft",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    description: "Continue editing your event",
  },
  submitted: {
    label: "Under Review",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    description: "Being reviewed by HTW team",
  },
  changes_requested: {
    label: "Changes Requested",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    description: "Updates needed before approval",
  },
  resubmitted: {
    label: "Resubmitted",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    description: "Updated version under review",
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    description: "Ready for publishing",
  },
  published: {
    label: "Published",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    description: "Live and accepting registrations",
  },
};

// Type for individual event from the getMyEvents query
type _Event = Event; // keep name stable for downstream references

function EventCard({ event }: { event: Event }) {
  const config = statusConfig[event.status];
  const canEdit = event.status === "draft" || event.status === "changes_requested";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="line-clamp-2 break-words">{event.title}</CardTitle>
            <CardDescription className="mt-2">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1 min-w-0">
                  <Calendar className="h-4 w-4" />
                  {event.eventDate ? format(new Date(event.eventDate), "PPP") : "Date TBD"}
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <MapPin className="h-4 w-4" />
                  {event.venue || "Venue TBD"}
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <Users className="h-4 w-4" />
                  {event.capacity} people
                </div>
              </div>
            </CardDescription>
          </div>
          <Badge className={"self-start sm:self-auto " + config.color}>{config.label}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {event.shortDescription || "No description yet"}
        </p>

        {event.formats && event.formats.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {event.formats.map((format: string) => (
              <Badge key={format} variant="secondary" className="text-xs">
                {format}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">{config.description}</div>

        <div className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto" variant="outline" asChild>
            <Link href={`/dashboard/events/${event._id}`}>
              {canEdit ? "Continue Editing" : "View Details"}
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function EventsLoading() {
  return (
    <div className="grid gap-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="text-center py-10 sm:py-12">
      <CardContent>
        <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-muted-foreground" />
        </div>
        <CardTitle className="mb-2">No events yet</CardTitle>
        <CardDescription className="mb-4">
          Start by creating your first HTW event. We'll guide you through the process.
        </CardDescription>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/dashboard/events/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Event
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function MyEventsPage() {
  const events = useQuery(api.events.getMyEvents);
  const stats = useQuery(api.events.getEventStats);

  if (events === undefined || stats === undefined) {
    return <EventsLoading />;
  }

  return (
    <PageContainer className="space-y-6" maxWidth="full">
      <PageHeader
        title="My Events"
        subtitle="Manage your HTW event submissions and track their progress"
        right={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/events/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Link>
          </Button>
        }
      />

      {/* Stats Overview */}
      {stats && stats.totalEvents > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <div className="text-xs text-muted-foreground">Total Events</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.draftCount}</div>
              <div className="text-xs text-muted-foreground">Drafts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.submittedCount}</div>
              <div className="text-xs text-muted-foreground">In Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.approvedCount}</div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.publishedCount}</div>
              <div className="text-xs text-muted-foreground">Published</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
