import { NextResponse } from "next/server";
import { z } from "zod";
import { auditIntakeSchema } from "@/lib/validation/audit";
import { createAudit } from "@/lib/audit/create";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = auditIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 422 });
  }

  try {
    const { auditId } = await createAudit(parsed.data);
    return NextResponse.json({ auditId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create audit." },
      { status: 500 }
    );
  }
}
