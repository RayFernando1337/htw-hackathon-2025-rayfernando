# Hooks Directory Guidelines

## Autosave Form Drafts
- Use `useFormDraft` for any multi-step or long forms in admin or dashboard to autosave form values for the current user.
- Drafts are stored in Convex `formDrafts` by `(userId, key)`.

### Usage
```ts
import { useFormDraft } from "@/hooks/useFormDraft";

const draftKey = `event-edit:${eventId}`; // any unique string per form instance
const watched = form.watch();
const { status, restore, clear } = useFormDraft({ key: draftKey, data: watched, enabled: isEditing });

// Optionally merge restore into your form on edit start.
```

### Status Indicator
Use `AutoSaveIndicator` from `components/event-form/field-with-help.tsx` to show `idle|saving|saved|error`.

### When to clear
- After final submit or explicit save, call `clear()` to remove the draft.

## Feedback Drafts
- Field-level feedback drafts are persisted in `feedbackDrafts` and are automatically saved and restored by `FeedbackDrawer`.
- Do not implement separate local storage for feedback.
