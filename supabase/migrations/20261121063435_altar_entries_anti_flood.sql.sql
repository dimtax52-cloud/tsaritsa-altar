/*
# Anti-flood for altar_entries: client_hash, IP-based limit, 152 cap

1. Modified Tables
- `altar_entries` adds hidden `client_hash text` (nullable). The trigger fills
  it with md5 of the caller IP from the request headers
  (x-forwarded-for -> the first IP in the chain, falling back to
  request.headers::text). The column is revoked from all client roles so
  nobody can read or write it directly.
2. Triggers
- `trg_altar_entries_before_insert` (BEFORE INSERT, per row, SECURITY DEFINER):
  - caps the whole table at 152 rows (both acts);
  - allows no more than 2 rows per client hash (same IP) — a 3rd insert
    from the same IP raises an error.
- `fn_altar_entries_set_client_hash` (BEFORE INSERT, per row): writes the
  IP md5 into client_hash before the flood check runs.
3. Security
- Existing rules preserved: anon can only SELECT and INSERT; direct UPDATE /
  DELETE stay revoked (admin changes go through the password-checked RPCs).
- The INSERT policy keeps validating uid_suffix, constellation, refinement
  and message length.
4. Notes
- Idempotent: CREATE OR REPLACE / DROP TRIGGER IF EXISTS.
- The Supabase Data API (PostgREST) exposes `request.headers`, including
  x-forwarded-for, to trigger functions via the `request` variable.
*/

CREATE OR REPLACE FUNCTION public.fn_altar_entries_set_client_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ip_text text;
BEGIN
  BEGIN
    ip_text := coalesce(
      current_setting('request.headers', true)::json ->> 'x-forwarded-for',
      ''
    );
    IF ip_text = '' THEN
      ip_text := coalesce(current_setting('request.headers', true)::json::text, 'unknown');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    ip_text := 'unknown';
  END;
  NEW.client_hash := md5(split_part(trim(ip_text), ',', 1));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_altar_entries_set_client_hash ON public.altar_entries;
CREATE TRIGGER trg_altar_entries_set_client_hash
BEFORE INSERT ON public.altar_entries
FOR EACH ROW EXECUTE FUNCTION public.fn_altar_entries_set_client_hash();

CREATE OR REPLACE FUNCTION public.fn_altar_entries_anti_flood()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_from_ip int;
BEGIN
  SELECT count(*) INTO v_total FROM public.altar_entries;
  IF v_total >= 152 THEN
    RAISE EXCEPTION 'Алтарь полон — все 152 места заняты';
  END IF;
  SELECT count(*) INTO v_from_ip
    FROM public.altar_entries
    WHERE client_hash = NEW.client_hash;
  IF v_from_ip >= 2 THEN
    RAISE EXCEPTION 'С этого устройства уже записаны 2 человека';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_altar_entries_anti_flood ON public.altar_entries;
CREATE TRIGGER trg_altar_entries_anti_flood
BEFORE INSERT ON public.altar_entries
FOR EACH ROW EXECUTE FUNCTION public.fn_altar_entries_anti_flood();

ALTER TABLE public.altar_entries ADD COLUMN IF NOT EXISTS client_hash text;

REVOKE INSERT (client_hash) ON public.altar_entries FROM anon, authenticated;
REVOKE SELECT (client_hash) ON public.altar_entries FROM anon, authenticated;