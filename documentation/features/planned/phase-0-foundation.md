# Phase 0: Foundation & Role-Based Routing

**Timeline: 2-3 days** | **Complexity: Medium** | **Priority: Critical**

## Overview

Establish the foundational infrastructure for role-based access control, user profiles, and routing. This phase sets up the core authentication and authorization system that all other features depend on.

## Success Criteria

- [ ] User can sign up with Clerk authentication
- [ ] Role assignment works correctly (host vs admin)
- [ ] Onboarding flow captures required information
- [ ] Role-based navigation shows correct menu items
- [ ] Database schema migrations complete without errors

## Technical Implementation

### 0.1 Extend Convex Schema

```typescript
// convex/schema.ts - Add to existing schema
export default defineSchema({
  // Keep existing users table, extend it
  users: defineTable({
    name: v.string(),
    externalId: v.string(), // Clerk ID
    // NEW FIELDS
    role: v.union(v.literal("host"), v.literal("admin")),
    orgName: v.optional(v.string()),
    website: v.optional(v.string()),
    socials: v.optional(
      v.object({
        linkedin: v.optional(v.string()),
        x: v.optional(v.string()),
        instagram: v.optional(v.string()),
      })
    ),
    onboardingCompleted: v.boolean(),
  })
    .index("byExternalId", ["externalId"])
    .index("byRole", ["role"]),

  // Add userProfiles for extended profile data
  userProfiles: defineTable({
    userId: v.id("users"),
    bio: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    preferences: v.optional(
      v.object({
        emailNotifications: v.boolean(),
        smsNotifications: v.boolean(),
      })
    ),
  }).index("byUserId", ["userId"]),

  // Keep existing paymentAttempts
  paymentAttempts: defineTable(paymentAttemptSchemaValidator)
    .index("byPaymentId", ["payment_id"])
    .index("byUserId", ["userId"])
    .index("byPayerUserId", ["payer.user_id"]),
});
```

### 0.2 Update User Sync Webhook

```typescript
// convex/http.ts - Update user creation handler
const handleUserCreated = async (ctx: ActionCtx, data: any) => {
  // Determine role based on email domain or metadata
  const role = determineUserRole(data.email_addresses);

  await ctx.runMutation(internal.users.create, {
    name: `${data.first_name} ${data.last_name}`,
    externalId: data.id,
    role: role,
    onboardingCompleted: false,
  });
};

// convex/users.ts - Add role detection function
export const determineUserRole = (emailAddresses: any[]): "host" | "admin" => {
  const primaryEmail = emailAddresses.find((e) => e.primary)?.email_address;
  // Admin emails from environment or hardcoded list
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  return adminEmails.includes(primaryEmail) ? "admin" : "host";
};
```

### 0.3 Implement Role-Based Routing

```typescript
// app/dashboard/layout.tsx - Add role detection
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function DashboardLayout({ children }) {
  const { userId } = useAuth();
  const currentUser = useQuery(api.users.current);

  // Redirect based on role
  useEffect(() => {
    if (currentUser && !currentUser.onboardingCompleted) {
      redirect('/onboarding');
    }
  }, [currentUser]);

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" userRole={currentUser?.role} />
      <SidebarInset>
        <LoadingBar />
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### 0.4 Create Role-Specific Navigation

```typescript
// app/dashboard/app-sidebar.tsx - Conditional navigation
const hostNavItems = [
  { title: "My Events", href: "/dashboard/events", icon: Calendar },
  { title: "Create Event", href: "/dashboard/events/new", icon: Plus },
  { title: "Profile", href: "/dashboard/profile", icon: User },
];

const adminNavItems = [
  { title: "Review Queue", href: "/dashboard/review", icon: ClipboardCheck },
  { title: "All Events", href: "/dashboard/admin/events", icon: Calendar },
  { title: "Calendar View", href: "/dashboard/calendar", icon: CalendarDays },
  { title: "Reports", href: "/dashboard/reports", icon: BarChart },
];

export function AppSidebar({ userRole }: { userRole?: "host" | "admin" }) {
  const navItems = userRole === "admin" ? adminNavItems : hostNavItems;
  // Render navigation based on role
}
```

### 0.5 Onboarding Flow

```typescript
// app/onboarding/page.tsx
export default function OnboardingPage() {
  const updateProfile = useMutation(api.users.updateProfile);

  const form = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      orgName: "",
      website: "",
      linkedin: "",
    }
  });

  const onSubmit = async (data) => {
    await updateProfile({
      ...data,
      onboardingCompleted: true
    });
    redirect('/dashboard');
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Welcome! Let's set up your profile</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <FormField name="orgName" label="Organization Name" />
          <FormField name="website" label="Website" />
          <Button type="submit">Complete Setup</Button>
        </Form>
      </CardContent>
    </Card>
  );
}
```

## Verification Steps

### 1. Database Migration

```bash
bunx convex dev
# Verify schema updates in Convex dashboard
# Check indexes are created
```

### 2. User Creation Test

```bash
# Sign up with test accounts
# Host account: test-host@example.com
# Admin account: admin@htw.com (add to ADMIN_EMAILS env)
# Verify role assignment in Convex data browser
```

### 3. Navigation Test

- Login as host → see host navigation items
- Login as admin → see admin navigation items
- Verify menu items link to correct pages

### 4. Onboarding Flow

- New user signup → redirected to /onboarding
- Complete onboarding form
- Submit → redirected to /dashboard
- Logout/login → goes directly to dashboard

### 5. Role Persistence

- Create user with specific role
- Logout and login again
- Verify role and navigation remain correct

## Dependencies

- Clerk authentication (already installed)
- Convex backend (already installed)
- shadcn/ui components (already installed)
- React Hook Form + Zod for validation

## Risk Mitigation

- **Risk**: Incorrect role assignment
  - **Mitigation**: Admin email list in environment variables
  - **Fallback**: Manual role update via Convex dashboard

- **Risk**: User stuck in onboarding loop
  - **Mitigation**: Skip button for optional fields
  - **Fallback**: Mark onboardingCompleted via Convex function

## Next Phase Dependencies

Phase 1 (Host Submission) requires:

- ✅ User authentication working
- ✅ Role-based routing established
- ✅ User profiles created
