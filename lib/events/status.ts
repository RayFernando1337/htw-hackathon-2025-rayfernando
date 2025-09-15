export type EventStatus =
  | "draft"
  | "submitted"
  | "changes_requested"
  | "resubmitted"
  | "approved"
  | "published";

export const EVENT_STATUS_ORDER: EventStatus[] = [
  "draft",
  "submitted",
  "resubmitted",
  "changes_requested",
  "approved",
  "published",
];

export function statusToStepIndex(status: EventStatus): number {
  const map: Record<EventStatus, number> = {
    draft: 0,
    submitted: 1,
    resubmitted: 1,
    changes_requested: 2,
    approved: 3,
    published: 4,
  };
  return map[status] ?? 0;
}

export const STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Draft",
  submitted: "Under Review",
  resubmitted: "Under Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  published: "Published",
};

