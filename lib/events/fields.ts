export interface ReviewFieldConfig {
  key: string;
  label: string;
  required?: boolean;
}

export interface ReviewFieldGroup {
  title: string;
  fields: ReviewFieldConfig[];
}

export const FIELD_GROUPS: ReviewFieldGroup[] = [
  {
    title: "Basic Information",
    fields: [
      { key: "title", label: "Event Title", required: true },
      { key: "shortDescription", label: "Description", required: true },
    ],
  },
  {
    title: "Logistics",
    fields: [
      { key: "eventDate", label: "Date & Time", required: true },
      { key: "venue", label: "Venue", required: true },
      { key: "capacity", label: "Capacity", required: true },
    ],
  },
  {
    title: "Audience & Format",
    fields: [
      { key: "formats", label: "Event Formats", required: true },
      { key: "targetAudience", label: "Target Audience", required: true },
      { key: "isPublic", label: "Public Event", required: true },
    ],
  },
];

