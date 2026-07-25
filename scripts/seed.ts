import dotenv from "dotenv";
// Next.js auto-loads .env.local by convention; plain dotenv/config does not,
// so point it there explicitly for this standalone script.
dotenv.config({ path: ".env.local" });

import { createAudit } from "@/lib/audit/create";
import { runAudit } from "@/lib/audit/orchestrator";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { auditIntakeSchema } from "@/lib/validation/audit";
import { HVAC_PHOENIX_SEED } from "@/lib/mock-data/hvac-phoenix-seed";
import { env } from "@/lib/env";

async function main() {
  if (env.providerMode !== "mock") {
    console.warn("AUDIT_PROVIDER_MODE is not 'mock' — the seed will call live providers if credentials are set.");
  }

  const input = auditIntakeSchema.parse(HVAC_PHOENIX_SEED);
  console.log(`Creating seed audit for ${input.businessName}...`);

  const { auditId } = await createAudit(input);
  console.log(`Audit ${auditId} created — running pipeline...`);

  await runAudit(auditId);

  const supabase = getSupabaseAdmin();
  const { data: report } = await supabase.from("reports").select("public_token").eq("audit_id", auditId).single();

  console.log("\nSeed audit completed.");
  console.log(`  Audit ID:   ${auditId}`);
  if (report) {
    console.log(`  Report URL: ${env.appUrl}/reports/${report.public_token}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
