-- =====================================================================
-- SUPER MASTER SUPABASE SQL SCRIPT - NIVESHAK WEBSITE (Idempotent & Consolidated)
-- =====================================================================
-- INSTRUCTIONS: Run this entire script in the Supabase SQL Editor.
-- This script is fully idempotent: it can be run multiple times safely.
-- It avoids dropping existing table data using IF NOT EXISTS and ALTER TABLE logic.
-- =====================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- ============================================
-- 2. SITE_SETTINGS
-- ============================================
create table if not exists public.site_settings (
  id text primary key,
  social_links jsonb default '[]',
  value text,
  updated_at timestamp with time zone default now()
);

-- Ensure RLS is enabled
alter table public.site_settings enable row level security;

-- Policies (Drop existing to redefine safely)
drop policy if exists "Public Read Settings" on public.site_settings;
drop policy if exists "Admin All Settings" on public.site_settings;
create policy "Public Read Settings" on public.site_settings for select using (true);
create policy "Admin All Settings" on public.site_settings for all using (auth.role() = 'authenticated');

-- Seed site_settings safely (Do nothing if exists)
insert into public.site_settings (id, social_links) values ('settings', '[]') ON CONFLICT (id) DO NOTHING;
insert into public.site_settings (id, value) values ('redemption_link', '') ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. TABLES (Idempotent schema definitions)
-- ============================================

-- 3.1 HERO SLIDES
create table if not exists public.hero_slides (
  id text primary key,
  image_url text,
  title text,
  subtitle text,
  object_fit text default 'cover',
  timer int default 5,
  created_at timestamp with time zone default now(),
  media_key text,
  storage_provider text default 'legacy',
  badge text,
  tagline text,
  description text
);
alter table public.hero_slides add column if not exists media_key text;
alter table public.hero_slides add column if not exists storage_provider text default 'legacy';
alter table public.hero_slides add column if not exists badge text;
alter table public.hero_slides add column if not exists tagline text;
alter table public.hero_slides add column if not exists description text;

-- 3.2 ABOUT CONTENT
create table if not exists public.about_content (
  id text primary key,
  title text,
  description text,
  slides jsonb default '[]',
  cards jsonb default '[]',
  rich_content jsonb default '[]',
  updated_at timestamp with time zone default now()
);
alter table public.about_content add column if not exists rich_content jsonb default '[]';

-- 3.2.1 ABOUT SECTIONS (Multi-Section Support)
create table if not exists public.about_sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    cards JSONB DEFAULT '[]'::jsonb, -- Array of {title, description}
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration logic for About Sections (Copy legacy if empty)
DO $$
DECLARE
    existing_title TEXT;
    existing_desc TEXT;
    existing_cards JSONB;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.about_sections) THEN
        -- Fetch from about_content (id='about')
        SELECT title, description, cards INTO existing_title, existing_desc, existing_cards
        FROM public.about_content
        WHERE id = 'about';

        IF (existing_title IS NOT NULL) THEN
            INSERT INTO public.about_sections (title, description, cards, display_order)
            VALUES (existing_title, existing_desc, existing_cards, 0);
        END IF;
    END IF;
END $$;

-- Policies for About Sections
alter table public.about_sections enable row level security;
drop policy if exists "Allow public read access" on public.about_sections;
drop policy if exists "Allow authenticated insert" on public.about_sections;
drop policy if exists "Allow authenticated update" on public.about_sections;
drop policy if exists "Allow authenticated delete" on public.about_sections;
create policy "Allow public read access" on public.about_sections for select using (true);
create policy "Allow authenticated insert" on public.about_sections for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated update" on public.about_sections for update using (auth.role() = 'authenticated');
create policy "Allow authenticated delete" on public.about_sections for delete using (auth.role() = 'authenticated');


-- 3.3 TEAM MEMBERS
create table if not exists public.team_members (
  id text primary key,
  name text,
  role text,
  image_url text,
  email text,
  linkedin text,
  details text,
  category text,
  created_at timestamp with time zone default now(),
  media_key text,
  storage_provider text default 'legacy'
);
alter table public.team_members add column if not exists media_key text;
alter table public.team_members add column if not exists storage_provider text default 'legacy';

