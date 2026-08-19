-- =============================================================================
-- assessment_communication_reports — Layer 2C clinician-authored report entity
-- Contract: docs/architecture/assessment_report_authoring_contract.md (7f626d2)
-- =============================================================================

create table assessment_communication_reports (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) not null,
  assessment_id uuid references assessments(id) on delete cascade not null,
  cycle_id uuid references assessment_cycles(id) on delete cascade not null,
  status text not null default 'draft'
    check (status in ('draft', 'finalized', 'superseded')),
  version integer not null check (version >= 1),
  authoring jsonb not null default '{}'::jsonb,
  embedded_computed jsonb,
  embedded_generated_at timestamp with time zone,
  created_by uuid references auth.users(id) not null,
  last_edited_by uuid references auth.users(id) not null,
  finalized_by uuid references auth.users(id),
  finalized_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (assessment_id, cycle_id, version)
);

create unique index assessment_communication_reports_one_draft_per_scope
  on assessment_communication_reports (assessment_id, cycle_id)
  where status = 'draft';

create index assessment_communication_reports_scope_status_idx
  on assessment_communication_reports (assessment_id, cycle_id, status, version desc);

alter table assessment_communication_reports enable row level security;

-- §8.1: finalized/superseded visible to all org members; drafts visible to
-- admin, senior_therapist, and therapist only (viewer excluded).
create policy "View communication reports in org"
  on assessment_communication_reports
  for select
  using (
    org_id = get_my_org_id()
    and (
      status in ('finalized', 'superseded')
      or exists (
        select 1
        from user_profiles
        where id = auth.uid()
          and role in ('admin', 'senior_therapist', 'therapist')
      )
    )
  );

-- §8.1 / §8.2: create and edit restricted to admin/senior_therapist;
-- parent assessment must be approved (database-level gate).
create policy "Insert communication reports in org"
  on assessment_communication_reports
  for insert
  to authenticated
  with check (
    org_id = get_my_org_id()
    and exists (
      select 1
      from user_profiles
      where id = auth.uid()
        and role in ('admin', 'senior_therapist')
    )
    and exists (
      select 1
      from assessments
      where id = assessment_id
        and org_id = get_my_org_id()
        and status = 'approved'
    )
  );

create policy "Update communication reports in org"
  on assessment_communication_reports
  for update
  to authenticated
  using (
    org_id = get_my_org_id()
    and exists (
      select 1
      from user_profiles
      where id = auth.uid()
        and role in ('admin', 'senior_therapist')
    )
    and exists (
      select 1
      from assessments
      where id = assessment_id
        and org_id = get_my_org_id()
        and status = 'approved'
    )
  )
  with check (
    org_id = get_my_org_id()
    and exists (
      select 1
      from user_profiles
      where id = auth.uid()
        and role in ('admin', 'senior_therapist')
    )
    and exists (
      select 1
      from assessments
      where id = assessment_id
        and org_id = get_my_org_id()
        and status = 'approved'
    )
  );

create policy "Delete communication reports in org"
  on assessment_communication_reports
  for delete
  to authenticated
  using (
    org_id = get_my_org_id()
    and exists (
      select 1
      from user_profiles
      where id = auth.uid()
        and role in ('admin', 'senior_therapist')
    )
  );
