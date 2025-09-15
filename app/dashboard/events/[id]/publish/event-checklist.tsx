"use client";

import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { AlertCircle, Clock } from "lucide-react";
import React, { useMemo } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  section: string;
  dueDate?: string;
}

interface EventChecklistProps {
  eventId: Id<"events">;
}

function ChecklistItemComponent({
  task,
  onToggle,
}: {
  task: ChecklistItem;
  onToggle: () => Promise<void>;
}) {
  const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() && !task.completed : false;

  const isDueSoon = task.dueDate
    ? new Date(task.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) && !task.completed
    : false;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border transition-colors",
        task.completed && "bg-gray-50 opacity-75 dark:bg-gray-950",
        isOverdue && "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
        !isOverdue &&
          isDueSoon &&
          !task.completed &&
          "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950"
      )}
    >
      <Checkbox checked={task.completed} onCheckedChange={onToggle} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            task.completed && "line-through text-muted-foreground"
          )}
        >
          {task.task}
        </p>
        {task.dueDate && (
          <div className="flex items-center gap-2 mt-1">
            {isOverdue ? (
              <AlertCircle className="h-3 w-3 text-red-600" />
            ) : isDueSoon ? (
              <Clock className="h-3 w-3 text-yellow-600" />
            ) : (
              <Clock className="h-3 w-3 text-muted-foreground" />
            )}
            <p
              className={cn(
                "text-xs",
                isOverdue && "text-red-600 font-medium",
                !isOverdue && isDueSoon && "text-yellow-600 font-medium",
                !isOverdue && !isDueSoon && "text-muted-foreground"
              )}
            >
              Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
              {isOverdue && " (Overdue)"}
              {!isOverdue && isDueSoon && " (Due Soon)"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getCompletionBadge(tasks?: ChecklistItem[]): React.ReactNode {
  if (!tasks || tasks.length === 0) return null;

  const completed = tasks.filter((t: ChecklistItem) => t.completed).length;
  const total = tasks.length;
  const percentage = Math.round((completed / total) * 100);

  if (completed === total) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 ml-2 text-xs">
        ✓
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="ml-2 text-xs">
      {completed}/{total}
    </Badge>
  );
}

export function EventChecklist({ eventId }: EventChecklistProps) {
  const event = useQuery(api.events.getEventById, { id: eventId });
  const updateChecklistItem = useMutation(api.events.updateChecklistItem);

  const groupedTasks = useMemo(() => {
    if (!event?.checklist) return {};

    return event.checklist.reduce(
      (acc: Record<string, ChecklistItem[]>, task: ChecklistItem) => {
        if (!acc[task.section]) acc[task.section] = [];
        acc[task.section].push(task);
        return acc;
      },
      {} as Record<string, ChecklistItem[]>
    );
  }, [event?.checklist]);

  const progress = useMemo(() => {
    if (!event?.checklist || event.checklist.length === 0) return 0;
    const completed = event.checklist.filter((t: ChecklistItem) => t.completed).length;
    return Math.round((completed / event.checklist.length) * 100);
  }, [event?.checklist]);

  const overdueTasks = useMemo(() => {
    if (!event?.checklist) return 0;
    return event.checklist.filter(
      (task: ChecklistItem) =>
        task.dueDate && new Date(task.dueDate) < new Date() && !task.completed
    ).length;
  }, [event?.checklist]);

  const dueSoonTasks = useMemo(() => {
    if (!event?.checklist) return 0;
    return event.checklist.filter(
      (task: ChecklistItem) =>
        task.dueDate &&
        new Date(task.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) &&
        !task.completed &&
        new Date(task.dueDate) >= new Date() // Not overdue
    ).length;
  }, [event?.checklist]);

  if (!event) return null;

  const handleToggle = async (taskId: string, completed: boolean) => {
    try {
      await updateChecklistItem({
        eventId,
        taskId,
        completed,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to update checklist item");
    }
  };

  const sections = Object.keys(groupedTasks);
  if (sections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No checklist available for this event.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <CardTitle>Event Checklist</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Complete these tasks to ensure your event runs smoothly
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <div className="flex items-center gap-2">
              <Progress value={progress} className="w-24" />
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <div className="flex gap-2 text-xs">
              {overdueTasks > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {overdueTasks} overdue
                </Badge>
              )}
              {dueSoonTasks > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                  {dueSoonTasks} due soon
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={sections[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {sections.map((section) => (
              <TabsTrigger key={section} value={section} className="capitalize">
                {section}
                {getCompletionBadge(groupedTasks[section])}
              </TabsTrigger>
            ))}
          </TabsList>

          {sections.map((section) => (
            <TabsContent key={section} value={section} className="mt-6">
              <div className="space-y-3">
                {groupedTasks[section]
                  ?.sort((a: ChecklistItem, b: ChecklistItem) => {
                    // Sort by due date, then by completion status
                    if (a.dueDate && b.dueDate) {
                      const aDate = new Date(a.dueDate);
                      const bDate = new Date(b.dueDate);
                      if (aDate.getTime() !== bDate.getTime()) {
                        return aDate.getTime() - bDate.getTime();
                      }
                    }
                    // Incomplete tasks first
                    if (a.completed !== b.completed) {
                      return a.completed ? 1 : -1;
                    }
                    return 0;
                  })
                  .map((task: ChecklistItem) => (
                    <ChecklistItemComponent
                      key={task.id}
                      task={task}
                      onToggle={() => handleToggle(task.id, !task.completed)}
                    />
                  ))}
              </div>

              {/* Section Summary */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {section.charAt(0).toUpperCase() + section.slice(1)} Progress
                  </span>
                  <span className="font-medium">
                    {groupedTasks[section]?.filter((t: ChecklistItem) => t.completed).length || 0} /{" "}
                    {groupedTasks[section]?.length || 0} completed
                  </span>
                </div>
                <Progress
                  value={
                    groupedTasks[section]?.length
                      ? Math.round(
                          (groupedTasks[section].filter((t: ChecklistItem) => t.completed).length /
                            groupedTasks[section].length) *
                            100
                        )
                      : 0
                  }
                  className="mt-2 h-2"
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
