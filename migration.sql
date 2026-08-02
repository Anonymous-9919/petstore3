-- ============================================
-- Antigravity: Database Schema for Website Builder
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. PROFILES (extends Supabase built-in auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 2. WEBSITES (core table for user-created websites)
CREATE TABLE websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  template TEXT DEFAULT 'blank',
  published BOOLEAN DEFAULT false,
  custom_domain TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE websites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own websites"
  ON websites FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view published websites"
  ON websites FOR SELECT
  USING (published = true);

-- 3. PAGES (each website has multiple pages)
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content JSONB DEFAULT '[]',
  seo_description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(website_id, slug)
);

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD pages on their websites"
  ON pages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = pages.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view pages of published websites"
  ON pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = pages.website_id
      AND websites.published = true
    )
  );

-- 4. ASSETS (files uploaded per website)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage assets on their websites"
  ON assets FOR ALL
  USING (auth.uid() = user_id);

-- 5. SITE_SETTINGS (per-website configuration)
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID UNIQUE NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  theme JSONB DEFAULT '{}',
  fonts JSONB DEFAULT '[]',
  custom_css TEXT,
  custom_js TEXT,
  analytics_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage settings for their websites"
  ON site_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = site_settings.website_id
      AND websites.user_id = auth.uid()
    )
  );

-- 6. GENERATIONS (track AI content generations per user)
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT DEFAULT 'gemini-2.5-flash',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generations"
  ON generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations"
  ON generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_generations_user_id ON generations(user_id);

-- Auto-create site_settings when a website is created
CREATE OR REPLACE FUNCTION handle_new_website()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.site_settings (website_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_website_created
  AFTER INSERT ON websites
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_website();

-- Indexes
CREATE INDEX idx_websites_user_id ON websites(user_id);
CREATE INDEX idx_websites_slug ON websites(slug);
CREATE INDEX idx_pages_website_id ON pages(website_id);
CREATE INDEX idx_assets_website_id ON assets(website_id);
CREATE INDEX idx_assets_user_id ON assets(user_id);

-- 7. CONTACTS (contact form submissions)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contacts"
  ON contacts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can view contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (true);
