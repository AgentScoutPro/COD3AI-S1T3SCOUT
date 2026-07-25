import { z } from "zod";
import { INDUSTRY_SLUGS } from "@/lib/industry-templates";

const usStateAbbrev = /^[A-Z]{2}$/;
const e164ish = /^[+]?[0-9()\-.\s]{7,20}$/;

export const auditIntakeSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  websiteUrl: z
    .string()
    .trim()
    .min(4)
    .max(300)
    .transform((val) => (/^https?:\/\//i.test(val) ? val : `https://${val}`))
    .pipe(z.url()),
  industry: z.enum(INDUSTRY_SLUGS as [string, ...string[]]),
  city: z.string().trim().min(2).max(80),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(usStateAbbrev, "Use a two-letter state code, e.g. AZ"),
  phone: z.string().trim().regex(e164ish, "Enter a valid phone number").optional().or(z.literal("")),
  email: z.email().optional().or(z.literal("")),
});

export type AuditIntakeInput = z.infer<typeof auditIntakeSchema>;

export const auditIdParamSchema = z.uuid();
