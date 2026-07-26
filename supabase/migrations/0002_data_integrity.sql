-- Cod3AI S1T3SCOUT — platform-wide data-integrity fixes
-- See artifacts/platform-audit-root-cause.md for the incident this addresses.
--
-- Adds: persisted audit mode, an approval/review workflow separate from the
-- existing pipeline `status`, industry-detection-vs-selection records,
-- Google entity-verification records, a log of provider-integrity
-- violations, and location-field separation on businesses.

-- ---------------------------------------------------------------------------
-- audits — mode + review workflow
-- ---------------------------------------------------------------------------
alter table audits add column audit_mode text not null default 'public_live'
  check (audit_mode in ('demo', 'internal_test', 'public_live', 'connected_client'));

alter table audits add column review_status text not null default 'not_required'
  check (review_status in ('not_required', 'needs_review', 'approved', 'rejected', 'published'));

alter table audits add column reviewed_by text;
alter table audits add column reviewed_at timestamptz;
alter table audits add column review_notes text;

-- Set when the pipeline halts before scoring/report generation for a
-- data-integrity reason (e.g. 'industry_mismatch'). Distinguishes an
-- intentional integrity stop from an ordinary crash (`error_message`).
alter table audits add column blocked_reason text;

create index audits_audit_mode_idx on audits(audit_mode);
create index audits_review_status_idx on audits(review_status);

-- ---------------------------------------------------------------------------
-- businesses — separate intake city from confirmed target-market/service area
-- ---------------------------------------------------------------------------
alter table businesses add column primary_target_market text;
alter table businesses add column service_areas text[] not null default '{}';
alter table businesses add column target_market_confirmed boolean not null default false;

-- ---------------------------------------------------------------------------
-- audit_sources — provider-integrity display status
-- ---------------------------------------------------------------------------
alter table audit_sources add column display_status text not null default 'live'
  check (display_status in ('live', 'connected', 'unavailable', 'not_evaluated', 'demo_synthetic'));

-- ---------------------------------------------------------------------------
-- findings — evidence-binding metadata (industry template + scoreability)
-- ---------------------------------------------------------------------------
alter table findings add column industry_template text;
alter table findings add column scoreable boolean not null default true;

-- ---------------------------------------------------------------------------
-- industry_classifications — selected vs. detected industry, per audit
-- ---------------------------------------------------------------------------
create table industry_classifications (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade unique,
  selected_industry text not null,
  detected_industry text,
  selected_confidence numeric(5, 2) not null default 0,
  detected_confidence numeric(5, 2) not null default 0,
  supporting_evidence jsonb not null default '[]'::jsonb,
  contradicting_evidence jsonb not null default '[]'::jsonb,
  scores jsonb not null default '[]'::jsonb,
  mismatch boolean not null default false,
  mismatch_reason text,
  override_status text not null default 'none' check (override_status in ('none', 'approved')),
  override_reviewer text,
  override_reason text,
  override_at timestamptz,
  created_at timestamptz not null default now()
);

create index industry_classifications_audit_id_idx on industry_classifications(audit_id);

-- ---------------------------------------------------------------------------
-- entity_verifications — multi-signal Google entity match, per audit
-- ---------------------------------------------------------------------------
create table entity_verifications (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade unique,
  status text not null check (status in ('verified', 'unverified', 'not_applicable')),
  confidence numeric(5, 2) not null default 0,
  matched_signals text[] not null default '{}',
  conflicting_signals text[] not null default '{}',
  place_id text,
  created_at timestamptz not null default now()
);

create index entity_verifications_audit_id_idx on entity_verifications(audit_id);

-- ---------------------------------------------------------------------------
-- integrity_warnings — provider-integrity-layer rejections, per audit
-- ---------------------------------------------------------------------------
create table integrity_warnings (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  source_type text not null,
  warning text not null,
  created_at timestamptz not null default now()
);

create index integrity_warnings_audit_id_idx on integrity_warnings(audit_id);

-- ---------------------------------------------------------------------------
-- Row Level Security for new tables (mirrors existing per-audit policies)
-- ---------------------------------------------------------------------------
alter table industry_classifications enable row level security;
alter table entity_verifications enable row level security;
alter table integrity_warnings enable row level security;

create policy "members read own industry_classifications" on industry_classifications
  for select using (
    exists (
      select 1 from audits a
      join businesses b on b.id = a.business_id
      where a.id = industry_classifications.audit_id
        and (b.organization_id is null or is_org_member(b.organization_id))
    )
  );

create policy "members read own entity_verifications" on entity_verifications
  for select using (
    exists (
      select 1 from audits a
      join businesses b on b.id = a.business_id
      where a.id = entity_verifications.audit_id
        and (b.organization_id is null or is_org_member(b.organization_id))
    )
  );

create policy "members read own integrity_warnings" on integrity_warnings
  for select using (
    exists (
      select 1 from audits a
      join businesses b on b.id = a.business_id
      where a.id = integrity_warnings.audit_id
        and (b.organization_id is null or is_org_member(b.organization_id))
    )
  );
