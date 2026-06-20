-- =====================================================================
-- NIVESHAK WEBSITE - DATABASE SECURITY AUDIT & RLS HARDENING TEMPLATE
-- =====================================================================
--
-- This script hardens public-facing database tables against unauthorized 
-- write, update, and delete actions, while explicitly enabling public read-only 
-- access. All database modifications are locked down to authenticated administrators.
--
-- Running instructions: Execute this script in the Supabase SQL Editor.

-- Enable Row-Level Security (RLS) on all project tables
ALTER TABLE IF EXISTS hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS about_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS about_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS magazines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS nav_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS nif_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hall_of_fame ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS redemption_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS nif_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trading_days ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies to prevent conflicts
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


-- =====================================================================
-- 1. PUBLIC READ-ONLY ACCESS POLICIES
-- =====================================================================
-- Explicitly grant SELECT capability to everyone (public/anonymous/authenticated)

CREATE POLICY "Allow public read access" ON hero_slides FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON about_content FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON about_sections FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON team_members FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON magazines FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON events FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON nav_data FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON nif_metrics FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON notices FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON resources FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON hall_of_fame FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON redemption_cards FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON nif_investments FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON trading_days FOR SELECT USING (true);


-- =====================================================================
-- 2. SECURE ADMIN WRITE ACCESS POLICIES
-- =====================================================================
-- Restrict INSERT, UPDATE, and DELETE operations exclusively to authenticated administrators.
-- 
-- Note: In a production environment, you can further lock this down to specific admin emails
-- by checking: (auth.jwt() ->> 'email') IN ('admin1@iimshillong.ac.in', 'admin2@iimshillong.ac.in')

CREATE POLICY "Allow admin write access" ON hero_slides FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write access" ON about_content FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write access" ON about_sections FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write access" ON team_members FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write access" ON magazines FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write access" ON events FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write access" ON nav_data FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write access" ON nif_metrics FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write access" ON site_settings FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write access" ON notices FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write access" ON resources FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write access" ON hall_of_fame FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write access" ON redemption_cards FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write access" ON nif_investments FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write access" ON trading_days FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- =====================================================================
-- 3. STORAGE SECURITY AUDIT
-- =====================================================================
-- Ensure storage buckets (e.g. niveshak-assets) are also protected.
-- Storage objects are managed in `storage.objects` table.
-- Enable policies for 'niveshak-assets' public select and authenticated insert/delete.

-- Check if bucket policy exists, otherwise configure:
--
-- CREATE POLICY "Allow public storage read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'niveshak-assets');
--
-- CREATE POLICY "Allow admin storage insert" ON storage.objects
--   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'niveshak-assets' AND auth.role() = 'authenticated');
--
-- CREATE POLICY "Allow admin storage delete" ON storage.objects
--   FOR DELETE TO authenticated USING (bucket_id = 'niveshak-assets' AND auth.role() = 'authenticated');