-- 3.4 MAGAZINES
create table if not exists public.magazines (
  id text primary key,
  title text,
  issue_date text,
  issue_month text,
  issue_year text,
  cover_url text,
  pdf_url text,
  flip_url text,
  created_at timestamp with time zone default now(),
  media_key text,
  pdf_media_key text,
  storage_provider text default 'legacy'
);
alter table public.magazines add column if not exists issue_month text;
alter table public.magazines add column if not exists issue_year text;
alter table public.magazines add column if not exists media_key text;
alter table public.magazines add column if not exists pdf_media_key text;
alter table public.magazines add column if not exists storage_provider text default 'legacy';

-- 3.5 EVENTS
create table if not exists public.events (
  id text primary key,
  title text,
  date text,
  time text,
  location text,
  type text,
  image_url text,
  orientation text default 'landscape',
  meeting_link text,
  is_online boolean default false,
  registration_link text,
  description text,
  deadline text,
  "showTime" boolean default true,
  "showDeadline" boolean default false,
  created_at timestamp with time zone default now(),
  media_key text,
  storage_provider text default 'legacy'
);
alter table public.events add column if not exists orientation text default 'landscape';
alter table public.events add column if not exists meeting_link text;
alter table public.events add column if not exists is_online boolean default false;
alter table public.events add column if not exists registration_link text;
alter table public.events add column if not exists description text;
alter table public.events add column if not exists deadline text;
alter table public.events add column if not exists "showTime" boolean default true;
alter table public.events add column if not exists "showDeadline" boolean default false;
alter table public.events add column if not exists media_key text;
alter table public.events add column if not exists storage_provider text default 'legacy';

-- 3.6 NAV DATA
create table if not exists public.nav_data (
  id text primary key,
  date text,
  value numeric,
  created_at timestamp with time zone default now(),
  nifty50 numeric
);
alter table public.nav_data add column if not exists nifty50 numeric;

-- 3.7 NIF METRICS
create table if not exists public.nif_metrics (
  id text primary key,
  annualized_return text,
  total_aum text,
  ytd_return text,
  asset_allocation jsonb default '[]',
  updated_at timestamp with time zone default now(),
  is_auto_return boolean default false,
  fund_units text
);
alter table public.nif_metrics add column if not exists is_auto_return boolean default false;
alter table public.nif_metrics add column if not exists fund_units text;

-- Seed NIF Metrics safely
insert into public.nif_metrics (id, annualized_return, total_aum, ytd_return, fund_units, is_auto_return, asset_allocation)
values ('metrics', '0', '0', '0', '0', false, '[]'::jsonb)
on conflict (id) do nothing;

-- 3.8 NOTICES
create table if not exists public.notices (
  id text primary key,
  title text,
  category text,
  content text,
  date text,
  time text,
  expiry_date text,
  image_url text,
  link text,
  link_label text,
  created_at timestamp with time zone default now(),
  media_key text,
  storage_provider text default 'legacy'
);
alter table public.notices add column if not exists time text;
alter table public.notices add column if not exists media_key text;
alter table public.notices add column if not exists storage_provider text default 'legacy';

-- 3.9 RESOURCES
create table if not exists public.resources (
  id uuid default gen_random_uuid() primary key,
  title text,
  description text,
  type text,
  url text,
  cover_image text,
  date date default current_date,
  created_at timestamp with time zone default now(),
  parent_id uuid references public.resources(id) on delete cascade
);
alter table public.resources add column if not exists parent_id uuid references public.resources(id) on delete cascade;
alter table public.resources drop constraint if exists resources_type_check;
alter table public.resources add constraint resources_type_check check (type in ('file', 'link', 'folder'));

-- 3.10 HALL OF FAME
create table if not exists public.hall_of_fame (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text,
  batch text not null,
  image_url text,
  linkedin text,
  email text,
  display_order int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  media_key text,
  storage_provider text default 'legacy'
);
alter table public.hall_of_fame add column if not exists media_key text;
alter table public.hall_of_fame add column if not exists storage_provider text default 'legacy';

-- 3.11 REDEMPTION CARDS
create table if not exists public.redemption_cards (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  display_order int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) & POLICIES
-- ============================================

