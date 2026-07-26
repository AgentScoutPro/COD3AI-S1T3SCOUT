import { NextResponse } from "next/server";
import { chromium, type Browser } from "playwright-core";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { canExportPdf } from "@/lib/audit/approval-gate";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sanitizeFilename(value: string) {
  return value
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[^a-z0-9.-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

// Serverless platforms (Vercel, AWS Lambda) don't have a system Chromium,
// and the plain `playwright` package's bundled browser download doesn't
// survive the deployment bundle. `@sparticuz/chromium` ships a Lambda/
// Vercel-compatible binary instead. Locally, `playwright-core` reuses the
// same browser cache `npx playwright install chromium` already populated
// for `playwright`, so this branch only matters in serverless.
async function launchBrowser(): Promise<Browser> {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION);
  if (!isServerless) {
    return chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  }

  const sparticuzChromium = (await import("@sparticuz/chromium")).default;
  return chromium.launch({
    headless: true,
    args: sparticuzChromium.args,
    executablePath: await sparticuzChromium.executablePath(),
  });
}

export async function GET(_request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const supabase = getSupabaseAdmin();
  const { data: report } = await supabase.from("reports").select("report_json, audit_id").eq("public_token", token).single();

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  // §7: PDF export requires the same approval gate as the public report
  // page — a rejected/needs_review public_live audit must not be
  // exportable just because the caller knows the token.
  const { data: audit } = await supabase.from("audits").select("audit_mode, review_status").eq("id", report.audit_id).single();
  if (audit && !canExportPdf(audit.audit_mode, audit.review_status)) {
    return NextResponse.json({ error: "This report is pending approval and cannot be exported yet." }, { status: 403 });
  }

  const reportJson = report.report_json as {
    business?: { name?: string; websiteUrl?: string };
  };
  // Deliberately NOT `new URL(request.url).origin`: on Vercel, every
  // deployment also gets a unique per-deployment hash URL
  // (cod-3-ai-s1-t3-scout-<hash>-....vercel.app), and those are covered by
  // Vercel Deployment Protection (an SSO wall) even when the stable
  // production domain isn't. A download triggered from one of those hash
  // URLs would make this server-side Playwright navigation hit Vercel's
  // login page instead of the report and "print" that — confirmed as the
  // cause of a real broken-PDF report. env.appUrl (NEXT_PUBLIC_APP_URL) is
  // the one canonical, unprotected domain this should always target.
  const reportUrl = `${env.appUrl}/reports/${token}`;
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1800 },
      deviceScaleFactor: 1,
    });

    await page.goto(reportUrl, { waitUntil: "networkidle", timeout: 45_000 });
    // Screen media (not print) so the real theme renders exactly as it
    // does live — this is a snapshot of the real page, not a separate
    // print template.
    await page.emulateMedia({ media: "screen" });
    await page.addStyleTag({
      content: `
        .no-print { display: none !important; }
        html, body { background: #07090d !important; } /* obsidian — brand-tokens.json */
        main { padding-top: 48px !important; padding-bottom: 48px !important; }
      `,
    });

    // Fixed page heights paginate the content, which both leaves a large
    // blank gap on the last page and can split a card mid-sentence across
    // a page break (screen media means the `.print-break` CSS rule, which
    // is print-media-gated, never applies here). Sizing the PDF to the
    // page's actual rendered height instead makes it one continuous page —
    // matching the live page exactly, with no arbitrary breaks at all.
    const contentHeight = await page.evaluate(() => document.documentElement.scrollHeight);

    const pdf = await page.pdf({
      width: "1440px",
      height: `${contentHeight}px`,
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
      preferCSSPageSize: false,
    });

    const nameSource = reportJson.business?.websiteUrl || reportJson.business?.name || token;
    const filename = `cod3ai-s1t3scout-${sanitizeFilename(nameSource)}-report.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await browser.close();
  }
}
