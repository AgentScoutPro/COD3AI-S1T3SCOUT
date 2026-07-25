-- Cod3AI S1T3SCOUT — initial schema
-- Public prospect-audit MVP. See ARCHITECTURE.md and SCORING_MODEL.md.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_id_idx on organization_members(user_id);

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
create table businesses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  website_url text not null,
  normalized_domain text not null,
  industry text not null,
  phone text,
  email text,
  city text not null,
  state text not null,
  place_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_organization_id_idx on businesses(organization_id);
create index businesses_normalized_domain_idx on businesses(normalized_domain);

-- ---------------------------------------------------------------------------
-- audits
-- ---------------------------------------------------------------------------
create table audits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  audit_type text not null check (audit_type in ('public', 'connected')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  current_stage text not null default 'queued',
  scoring_version text not null,
  overall_score numeric(5, 2),
  confidence_score numeric(5, 2),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index audits_business_id_idx on audits(business_id);
create index audits_status_idx on audits(status);

-- ---------------------------------------------------------------------------
-- audit_sources — provider mode + raw payload metadata per external call
-- ---------------------------------------------------------------------------
create table audit_sources (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  source_type text not null
    check (source_type in ('website', 'places', 'pagespeed', 'ai_report', 'crm')),
  provider_mode text not null check (provider_mode in ('mock', 'live')),
  status text not null check (status in ('ok', 'partial', 'error')),
  raw_metadata jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

create index audit_sources_audit_id_idx on audit_sources(audit_id);

-- ---------------------------------------------------------------------------
-- crawled_pages
-- ---------------------------------------------------------------------------
create table crawled_pages (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  url text not null,
  normalized_url text not null,
  page_type text not null default 'unknown',
  http_status integer,
  title text,
  meta_description text,
  h1 text,
  canonical_url text,
  word_count integer,
  has_schema boolean not null default false,
  schema_types text[] not null default '{}',
  internal_links integer not null default 0,
  broken_links integer not null default 0,
  broken_images integer not null default 0,
  signals jsonb not null default '{}'::jsonb,
  crawled_at timestamptz not null default now(),
  unique (audit_id, normalized_url)
);

create index crawled_pages_audit_id_idx on crawled_pages(audit_id);
create index crawled_pages_page_type_idx on crawled_pages(page_type);

-- ---------------------------------------------------------------------------
-- findings
-- ---------------------------------------------------------------------------
create table findings (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  rule_id text not null,
  category text not null,
  status text not null check (status in ('pass', 'warning', 'fail', 'unknown')),
  severity text not null
    check (severity in ('critical', 'high', 'medium', 'low', 'informational')),
  points_available numeric(6, 2) not null default 0,
  points_earned numeric(6, 2) not null default 0,
  evidence jsonb not null default '{}'::jsonb,
  source_urls text[] not null default '{}',
  explanation text not null,
  recommendation text,
  estimated_impact text check (estimated_impact in ('high', 'medium', 'low')),
  estimated_effort text check (estimated_effort in ('high', 'medium', 'low')),
  confidence numeric(4, 2) not null default 1,
  created_at timestamptz not null default now(),
  unique (audit_id, rule_id)
);

create index findings_audit_id_idx on findings(audit_id);
create index findings_category_idx on findings(category);
create index findings_status_idx on findings(status);

-- ---------------------------------------------------------------------------
-- category_scores
-- ---------------------------------------------------------------------------
create table category_scores (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  category text not null,
  weight numeric(5, 2) not null,
  earned_points numeric(6, 2) not null,
  available_points numeric(6, 2) not null,
  category_percentage numeric(5, 2) not null,
  weighted_score numeric(5, 2) not null,
  confidence numeric(4, 2) not null default 1,
  unique (audit_id, category)
);

create index category_scores_audit_id_idx on category_scores(audit_id);

-- ---------------------------------------------------------------------------
-- competitors
-- ---------------------------------------------------------------------------
create table competitors (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  name text not null,
  place_id text,
  website_url text,
  benchmark_position integer not null,
  rating numeric(3, 2),
  review_count integer,
  has_website boolean not null default false,
  pagespeed_mobile_score integer,
  service_page_coverage numeric(5, 2),
  location_page_coverage numeric(5, 2),
  trust_signal_count integer not null default 0,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index competitors_audit_id_idx on competitors(audit_id);

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
create table reports (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade unique,
  executive_summary text not null,
  top_opportunities jsonb not null default '[]'::jsonb,
  action_plan jsonb not null default '{}'::jsonb,
  report_json jsonb not null default '{}'::jsonb,
  public_token text not null unique,
  generated_at timestamptz not null default now()
);

create index reports_audit_id_idx on reports(audit_id);
create unique index reports_public_token_idx on reports(public_token);

-- ---------------------------------------------------------------------------
-- audit_events — persisted stage progress (drives the processing UI)
-- ---------------------------------------------------------------------------
create table audit_events (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  stage text not null,
  status text not null check (status in ('started', 'completed', 'failed')),
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_audit_id_idx on audit_events(audit_id);
create index audit_events_created_at_idx on audit_events(audit_id, created_at);

-- ---------------------------------------------------------------------------
-- integrations — per-org connected provider credentials (Phase 3 scaffolding)
-- ---------------------------------------------------------------------------
create table integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider text not null
    check (provider in ('google_business_profile', 'search_console', 'ghl', 'rank_tracking', 'citation')),
  status text not null default 'disconnected'
    check (status in ('disconnected', 'connected', 'error')),
  encrypted_credentials text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create index integrations_organization_id_idx on integrations(organization_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger organizations_set_updated_at before update on organizations
  for each row execute function set_updated_at();
create trigger businesses_set_updated_at before update on businesses
  for each row execute function set_updated_at();
create trigger audits_set_updated_at before update on audits
  for each row execute function set_updated_at();
create trigger integrations_set_updated_at before update on integrations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table businesses enable row level security;
alter table audits enable row level security;
alter table audit_sources enable row level security;
alter table crawled_pages enable row level security;
alter table findings enable row level security;
alter table category_scores enable row level security;
alter table competitors enable row level security;
alter table reports enable row level security;
alter table audit_events enable row level security;
alter table integrations enable row level security;

-- Helper: is the current user a member of the given organization?
create or replace function is_org_member(org_id uuid)
returns boolean as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id and user_id = auth.uid()
  );
$$ language sql stable security definer;

create policy "members read own organization" on organizations
  for select using (is_org_member(id));

create policy "members read own membership rows" on organization_members
  for select using (is_org_member(organization_id));

create policy "members manage own businesses" on businesses
  for all using (organization_id is null or is_org_member(organization_id))
  with check (organization_id is null or is_org_member(organization_id));

create policy "members read own audits" on audits
  for select using (
    exists (
      select 1 from businesses b
      where b.id = audits.business_id
        and (b.organization_id is null or is_org_member(b.organization_id))
    )
  );

create policy "members read own audit_sources" on audit_sources
  for select using (
    exists (
      select 1 from audits a
      join businesses b on b.id = a.business_id
      where a.id = audit_sources.audit_id
        and (b.organization_id is null or is_org_member(b.organization_id))
    )
  );

create policy "members read own crawled_pages" on crawled_pages
  for select using (
    exists (
      select 1 from audits a
      join businesses b on b.id = a.business_id
      where a.id = crawled_pages.audit_id
        and (b.organization_id is null or is_org_member(b.organization_id))
    )
  );

create policy "members read own findings" on findings
  for select using (
    exists (
      select 1 from audits a
      join businesses b on b.id = a.business_id
      where a.id = findings.audit_id
        and (b.organization_id is null or is_org_member(b.organization_id))
    )
  );

create policy "members read own category_scores" on category_scores
  for select using (
    exists (
      select 1 from audits a
      join businesses b on b.id = a.business_id
      where a.id = category_scores.audit_id
        and (b.organization_id is null or is_org_member(b.organization_id))
    )
  );

create policy "members read own competitors" on competitors
  for select using (
    exists (
      select 1 from audits a
      join businesses b on b.id = a.business_id
      where a.id = competitors.audit_id
        and (b.organization_id is null or is_org_member(b.organization_id))
    )
  );

create policy "members read own reports" on reports
  for select using (
    exists (
      select 1 from audits a
      join businesses b on b.id = a.business_id
      where a.id = reports.audit_id
        and (b.organization_id is null or is_org_member(b.organization_id))
    )
  );

create policy "members read own audit_events" on audit_events
  for select using (
    exists (
      select 1 from audits a
      join businesses b on b.id = a.business_id
      where a.id = audit_events.audit_id
        and (b.organization_id is null or is_org_member(b.organization_id))
    )
  );

create policy "members manage own integrations" on integrations
  for all using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

-- Note: all writes from the app happen through the server-side Supabase
-- client using the service role key, which bypasses RLS by design. These
-- policies protect direct client-side reads (e.g. an authenticated
-- dashboard querying Supabase directly) so org members only ever see
-- their own organization's data. Public report reads go through
-- /reports/[token] using the service role client + public_token lookup,
-- never through direct client-side table access.