-- Clean up any existing policies (under any name) on public tables to prevent conflicts
DO $$ 
DECLARE
    t text;
    pol record;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN (
            'hero_slides', 'about_content', 'about_sections', 'team_members', 
            'magazines', 'events', 'nav_data', 'nif_metrics', 'site_settings', 
            'notices', 'resources', 'hall_of_fame', 'redemption_cards', 
            'nif_investments', 'trading_days'
          )
    LOOP
        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' 
              AND tablename = t
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
        END LOOP;
    END LOOP;
END $$;

alter table public.hero_slides enable row level security;
alter table public.about_content enable row level security;
alter table public.team_members enable row level security;
alter table public.magazines enable row level security;
alter table public.events enable row level security;
alter table public.nav_data enable row level security;
alter table public.nif_metrics enable row level security;
alter table public.notices enable row level security;
alter table public.resources enable row level security;
alter table public.hall_of_fame enable row level security;
alter table public.redemption_cards enable row level security;

-- HERO
create policy "Public Read Hero" on public.hero_slides for select using (true);
create policy "Admin Write Hero" on public.hero_slides for insert with check (auth.role() = 'authenticated');
create policy "Admin Update Hero" on public.hero_slides for update using (auth.role() = 'authenticated');
create policy "Admin Delete Hero" on public.hero_slides for delete using (auth.role() = 'authenticated');

-- ABOUT
create policy "Public Read About" on public.about_content for select using (true);
create policy "Admin Write About" on public.about_content for insert with check (auth.role() = 'authenticated');
create policy "Admin Update About" on public.about_content for update using (auth.role() = 'authenticated');

-- TEAM
create policy "Public Read Team" on public.team_members for select using (true);
create policy "Admin Write Team" on public.team_members for insert with check (auth.role() = 'authenticated');
create policy "Admin Update Team" on public.team_members for update using (auth.role() = 'authenticated');
create policy "Admin Delete Team" on public.team_members for delete using (auth.role() = 'authenticated');

-- MAGAZINES
create policy "Public Read Magazines" on public.magazines for select using (true);
create policy "Admin Write Magazines" on public.magazines for insert with check (auth.role() = 'authenticated');
create policy "Admin Update Magazines" on public.magazines for update using (auth.role() = 'authenticated');
create policy "Admin Delete Magazines" on public.magazines for delete using (auth.role() = 'authenticated');

-- EVENTS
create policy "Public Read Events" on public.events for select using (true);
create policy "Admin Write Events" on public.events for insert with check (auth.role() = 'authenticated');
create policy "Admin Update Events" on public.events for update using (auth.role() = 'authenticated');
create policy "Admin Delete Events" on public.events for delete using (auth.role() = 'authenticated');

-- NAV
create policy "Public Read NAV" on public.nav_data for select using (true);
create policy "Admin Write NAV" on public.nav_data for insert with check (auth.role() = 'authenticated');
create policy "Admin Update NAV" on public.nav_data for update using (auth.role() = 'authenticated');
create policy "Admin Delete NAV" on public.nav_data for delete using (auth.role() = 'authenticated');

-- NIF
create policy "Public Read NIF" on public.nif_metrics for select using (true);
create policy "Admin Write NIF" on public.nif_metrics for insert with check (auth.role() = 'authenticated');
create policy "Admin Update NIF" on public.nif_metrics for update using (auth.role() = 'authenticated');

-- NOTICES
create policy "Public Read Notices" on public.notices for select using (true);
create policy "Admin Write Notices" on public.notices for insert with check (auth.role() = 'authenticated');
create policy "Admin Update Notices" on public.notices for update using (auth.role() = 'authenticated');
create policy "Admin Delete Notices" on public.notices for delete using (auth.role() = 'authenticated');

-- RESOURCES
create policy "Allow public read access" on public.resources for select using (true);
create policy "Allow authenticated insert" on public.resources for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated update" on public.resources for update using (auth.role() = 'authenticated');
create policy "Allow authenticated delete" on public.resources for delete using (auth.role() = 'authenticated');

-- HALL OF FAME
create policy "Public Read HallOfFame" on public.hall_of_fame for select using (true);
create policy "Admin Write HallOfFame" on public.hall_of_fame for insert with check (auth.role() = 'authenticated');
create policy "Admin Update HallOfFame" on public.hall_of_fame for update using (auth.role() = 'authenticated');
create policy "Admin Delete HallOfFame" on public.hall_of_fame for delete using (auth.role() = 'authenticated');

