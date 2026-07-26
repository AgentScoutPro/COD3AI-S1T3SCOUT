import { describe, expect, it } from "vitest";
import { canExportPdf, canHandoffToCrm, canPublishReport, requiresApproval } from "@/lib/audit/approval-gate";

describe("approval-gate", () => {
  it("requires approval for public_live and connected_client, not demo/internal_test", () => {
    expect(requiresApproval("public_live")).toBe(true);
    expect(requiresApproval("connected_client")).toBe(true);
    expect(requiresApproval("demo")).toBe(false);
    expect(requiresApproval("internal_test")).toBe(false);
  });

  // Required test #18: public reports and PDFs require approval.
  it("blocks report/PDF publication for a public_live audit pending review", () => {
    expect(canPublishReport("public_live", "needs_review")).toBe(false);
    expect(canExportPdf("public_live", "needs_review")).toBe(false);
  });

  it("blocks report/PDF publication for a rejected public_live audit", () => {
    expect(canPublishReport("public_live", "rejected")).toBe(false);
    expect(canExportPdf("public_live", "rejected")).toBe(false);
  });

  it("allows report/PDF publication once a public_live audit is approved", () => {
    expect(canPublishReport("public_live", "approved")).toBe(true);
    expect(canExportPdf("public_live", "approved")).toBe(true);
  });

  it("never blocks demo/internal_test audits, which don't require review", () => {
    expect(canPublishReport("demo", "needs_review")).toBe(true);
    expect(canPublishReport("internal_test", "not_required")).toBe(true);
  });

  // Required test #19: CRM handoff requires approval.
  it("blocks CRM handoff for a public_live audit pending review, allows it once approved", () => {
    expect(canHandoffToCrm("public_live", "needs_review")).toBe(false);
    expect(canHandoffToCrm("public_live", "approved")).toBe(true);
  });

  it("requires approval for connected_client CRM handoff too", () => {
    expect(canHandoffToCrm("connected_client", "needs_review")).toBe(false);
    expect(canHandoffToCrm("connected_client", "approved")).toBe(true);
  });
});
