"use client";

import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle, ExternalLink, Globe, Link as LinkIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader } from "@/components/ui/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { isValidLumaUrl } from "@/lib/checklist-templates";

import { EventChecklist } from "./event-checklist";

function PublishEventLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="flex-1">
          <Skeleton className="h-8 w-1/2 mb-2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}

function NotAuthorized() {
  const router = useRouter();

  return (
    <PageContainer className="text-center py-12">
      <h1 className="text-2xl font-bold mb-2">Access Not Available</h1>
      <p className="text-muted-foreground mb-4">
        This page is only available for approved events. Please check that your event has been
        approved first.
      </p>
      <Button onClick={() => router.push("/dashboard/events")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to My Events
      </Button>
    </PageContainer>
  );
}

export default function PublishEventPage() {
  const params = useParams();
  const router = useRouter();
  const [lumaUrl, setLumaUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eventId = params.id as Id<"events">;
  const event = useQuery(api.events.getEventById, { id: eventId });
  const updateLumaUrl = useMutation(api.events.updateLumaUrl);

  if (event === undefined) {
    return <PublishEventLoading />;
  }

  if (event === null || event.status !== "approved") {
    return <NotAuthorized />;
  }

  const handleSaveLumaUrl = async () => {
    if (!lumaUrl.trim()) {
      toast.error("Please enter a Lu.ma URL");
      return;
    }

    if (!isValidLumaUrl(lumaUrl)) {
      toast.error("Please enter a valid Lu.ma URL (e.g., https://lu.ma/your-event)");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateLumaUrl({
        id: event._id,
        lumaUrl: lumaUrl.trim(),
      });
      toast.success("Lu.ma URL saved successfully!");
      setLumaUrl(""); // Clear the input after successful save
    } catch (error: any) {
      toast.error(error.message || "Failed to save Lu.ma URL");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer className="space-y-6" maxWidth="4xl">
      {/* Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold">{event.title}</h1>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              <CheckCircle className="w-3 h-3 mr-1" />
              Approved
            </Badge>
          </div>
        }
        subtitle={`Approved ${format(new Date(event.approvedAt || Date.now()), "PPP")}`}
        right={
          <Button variant="outline" onClick={() => router.push(`/dashboard/events/${eventId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Event
          </Button>
        }
      />

      {/* Congratulations Alert */}
      <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-800 dark:text-green-200">
          Congratulations! Your event has been approved!
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          Your event "{event.title}" was approved on{" "}
          {format(new Date(event.approvedAt || Date.now()), "PPP")}. Now you can create your Lu.ma
          event and add the URL here to complete the publishing process.
        </AlertDescription>
      </Alert>

      {/* Lu.ma URL Section */}
      <Card>
        <CardHeader>
          <CardTitle>Add Lu.ma Event URL</CardTitle>
          <CardDescription>
            Create your event on Lu.ma and add the URL here. This will allow people to register and
            view details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {event.lumaUrl ? (
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <LinkIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-800 dark:text-blue-200">Lu.ma URL Set</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                Your event is linked to:{" "}
                <a
                  href={event.lumaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-400 font-medium"
                >
                  {event.lumaUrl}
                </a>
                <div className="mt-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={event.lumaUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Lu.ma Event
                    </a>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950 dark:border-blue-800">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Next Steps:
                </h4>
                <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                  <li>
                    Go to{" "}
                    <a
                      href="https://lu.ma"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      lu.ma
                    </a>{" "}
                    and create your event
                  </li>
                  <li>Copy the event URL (e.g., https://lu.ma/your-event)</li>
                  <li>Paste it in the field below and save</li>
                  <li>Your event will then be ready for final publication by the HTW team</li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label htmlFor="luma-url">Lu.ma Event URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="luma-url"
                    placeholder="https://lu.ma/your-event"
                    value={lumaUrl}
                    onChange={(e) => setLumaUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSaveLumaUrl}
                    disabled={!lumaUrl.trim() || !isValidLumaUrl(lumaUrl) || isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save URL"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter the public URL of your Lu.ma event page (must include "lu.ma/" in the URL)
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Checklist */}
      <EventChecklist eventId={eventId} />

      {/* Publishing Status */}
      <Card>
        <CardHeader>
          <CardTitle>Publishing Status</CardTitle>
        </CardHeader>
        <CardContent>
          {event.lumaUrl ? (
            <div className="text-center py-6">
              <Globe className="h-12 w-12 mx-auto text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready for Publication</h3>
              <p className="text-muted-foreground mb-4">
                Your event has a Lu.ma URL and is ready to be published. The HTW team will mark it
                as published once final checks are complete.
              </p>
              <p className="text-sm text-muted-foreground">
                You'll receive a notification when your event goes live on the HTW calendar.
              </p>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="h-12 w-12 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4 dark:bg-yellow-900">
                <LinkIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Lu.ma URL Required</h3>
              <p className="text-muted-foreground">
                Please add your Lu.ma event URL above to proceed with publishing.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
