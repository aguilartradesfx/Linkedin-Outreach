-- ─────────────────────────────────────────────────────────
-- Bralto Admin Panel — Schema additions
-- Run this in the Supabase SQL editor
-- ─────────────────────────────────────────────────────────

-- ── 1. Solicitudes de propuesta ──────────────────────────
CREATE TABLE IF NOT EXISTS proposal_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name     text NOT NULL,
  client_company  text,
  client_email    text,
  client_phone    text,
  client_industry text,
  services        text[]     NOT NULL DEFAULT '{}',
  notes           text,
  budget_range    text       DEFAULT 'no_definido',   -- 'menos_500' | '500_1500' | '1500_3000' | 'mas_3000' | 'no_definido'
  timeline        text       DEFAULT 'flexible',       -- 'urgente' | '1_mes' | '2_3_meses' | 'flexible'
  submitted_by    uuid       REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to     uuid       REFERENCES auth.users(id) ON DELETE SET NULL,
  status          text       DEFAULT 'pendiente',      -- 'pendiente' | 'en_revision' | 'propuesta_enviada' | 'ganado' | 'perdido'
  priority        text       DEFAULT 'normal',         -- 'baja' | 'normal' | 'alta' | 'urgente'
  internal_notes  text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE proposal_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view and create proposals
CREATE POLICY "Authenticated users can read proposals"
  ON proposal_requests FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can create proposals"
  ON proposal_requests FOR INSERT
  TO authenticated WITH CHECK (true);

-- Only the submitter or admins can update
CREATE POLICY "Authenticated users can update proposals"
  ON proposal_requests FOR UPDATE
  TO authenticated USING (true);

-- ── 2. Perfiles de usuario y permisos ────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             text,
  role                  text    DEFAULT 'viewer',   -- 'admin' | 'sales' | 'viewer'
  is_admin              boolean DEFAULT false,
  -- Section permissions
  can_view_contracts    boolean DEFAULT false,
  can_manage_contracts  boolean DEFAULT false,
  can_view_clients      boolean DEFAULT false,
  can_manage_clients    boolean DEFAULT false,
  can_submit_proposals  boolean DEFAULT true,
  can_view_proposals    boolean DEFAULT false,
  can_view_linkedin     boolean DEFAULT false,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles (needed to show names), only update their own
CREATE POLICY "Authenticated users can read profiles"
  ON user_profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id);

-- Service role (admin API) can do everything
CREATE POLICY "Service role full access profiles"
  ON user_profiles FOR ALL
  TO service_role USING (true);

CREATE POLICY "Service role full access proposals"
  ON proposal_requests FOR ALL
  TO service_role USING (true);

-- ── 3. Trigger: auto-create user_profile on signup ───────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
