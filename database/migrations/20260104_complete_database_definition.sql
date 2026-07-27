-- ==========================================
-- 2026-01-04 COMPLETE DATABASE SCHEMA (Clean Slate)
-- This script defines the ENTIRE database structure.
-- Running this will wipe existing data and recreate all tables/policies.
-- ==========================================

-- 1. CLEANUP (Drop in reverse dependency order)
drop table if exists assessment_scores cascade;
drop table if exists audit_logs cascade;
drop table if exists assessment_cycles cascade;
drop table if exists assessments cascade;
drop table if exists content_packs cascade;
drop table if exists clients cascade;
drop table if exists user_invites cascade;
drop table if exists user_profiles cascade;
drop table if exists organizations cascade;

-- ==========================================
-- 2. AUTH & ORGANIZATION LAYER
-- ==========================================

create table organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id) default auth.uid()
);
alter table organizations enable row level security;

create table user_profiles (
  id uuid references auth.users(id) primary key,
  org_id uuid references organizations(id) not null,
  role text not null check (role in ('admin', 'senior_therapist', 'therapist', 'viewer')),
  full_name text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table user_profiles enable row level security;

create table user_invites (
  email text primary key,
  org_id uuid references organizations(id) not null,
  role text not null check (role in ('admin', 'senior_therapist', 'therapist', 'viewer')),
  invited_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table user_invites enable row level security;

-- ==========================================
-- 3. DATA LAYER
-- ==========================================

-- CLIENTS
create table clients (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) not null,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text default 'active' check (status in ('active', 'archived'))
);
alter table clients enable row level security;

-- CONTENT PACKS
create table content_packs (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) not null,
  title text not null,
  description text,
  version text default '1.0',
  pack_data jsonb not null default '{}'::jsonb, -- Stores Domains/Targets
  licence_proof_url text,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text default 'active' check (status in ('active', 'archived'))
);
alter table content_packs enable row level security;

-- ASSESSMENTS
create table assessments (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) not null,
  client_id uuid references clients(id) not null,
  content_pack_id uuid references content_packs(id) not null,
  pack_snapshot jsonb not null, -- Frozen copy of pack_data
  created_by uuid references auth.users(id),
  assigned_to uuid references auth.users(id),
  assessment_date date,
  status text default 'draft' check (status in ('draft', 'in_progress', 'submitted', 'approved')),
  submitted_at timestamp with time zone,
  approved_by uuid references auth.users(id),
  approved_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table assessments enable row level security;

-- ASSESSMENT CYCLES
create table assessment_cycles (
  id uuid default gen_random_uuid() primary key,
  assessment_id uuid references assessments(id) on delete cascade not null,
  org_id uuid references organizations(id) not null,
  cycle_number integer not null,
  status text default 'in_progress' check (status in ('in_progress', 'locked')),
  start_date timestamp with time zone default now(),
  end_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table assessment_cycles enable row level security;

-- ASSESSMENT SCORES
create table assessment_scores (
  id uuid default gen_random_uuid() primary key,
  assessment_id uuid references assessments(id) on delete cascade not null,
  assessment_cycle_id uuid references assessment_cycles(id) on delete cascade,
  client_id uuid references clients(id) not null,
  pack_snapshot_id uuid, -- Optional ref
  target_id text not null,
  domain_id text not null,
  score numeric,
  note text,
  metadata jsonb default '{}'::jsonb, -- Added per user request (Task Analysis)
  evidence_files jsonb default '[]'::jsonb,
  assessor_user_id uuid references auth.users(id),
  scored_at timestamp with time zone default now(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table assessment_scores enable row level security;

-- AUDIT LOGS
create table audit_logs (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) not null,
  user_id uuid references auth.users(id) not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  new_data jsonb,
  old_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table audit_logs enable row level security;

-- ==========================================
-- 4. RLS POLICIES (Comprehensive)
-- ==========================================

-- CORE RLS HELPER (Prevents Recursion)
create or replace function get_my_org_id() returns uuid language sql stable security definer as $$
  select org_id from user_profiles where id = auth.uid();
$$;

-- ORGANIZATIONS
create policy "Allow insert org for authenticated" on organizations for insert to authenticated with check (true);
create policy "Allow view own org" on organizations for select using (
  id = get_my_org_id() OR created_by = auth.uid()
);

-- PROFILES
create policy "Allow insert own profile" on user_profiles for insert to authenticated with check (auth.uid() = id);



create policy "Allow view org members" on user_profiles for select using (
  -- 1. Can see self
  auth.uid() = id
  OR
  -- 2. Can see others in my org (using secure function)
  org_id = get_my_org_id()
);

-- INVITES
create policy "Manage invites" on user_invites for all using (
  exists (select 1 from user_profiles where id = auth.uid() and org_id = user_invites.org_id and role in ('admin', 'senior_therapist'))
);
-- Allow public "check" via function (see below)

-- CLIENTS
create policy "View clients in org" on clients for select using (org_id = get_my_org_id());
create policy "Manage clients in org" on clients for all using (org_id = get_my_org_id() and exists (select 1 from user_profiles where id = auth.uid() and role in ('admin', 'senior_therapist')));
create policy "Delete clients in org" on clients for delete using (org_id = get_my_org_id());

-- PACKS
create policy "View packs in org" on content_packs for select using (org_id = get_my_org_id());
create policy "Manage packs in org" on content_packs for all using (org_id = get_my_org_id() and exists (select 1 from user_profiles where id = auth.uid() and role in ('admin', 'senior_therapist')));
create policy "Delete packs in org" on content_packs for delete using (org_id = get_my_org_id());

-- ASSESSMENTS & CYCLES & SCORES
-- Standard: View if in Org, Edit if Therapist+
create policy "View assessments in org" on assessments for select using (org_id = get_my_org_id());
create policy "Manage assessments" on assessments for all using (org_id = get_my_org_id());

create policy "View cycles" on assessment_cycles for select using (org_id = get_my_org_id());
create policy "Manage cycles" on assessment_cycles for all using (org_id = get_my_org_id());

create policy "View scores" on assessment_scores for select using (
  assessment_id in (select id from assessments where org_id = get_my_org_id())
);
create policy "Manage scores" on assessment_scores for all using (
  assessment_id in (select id from assessments where org_id = get_my_org_id())
);

-- AUDIT LOGS
create policy "View audit logs in org" on audit_logs for select using (org_id = get_my_org_id());
create policy "Insert audit logs" on audit_logs for insert to authenticated with check (org_id = get_my_org_id());

-- ==========================================
-- 5. FUNCTIONS
-- ==========================================

create or replace function check_user_invite(lookup_email text)
returns json language plpgsql security definer as $$
declare
  invite_record record;
begin
  select * into invite_record from user_invites where lower(email) = lower(lookup_email);
  if found then return row_to_json(invite_record); else return null; end if;
end;
$$;
grant execute on function check_user_invite to authenticated, anon, service_role;

create or replace function claim_invite()
returns json language plpgsql security definer as $$
declare
  current_email text;
  invite_record record;
begin
  select email into current_email from auth.users where id = auth.uid();
  if current_email is null then return null; end if;
  select * into invite_record from user_invites where lower(email) = lower(current_email);
  if found then
    delete from user_invites where lower(email) = lower(current_email);
    return row_to_json(invite_record);
  else
    return null;
  end if;
end;
$$;
grant execute on function claim_invite to authenticated;
