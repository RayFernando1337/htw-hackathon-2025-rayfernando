# CLAUDE.md - App Directory (Next.js Frontend)

This file provides guidance to Claude Code when working with Next.js app router and React components.

## Convex React Hooks

### Required Provider
All components must be wrapped with `ConvexProviderWithClerk` (already configured in root layout).

### Reading Data (Queries)
```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// In component
const data = useQuery(api.module.functionName, { arg: value });
// data is undefined during initial load
if (data === undefined) return <Loading />;
```

### Writing Data (Mutations)
```typescript
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// In component
const createItem = useMutation(api.module.create);

// In event handler
const handleSubmit = async () => {
  try {
    await createItem({ name: "value" });
    toast.success("Created!");
  } catch (error) {
    toast.error("Failed to create");
  }
};
```

### Real-time Updates
- Components automatically re-render when query data changes
- No polling or refresh needed - Convex handles real-time sync
- Avoid manual refetch patterns

## Authentication Patterns

### Check Auth Status
```typescript
import { useAuth } from "@clerk/nextjs";

const { isLoaded, isSignedIn, userId } = useAuth();
if (!isLoaded) return <Loading />;
if (!isSignedIn) return <SignInPrompt />;
```

### Get Current User
```typescript
import { useUser } from "@clerk/nextjs";

const { user } = useUser();
// user?.firstName, user?.emailAddresses, etc.
```

### Protected Routes
Routes under `/dashboard` are automatically protected by middleware.
No additional auth checks needed in components.

## UI Component Patterns

### Using shadcn/ui Components
```typescript
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Components are in @/components/ui/
```

### Form Handling with React Hook Form
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1)
});

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { title: "" }
});
```

## Routing Patterns

### File Structure
- `(group)/` - Route groups (don't affect URL)
- `page.tsx` - Page component
- `layout.tsx` - Shared layout
- `loading.tsx` - Loading UI
- `error.tsx` - Error boundary

### Dynamic Routes
```typescript
// app/events/[id]/page.tsx
export default function EventPage({
  params
}: {
  params: { id: string }
}) {
  const event = useQuery(api.events.get, {
    id: params.id as Id<"events">
  });
}
```

## State Management

### Server State (Convex)
- Use `useQuery` for reading
- Use `useMutation` for writing
- Data syncs automatically across all clients

### Local State
- Use `useState` for component-local state
- Use React Context for cross-component state
- Avoid Redux/Zustand - Convex handles most state needs

## Error Handling

### Query Errors
```typescript
const data = useQuery(api.module.fn, args);
// Queries throw to error boundary if they fail
// Wrap in ErrorBoundary component for custom handling
```

### Mutation Errors
```typescript
const mutate = useMutation(api.module.fn);

try {
  await mutate(args);
} catch (error) {
  // Handle error - show toast, log, etc.
  toast.error(error.message);
}
```

## Performance Patterns

### Suspense Boundaries
```typescript
import { Suspense } from "react";

<Suspense fallback={<Loading />}>
  <DataComponent />
</Suspense>
```

### Optimistic Updates
Convex mutations are fast enough that optimistic updates are rarely needed.
If required, update local state immediately then sync with mutation result.

### Image Optimization
```typescript
import Image from "next/image";

<Image
  src="/image.jpg"
  alt="Description"
  width={400}
  height={300}
  priority // for above-fold images
/>
```

## TypeScript Patterns

### Convex Types
```typescript
import { Doc, Id } from "@/convex/_generated/dataModel";

type User = Doc<"users">;
type UserId = Id<"users">;
```

### API Types
```typescript
import { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

type EventData = FunctionReturnType<typeof api.events.list>;
```

## DO NOT
- Call Convex actions directly from components - use mutations to schedule them
- Use `fetch()` for Convex data - use hooks instead
- Add manual refresh buttons - data syncs automatically
- Implement polling - Convex provides real-time updates
- Store sensitive data in component state - keep in Convex