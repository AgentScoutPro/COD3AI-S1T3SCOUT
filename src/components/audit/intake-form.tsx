"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { INDUSTRY_TEMPLATES } from "@/lib/industry-templates";
import { Button } from "@/components/ui/button";

const industries = Object.values(INDUSTRY_TEMPLATES);
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

export function AuditIntakeForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      businessName: formData.get("businessName"),
      websiteUrl: formData.get("websiteUrl"),
      industry: formData.get("industry"),
      city: formData.get("city"),
      state: formData.get("state"),
      phone: formData.get("phone") || "",
      email: formData.get("email") || "",
    };

    try {
      const createRes = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        if (createRes.status === 422 && body.error?.properties) {
          const fieldErrors: Record<string, string> = {};
          for (const [key, value] of Object.entries(body.error.properties as Record<string, { errors?: string[] }>)) {
            if (value?.errors?.[0]) fieldErrors[key] = value.errors[0];
          }
          setErrors(fieldErrors);
        } else {
          setFormError("We couldn't start the audit. Please check your inputs and try again.");
        }
        setSubmitting(false);
        return;
      }

      const { auditId } = await createRes.json();
      await fetch(`/api/audits/${auditId}/run`, { method: "POST" });
      router.push(`/audit/${auditId}/processing`);
    } catch {
      setFormError("Something went wrong starting the audit. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <p className="rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical">{formError}</p>
      )}

      <Field label="Business name" name="businessName" error={errors.businessName} required>
        <input
          name="businessName"
          required
          minLength={2}
          className="w-full rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
          placeholder="Desert Comfort Heating & Air"
        />
      </Field>

      <Field label="Website URL" name="websiteUrl" error={errors.websiteUrl} required>
        <input
          name="websiteUrl"
          required
          className="w-full rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
          placeholder="desertcomfortair.com"
        />
      </Field>

      <Field label="Primary service category" name="industry" error={errors.industry} required>
        <select
          name="industry"
          required
          defaultValue=""
          className="w-full rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
        >
          <option value="" disabled>
            Select an industry
          </option>
          {industries.map((industry) => (
            <option key={industry.slug} value={industry.slug}>
              {industry.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="City" name="city" error={errors.city} required>
          <input
            name="city"
            required
            minLength={2}
            className="w-full rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            placeholder="Phoenix"
          />
        </Field>
        <Field label="State" name="state" error={errors.state} required>
          <select
            name="state"
            required
            defaultValue=""
            className="w-full rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
          >
            <option value="" disabled>
              --
            </option>
            {US_STATES.map((abbrev) => (
              <option key={abbrev} value={abbrev}>
                {abbrev}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone (optional)" name="phone" error={errors.phone}>
          <input
            name="phone"
            className="w-full rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            placeholder="(602) 555-0142"
          />
        </Field>
        <Field label="Email (optional)" name="email" error={errors.email}>
          <input
            name="email"
            type="email"
            className="w-full rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            placeholder="you@business.com"
          />
        </Field>
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Starting your scout scan…" : "Run a Scout Scan"}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-critical">{error}</span>}
    </label>
  );
}
