import type { CrmProvider, CrmLeadPayload, ProviderResult } from "../types";
import { env } from "@/lib/env";

/** Posts the lead + report summary to a GoHighLevel inbound webhook.
 * A missing/misconfigured webhook must never fail the audit — callers
 * should treat any status here as informational only. */
export class GhlCrmProvider implements CrmProvider {
  async sendLead(payload: CrmLeadPayload): Promise<ProviderResult<{ delivered: boolean }>> {
    if (!env.ghlWebhookUrl) {
      return {
        mode: "live",
        status: "partial",
        data: { delivered: false },
        errorMessage: "GHL_AUDIT_WEBHOOK_URL not configured — lead was not forwarded.",
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), env.requestTimeoutMs);
      const res = await fetch(env.ghlWebhookUrl, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          mode: "live",
          status: "error",
          data: { delivered: false },
          errorMessage: `GHL webhook responded with ${res.status}`,
        };
      }
      return { mode: "live", status: "ok", data: { delivered: true } };
    } catch (error) {
      return {
        mode: "live",
        status: "error",
        data: { delivered: false },
        errorMessage: error instanceof Error ? error.message : "Unknown GHL webhook error",
      };
    }
  }
}
