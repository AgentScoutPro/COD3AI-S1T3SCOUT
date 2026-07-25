import { NextResponse } from "next/server";
import { getCrmProvider } from "@/lib/providers/crm";

// Lets an operator confirm GHL_AUDIT_WEBHOOK_URL is wired up correctly
// without running a full audit. Never used in the audit pipeline itself.
export async function POST() {
  const crmProvider = getCrmProvider();
  const result = await crmProvider.sendLead({
    businessName: "Test Business — Cod3AI S1T3SCOUT",
    websiteUrl: "https://example.com",
    city: "Phoenix",
    state: "AZ",
    phone: "(602) 555-0100",
    email: "test@example.com",
    overallScore: 72,
    topOpportunities: ["Example opportunity one", "Example opportunity two"],
    reportUrl: "https://example.com/reports/test-token",
  });

  return NextResponse.json(
    { delivered: result.data.delivered, status: result.status, errorMessage: result.errorMessage ?? null },
    { status: result.status === "error" ? 502 : 200 }
  );
}
