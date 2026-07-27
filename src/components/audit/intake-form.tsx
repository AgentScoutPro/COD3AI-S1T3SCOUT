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

const MAPS_LINK_PATTERN = /google\.com\/maps|maps\.app\.goo\.gl/i;

export function AuditIntakeForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [mapsLinkWarning, setMapsLinkWarning] = useState<string | null>(null);

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
      mapsLink: formData.get("mapsLink") || "",
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

      <label className="block">
        <span className="mb-1.5 flex items-center text-sm font-medium text-foreground">
          Google Business Profile / Maps link (optional)
          <MapsLinkHelp />
        </span>
        <input
          name="mapsLink"
          className="w-full rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
          placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/place/..."
          onBlur={(e) => {
            const value = e.target.value.trim();
            setMapsLinkWarning(value && !MAPS_LINK_PATTERN.test(value) ? "This doesn't look like a Google Maps link — you can still submit, but we may not be able to use it." : null);
          }}
        />
        {errors.mapsLink && <span className="mt-1 block text-xs text-critical">{errors.mapsLink}</span>}
        {!errors.mapsLink && mapsLinkWarning && <span className="mt-1 block text-xs text-muted">{mapsLinkWarning}</span>}
      </label>

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

function MapsLinkHelp() {
  // `pinned` is driven ONLY by onClick — deliberately not mirrored with
  // onFocus/onMouseEnter. A button click also fires a native `focus` event
  // immediately before `click`, so an onFocus handler touching the same
  // state races the onClick toggle: focus sets it open, then the click's
  // toggle immediately flips it back closed on that same interaction (and
  // the same bug applies to onMouseEnter, since a simulated/real hover
  // right before a click has the same ordering). Hover and keyboard focus
  // are handled with pure CSS (group-hover / group-focus-within) instead,
  // so they can't race the click handler — all three ways to reveal it
  // just OR together safely.
  const [pinned, setPinned] = useState(false);

  return (
    <span className="group relative ml-1.5 inline-flex">
      <button
        type="button"
        onClick={() => setPinned((v) => !v)}
        aria-expanded={pinned}
        aria-describedby="maps-link-help"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-border text-[10px] leading-none text-muted group-hover:border-accent group-focus-within:border-accent group-hover:text-accent group-focus-within:text-accent"
      >
        ?<span className="sr-only">What&apos;s this?</span>
      </button>
      <div
        id="maps-link-help"
        role="tooltip"
        className={`absolute top-6 left-0 z-10 w-72 rounded-lg border border-border bg-surface-raised p-3 text-xs leading-relaxed font-normal text-muted shadow-lg transition-opacity ${
          pinned
            ? "opacity-100"
            : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
        }`}
      >
        <p>
          This helps us find your exact business listing instead of guessing from your name and city. To get your
          link:
        </p>
        <p className="mt-2">
          <span className="font-medium text-foreground">On Google Maps:</span> search for your business, tap Share,
          then Copy link.
        </p>
        <p className="mt-1">
          <span className="font-medium text-foreground">On your Google Business Profile:</span> click your location,
          then Share (or &quot;View on Maps&quot;), then copy the URL.
        </p>
        <p className="mt-2">Paste any Google Maps URL — short links (maps.app.goo.gl/...) work fine.</p>
      </div>
    </span>
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
