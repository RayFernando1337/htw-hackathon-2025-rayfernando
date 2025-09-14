import { PageContainer, PageHeader } from "@/components/ui/page-container";
import { Protect } from "@clerk/nextjs";

function UpgradeCard() {
  return (
    <PageContainer>
      <PageHeader
        title="Upgrade to a paid plan"
        subtitle="This page is available on paid plans. Choose a plan that fits your needs."
      />
      {/* <CustomClerkPricing /> */}
    </PageContainer>
  );
}

function FeaturesCard() {
  return (
    <PageContainer>
      <PageHeader title="Advanced features" />
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Page with advanced features</h2>
        <p className="text-muted-foreground">Access to advanced features.</p>
      </div>
    </PageContainer>
  );
}

export default function TeamPage() {
  return (
    <Protect
      condition={(has) => {
        // Check if user has any of the paid plans
        // return has({ plan: "starter" }) || has({ plan: "hobby" }) || has({ plan: "pro" })
        // Or alternatively, check if user doesn't have free plan (if free plan exists)
        return !has({ plan: "free_user" });
      }}
      fallback={<UpgradeCard />}
    >
      <FeaturesCard />
    </Protect>
  );
}