-- REDEMPTION CARDS
create policy "Public Read RedemptionCards" on public.redemption_cards for select using (true);
create policy "Admin Write RedemptionCards" on public.redemption_cards for insert with check (auth.role() = 'authenticated');
create policy "Admin Update RedemptionCards" on public.redemption_cards for update using (auth.role() = 'authenticated');
create policy "Admin Delete RedemptionCards" on public.redemption_cards for delete using (auth.role() = 'authenticated');

-- ============================================
-- 5. INDEXES
-- ============================================
create index if not exists idx_hall_of_fame_batch on public.hall_of_fame(batch desc);
create index if not exists idx_hall_of_fame_order on public.hall_of_fame(display_order);
create index if not exists idx_redemption_cards_order on public.redemption_cards(display_order);
create index if not exists idx_resources_parent on public.resources(parent_id);

-- ============================================
-- 6. ADDITIONAL UPDATES & NEW TABLES
-- ============================================

-- Update the tagline for all hero slides to the correct text
UPDATE public.hero_slides
SET tagline = 'The Finance and Investment Club of IIM Shillong'
WHERE tagline = 'The Investment and Finance Club of IIM Shillong' OR tagline IS NULL;

-- Create table for NIF investments (one date and NAV value per year)
CREATE TABLE IF NOT EXISTS public.nif_investments (
  year INTEGER PRIMARY KEY,
  investment_date DATE NOT NULL,
  nav_value NUMERIC(10, 4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.nif_investments ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all users (needed for the NIF returns calculator page)
DROP POLICY IF EXISTS "Allow public read access" ON public.nif_investments;
CREATE POLICY "Allow public read access" ON public.nif_investments
  FOR SELECT USING (true);

-- Allow authenticated admin write access (ALL operations for managing from the admin panel)
DROP POLICY IF EXISTS "Allow admin write access" ON public.nif_investments;
CREATE POLICY "Allow admin write access" ON public.nif_investments
  FOR ALL USING (auth.role() = 'authenticated');

-- 6.1 TRADING DAYS
CREATE TABLE IF NOT EXISTS public.trading_days (
    year INTEGER PRIMARY KEY,
    days INTEGER NOT NULL DEFAULT 252
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.trading_days ENABLE ROW LEVEL SECURITY;

-- Public Read Access Policy (allows anyone to view trading days)
DROP POLICY IF EXISTS "Public Read Access" ON public.trading_days;
CREATE POLICY "Public Read Access" ON public.trading_days 
    FOR SELECT USING (true);

-- Admin Write Access Policy (requires authenticated admin session to insert/edit/delete)
DROP POLICY IF EXISTS "Admin Write Access" ON public.trading_days;
CREATE POLICY "Admin Write Access" ON public.trading_days 
    FOR ALL USING (auth.role() = 'authenticated');

-- Pre-populate default trading days (252) for 2022 to 2026
INSERT INTO public.trading_days (year, days)
VALUES 
    (2022, 252),
    (2023, 252),
    (2024, 252),
    (2025, 252),
    (2026, 252)
ON CONFLICT (year) DO NOTHING;


-- =====================================================================
-- 7. STORAGE SETUP & STORAGE RLS POLICIES
-- =====================================================================

-- Ensure the public 'niveshak-assets' storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('niveshak-assets', 'niveshak-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Clean up any existing storage policies
DROP POLICY IF EXISTS "Allow public storage read" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin storage insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin storage delete" ON storage.objects;

-- Create storage bucket access policies
CREATE POLICY "Allow public storage read" ON storage.objects
  FOR SELECT USING (bucket_id = 'niveshak-assets');

CREATE POLICY "Allow admin storage insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'niveshak-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Allow admin storage delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'niveshak-assets' AND auth.role() = 'authenticated');


-- =====================================================================
-- 8. REALTIME ENABLEMENT
-- =====================================================================

-- Safely add all tables to the supabase_realtime publication
DO $$
DECLARE
    tbl text;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOR tbl IN SELECT unnest(ARRAY[
            'events', 'magazines', 'notices', 'resources', 'team_members', 
            'hero_slides', 'about_sections', 'nav_data', 'nif_metrics', 
            'site_settings', 'hall_of_fame', 'redemption_cards', 'nif_investments', 'trading_days'
        ]) LOOP
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' AND tablename = tbl
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
            END IF;
        END LOOP;
    END IF;
END $$;
