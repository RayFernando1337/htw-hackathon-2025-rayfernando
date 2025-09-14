"use client";

import { SectionCards } from "@/app/dashboard/section-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page-container";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function Page() {
  const { user } = useUser();
  const stats = useQuery(api.events.getEventStats);
  const recentEvents = useQuery(api.events.getMyEvents);

  return (
    <div className="space-y-8">
      <PageContainer>
        <PageHeader
          title={`Welcome back, ${user?.firstName || "Host"}!`}
          subtitle="Manage your HTW events and track submission status"
          right={
            <Link href="/dashboard/events/new">
              <Button size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Create New Event
              </Button>
            </Link>
          }
        />
      </PageContainer>

      {/* Stats Overview */}
      <SectionCards stats={stats} />

      {/* Feature Highlights */}
      <PageContainer>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Event Submission */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-16 -mt-16" />
            <CardHeader>
              <FileText className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Event Submission</CardTitle>
              <CardDescription>Multi-step form with auto-save and validation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Smart form with progress tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Auto-save functionality</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Field validation & help text</span>
                </div>
              </div>
              <Link href="/dashboard/events/new">
                <Button variant="outline" className="w-full mt-4" size="sm">
                  Submit Event <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Event Management */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -mr-16 -mt-16" />
            <CardHeader>
              <CalendarDays className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle>Event Management</CardTitle>
              <CardDescription>Track and manage all your events in one place</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Real-time status tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Draft & submission states</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Event details & editing</span>
                </div>
              </div>
              <Link href="/dashboard/events">
                <Button variant="outline" className="w-full mt-4" size="sm">
                  View Events <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Review Workflow */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full -mr-16 -mt-16" />
            <CardHeader>
              <Users className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle>Review Workflow</CardTitle>
              <CardDescription>Streamlined approval process with feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Submit → Review → Approve</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Field-level feedback</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span>Admin panel (coming soon)</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4" size="sm" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>

      {/* Recent Events */}
      {recentEvents && recentEvents.length > 0 && (
        <PageContainer>
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>Your latest event submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEvents.slice(0, 5).map((event) => (
                  <div
                    key={event._id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{event.title}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{event.eventDate || "Date TBD"}</span>
                        <span>{event.venue || "Venue TBD"}</span>
                        <span>{event.capacity} attendees</span>
                      </div>
                    </div>
                    <Badge
                      variant={
                        event.status === "published"
                          ? "default"
                          : event.status === "approved"
                            ? "secondary"
                            : event.status === "submitted" || event.status === "resubmitted"
                              ? "outline"
                              : "secondary"
                      }
                    >
                      {event.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
              {recentEvents.length > 5 && (
                <Link href="/dashboard/events">
                  <Button variant="outline" className="w-full mt-4">
                    View All Events ({recentEvents.length})
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </PageContainer>
      )}

      {/* MVP Status Card */}
      <PageContainer>
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>HTW Event Platform MVP</CardTitle>
            </div>
            <CardDescription>Phase 1: Host Event Submission - Feature Complete</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Completed Features
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• User authentication with Clerk</li>
                  <li>• Event submission workflow</li>
                  <li>• Multi-step form with validation</li>
                  <li>• Auto-save functionality</li>
                  <li>• Event management dashboard</li>
                  <li>• Real-time data sync with Convex</li>
                  <li>• Status tracking system</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  Next Phase
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Admin review interface</li>
                  <li>• Field-level feedback system</li>
                  <li>• Lu.ma calendar integration</li>
                  <li>• Event checklist automation</li>
                  <li>• Public event discovery page</li>
                  <li>• Email notifications</li>
                  <li>• Analytics dashboard</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  );
}
