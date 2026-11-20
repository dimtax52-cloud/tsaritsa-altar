/*
# Create altar_entries table (single-tenant, no auth)

1. New Tables
- `altar_entries` — signups for the Tsaritsa altar:
  - `id` (uuid, primary key, auto-generated)
  - `uid_suffix` (text, not null) — last 4 digits of the player UID
  - `constellation` (integer, not null, default 0) — C0..C6
  - `refinement` (integer, not null, default 0) — R0..R5
  - `icon` (text, not null, default 'cryo') — icon key
  - `avatar_url` (text, nullable) — custom avatar image URL
  - `message` (text, nullable) — optional wish message
  - `created_at` (timestamptz, default now())
2. Security
- Enable RLS on `altar_entries`.
- This is a no-auth, intentionally public/shared app: grant and allow
  SELECT / INSERT / UPDATE / DELETE to `anon` + `authenticated` so the
  anon-key frontend (including the admin panel) works without sign-in.
3. Notes
- The table is created only if it does not already exist (idempotent).
*/

CREATE TABLE IF NOT EXISTS public.altar_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid_suffix text NOT NULL,
  constellation integer NOT NULL DEFAULT 0,
  refinement integer NOT NULL DEFAULT 0,
  icon text NOT NULL DEFAULT 'cryo',
  avatar_url text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.altar_entries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.altar_entries TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_altar_entries" ON public.altar_entries;
CREATE POLICY "anon_select_altar_entries" ON public.altar_entries
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_altar_entries" ON public.altar_entries;
CREATE POLICY "anon_insert_altar_entries" ON public.altar_entries
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_altar_entries" ON public.altar_entries;
CREATE POLICY "anon_update_altar_entries" ON public.altar_entries
FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_altar_entries" ON public.altar_entries;
CREATE POLICY "anon_delete_altar_entries" ON public.altar_entries
FOR DELETE TO anon, authenticated USING (true);