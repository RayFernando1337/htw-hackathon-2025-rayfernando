import { FileText, Send, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SectionCardsProps {
  stats?: {
    totalEvents: number;
    draftCount: number;
    submittedCount: number;
    approvedCount: number;
    publishedCount: number;
  };
}

export function SectionCards({ stats }: SectionCardsProps) {
  const defaultStats = {
    totalEvents: 0,
    draftCount: 0,
    submittedCount: 0,
    approvedCount: 0,
    publishedCount: 0,
  };

  const data = stats || defaultStats;

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Total Events
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.totalEvents}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-xs">
              All time
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">
            Events created
          </div>
          <div className="text-muted-foreground">
            Across all statuses
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Draft Events
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.draftCount}
          </CardTitle>
          <CardAction>
            {data.draftCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                In progress
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">
            Events being prepared
          </div>
          <div className="text-muted-foreground">
            Not yet submitted
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Under Review
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.submittedCount}
          </CardTitle>
          <CardAction>
            {data.submittedCount > 0 && (
              <Badge variant="outline" className="text-xs">
                Pending
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">
            Awaiting approval
          </div>
          <div className="text-muted-foreground">
            Submitted for review
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Published
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.publishedCount + data.approvedCount}
          </CardTitle>
          <CardAction>
            {(data.publishedCount + data.approvedCount) > 0 && (
              <Badge className="text-xs">
                Live
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">
            Active events
          </div>
          <div className="text-muted-foreground">
            Approved & published
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
