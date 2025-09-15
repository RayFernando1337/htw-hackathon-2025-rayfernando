// Checklist templates for different event types
export interface ChecklistTask {
  id: string;
  task: string;
  daysBeforeEvent: number;
}

export interface ChecklistTemplate {
  name: string;
  sections: {
    planning: ChecklistTask[];
    marketing: ChecklistTask[];
    logistics: ChecklistTask[];
  };
}

export interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  section: string;
  dueDate: string;
}

export const CHECKLIST_TEMPLATES: Record<string, ChecklistTemplate> = {
  panel: {
    name: "Panel Discussion",
    sections: {
      planning: [
        { id: "p1", task: "Confirm 3-5 panelists", daysBeforeEvent: 30 },
        { id: "p2", task: "Prepare moderator questions", daysBeforeEvent: 14 },
        { id: "p3", task: "Send panelist prep materials", daysBeforeEvent: 7 },
      ],
      marketing: [
        { id: "m1", task: "Create event graphic with panelist photos", daysBeforeEvent: 21 },
        { id: "m2", task: "Write LinkedIn event post", daysBeforeEvent: 14 },
        { id: "m3", task: "Send reminder email to registrants", daysBeforeEvent: 2 },
      ],
      logistics: [
        { id: "l1", task: "Test A/V setup for panel format", daysBeforeEvent: 3 },
        { id: "l2", task: "Prepare name cards for panelists", daysBeforeEvent: 1 },
        { id: "l3", task: "Set up panel seating arrangement", daysBeforeEvent: 0 },
      ],
    },
  },
  mixer: {
    name: "Networking Mixer",
    sections: {
      planning: [
        { id: "p1", task: "Confirm catering order", daysBeforeEvent: 14 },
        { id: "p2", task: "Plan icebreaker activities", daysBeforeEvent: 7 },
        { id: "p3", task: "Create name tag template", daysBeforeEvent: 3 },
      ],
      marketing: [
        { id: "m1", task: "Create social media graphics", daysBeforeEvent: 21 },
        { id: "m2", task: "Post in relevant Slack/Discord channels", daysBeforeEvent: 10 },
        { id: "m3", task: "Final headcount for catering", daysBeforeEvent: 3 },
      ],
      logistics: [
        { id: "l1", task: "Set up registration table", daysBeforeEvent: 0 },
        { id: "l2", task: "Arrange furniture for mingling", daysBeforeEvent: 0 },
        { id: "l3", task: "Prepare music playlist", daysBeforeEvent: 1 },
      ],
    },
  },
  workshop: {
    name: "Workshop",
    sections: {
      planning: [
        { id: "p1", task: "Finalize workshop curriculum", daysBeforeEvent: 21 },
        { id: "p2", task: "Prepare workshop materials/handouts", daysBeforeEvent: 7 },
        { id: "p3", task: "Send pre-workshop survey", daysBeforeEvent: 5 },
      ],
      marketing: [
        { id: "m1", task: "Write detailed workshop description", daysBeforeEvent: 28 },
        { id: "m2", task: "Create promotional video/teaser", daysBeforeEvent: 14 },
        { id: "m3", task: "Send workshop prep email", daysBeforeEvent: 2 },
      ],
      logistics: [
        { id: "l1", task: "Set up workshop stations/materials", daysBeforeEvent: 0 },
        { id: "l2", task: "Test all required software/tools", daysBeforeEvent: 1 },
        { id: "l3", task: "Print attendance sheets", daysBeforeEvent: 1 },
      ],
    },
  },
  general: {
    name: "General Event",
    sections: {
      planning: [
        { id: "p1", task: "Finalize event agenda", daysBeforeEvent: 21 },
        { id: "p2", task: "Confirm all speakers/facilitators", daysBeforeEvent: 14 },
        { id: "p3", task: "Prepare event materials", daysBeforeEvent: 7 },
      ],
      marketing: [
        { id: "m1", task: "Create promotional materials", daysBeforeEvent: 21 },
        { id: "m2", task: "Share on social media", daysBeforeEvent: 14 },
        { id: "m3", task: "Send reminder notifications", daysBeforeEvent: 2 },
      ],
      logistics: [
        { id: "l1", task: "Prepare venue setup", daysBeforeEvent: 1 },
        { id: "l2", task: "Test audio/visual equipment", daysBeforeEvent: 1 },
        { id: "l3", task: "Prepare registration materials", daysBeforeEvent: 0 },
      ],
    },
  },
};

// Function to generate checklist based on event date and template
export function generateChecklist(template: string, eventDate: Date): ChecklistItem[] {
  const templateConfig = CHECKLIST_TEMPLATES[template];
  if (!templateConfig) {
    // Fallback to general template
    return generateChecklist("general", eventDate);
  }

  const checklist: ChecklistItem[] = [];

  Object.entries(templateConfig.sections).forEach(([section, tasks]) => {
    tasks.forEach((task) => {
      const dueDate = new Date(eventDate);
      dueDate.setDate(dueDate.getDate() - task.daysBeforeEvent);

      checklist.push({
        id: `${template}-${task.id}`,
        task: task.task,
        completed: false,
        section,
        dueDate: dueDate.toISOString(),
      });
    });
  });

  // Sort by due date (earliest first)
  return checklist.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

// Helper function to determine event template from formats
export function getEventTemplateFromFormats(formats: string[]): string {
  const formatStr = formats.join(" ").toLowerCase();

  if (formatStr.includes("panel") || formatStr.includes("discussion")) {
    return "panel";
  } else if (formatStr.includes("mixer") || formatStr.includes("networking")) {
    return "mixer";
  } else if (formatStr.includes("workshop") || formatStr.includes("training")) {
    return "workshop";
  }

  return "general";
}

// Lu.ma URL validation helper
export function isValidLumaUrl(url: string): boolean {
  if (!url) return false;
  return url.includes("lu.ma/") && (url.startsWith("http://") || url.startsWith("https://"));
}
