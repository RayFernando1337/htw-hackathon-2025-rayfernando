# CLAUDE.md - Components Directory

This file provides guidance to Claude Code when working with React components and UI elements.

## Component Structure

### Naming Conventions
- Components: PascalCase (e.g., `EventCard.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `useEventData.ts`)
- Utils: camelCase (e.g., `formatters.ts`)

### File Organization
```
components/
├── ui/                 # shadcn/ui components (auto-generated)
├── features/           # Feature-specific components
│   ├── events/        # Event-related components
│   └── users/         # User-related components
├── shared/            # Shared components across features
└── providers/         # Context providers
```

## shadcn/ui Components

### Installation
```bash
# ALWAYS use bunx with --bun flag
bunx --bun shadcn@latest add button card dialog

# If fails, manually install dependencies
bun add @radix-ui/react-dialog
```

### Component Usage
```typescript
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
```

### Customization
- Modify variants in component files directly
- Use `cn()` utility for conditional classes
- Follow existing patterns in `components/ui/`

## Component Patterns

### Server vs Client Components
```typescript
// Client Component (default for components/)
"use client";

import { useState } from "react";

export function InteractiveComponent() {
  const [state, setState] = useState();
  // Has access to hooks, browser APIs
}
```

### Props with TypeScript
```typescript
interface EventCardProps {
  event: Doc<"events">;
  onEdit?: (id: Id<"events">) => void;
  className?: string;
}

export function EventCard({
  event,
  onEdit,
  className
}: EventCardProps) {
  // Implementation
}
```

### Composition Pattern
```typescript
// Parent component provides structure
export function Card({ children }: { children: React.ReactNode }) {
  return <div className="...">{children}</div>;
}

// Child components for flexibility
Card.Header = CardHeader;
Card.Content = CardContent;
```

## Styling Guidelines

### TailwindCSS v4
- Use Tailwind classes for styling
- Follow existing spacing/color patterns
- Responsive design: `sm:`, `md:`, `lg:` prefixes

### CSS Variables
```css
/* Defined in globals.css */
--background: theme color
--foreground: text color
--primary: brand color
```

### Dark Mode
```typescript
// Components should support both modes
<div className="bg-background text-foreground">
  {/* Automatically adapts to theme */}
</div>
```

## Data Fetching in Components

### With Convex Hooks
```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function EventList() {
  const events = useQuery(api.events.list);

  if (!events) return <Skeleton />;

  return (
    <div>
      {events.map(event => (
        <EventCard key={event._id} event={event} />
      ))}
    </div>
  );
}
```

### Loading States
```typescript
import { Skeleton } from "@/components/ui/skeleton";

// Show skeleton during loading
if (data === undefined) {
  return <Skeleton className="h-32 w-full" />;
}
```

## Form Components

### With React Hook Form + Zod
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export function EventForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Handle submission
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
```

## Accessibility

### ARIA Labels
```typescript
<Button
  aria-label="Delete event"
  onClick={handleDelete}
>
  <TrashIcon />
</Button>
```

### Keyboard Navigation
- Ensure all interactive elements are keyboard accessible
- Use proper semantic HTML
- Add focus styles

## Testing Patterns

### Component Testing
```typescript
// Use React Testing Library patterns
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

test("renders event card", () => {
  render(<EventCard event={mockEvent} />);
  expect(screen.getByText(mockEvent.title)).toBeInTheDocument();
});
```

## Performance Optimization

### Memoization
```typescript
import { memo, useMemo, useCallback } from "react";

// Memo for expensive components
export const ExpensiveList = memo(function ExpensiveList({ items }) {
  // Component only re-renders if items change
});

// useMemo for expensive calculations
const sortedItems = useMemo(
  () => items.sort((a, b) => a.date - b.date),
  [items]
);

// useCallback for stable function references
const handleClick = useCallback(
  (id: string) => {
    // Handle click
  },
  [dependency]
);
```

### Code Splitting
```typescript
import dynamic from "next/dynamic";

// Lazy load heavy components
const HeavyChart = dynamic(
  () => import("./HeavyChart"),
  {
    loading: () => <Skeleton />,
    ssr: false // Disable SSR if needed
  }
);
```

## DO NOT
- Import CSS files directly - use Tailwind classes
- Use inline styles - use Tailwind utilities
- Create wrapper divs unnecessarily - use fragments
- Fetch data in components without Convex hooks
- Store sensitive data in component state
- Use `any` type - always define proper types