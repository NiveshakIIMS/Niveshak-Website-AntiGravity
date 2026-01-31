# Niveshak Website: Supabase & Vercel Integration Guide

## 🟢 Readiness Status
**Frontend (UI/UX)**: ✅ **READY**
- The design, responsiveness, and components (Events, Team, Magazines) are polished and complete.
- The Admin Dashboard UI is fully functional.

**Backend (Data)**: 🟡 **NEEDS MIGRATION**
- Currently uses `localStorage` (Mock Data).
- **Action Required**: Replace `dataService.ts` with Supabase Client calls.

**Authentication**: 🟡 **NEEDS MIGRATION**
- Currently uses `mockAuth`.
- **Action Required**: Integrate Supabase Auth (Google/Email Login) for the Admin Panel.

---

## 1. Supabase Setup (Database Schema)

You will need to create a new Supabase project and run the following SQL in the **SQL Editor** to create the tables matching our data structure.

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Hero Slides Table
create table hero_slides (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  subtitle text,
  image_url text not null,
  object_fit text default 'cover',
  timer int default 5,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Team Members Table
create table team_members (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  role text not null,
  image_url text,
  email text,
  linkedin text,
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Magazines Table
create table magazines (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  issue_month text not null,
  issue_year text not null,
  cover_url text,
  pdf_url text,
  flip_url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Events Table
create table events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  date date not null,
  time text not null,
  location text not null,
  type text check (type in ('Upcoming', 'Live', 'Past')),
  image_url text,
  orientation text default 'landscape', -- 'landscape' or 'portrait'
  meeting_link text,
  is_online boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Enable Row Level Security (RLS)
alter table hero_slides enable row level security;
alter table team_members enable row level security;
alter table magazines enable row level security;
alter table events enable row level security;

-- Public Read Access Policy
create policy "Public Read Access" on hero_slides for select using (true);
create policy "Public Read Access" on team_members for select using (true);
create policy "Public Read Access" on magazines for select using (true);
create policy "Public Read Access" on events for select using (true);

-- Admin Write Access (Requires Authentication)
-- (You will restrict this to specific emails later)
create policy "Admin Write Access" on hero_slides for all using (auth.role() = 'authenticated');
create policy "Admin Write Access" on team_members for all using (auth.role() = 'authenticated');
create policy "Admin Write Access" on magazines for all using (auth.role() = 'authenticated');
create policy "Admin Write Access" on events for all using (auth.role() = 'authenticated');
```

---

## 2. Supabase Storage (Images)

1.  Go to **Storage** in Supabase sidebar.
2.  Create a new bucket named `niveshak-assets`.
3.  Set it to **Public**.
4.  This is where `Admin` image uploads will go.

---

## 3. Code Integration Steps

We will need to perform the following code changes:

1.  **Install SDK**:
    ```bash
    npm install @supabase/supabase-js
    ```

2.  **Environment Variables**:
    Create `.env.local` with your Supabase keys:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your-project-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    ```

3.  **Refactor `dataService.ts`**:
    Currently, `dataService` reads from LocalStorage. We will rewrite it to:
    ```typescript
    // Example of new dataService structure
    export const dataService = {
        getEvents: async () => {
             const { data } = await supabase.from('events').select('*');
             return data;
        },
        // ...
    }
    ```

---

## 4. Vercel Deployment

1.  Push this code to a **GitHub Repository**.
2.  Go to [Vercel](https://vercel.com) -> **Add New Project**.
3.  Import your GitHub repo.
4.  In **Environment Variables**, add the same Supabase keys:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5.  Click **Deploy**.

## 🚀 Summary
The project is **structurally ready**. The only missing piece is the "Wiring" to the real database.
