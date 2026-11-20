/*
# Harden altar_entries: admin RPC functions + deny direct UPDATE/DELETE

1. New Functions (all SECURITY DEFINER, search_path pinned to public)
- `check_admin_password(pass text)` — returns true when the password matches
  the stored admin password. Used by the admin lock screen.
- `admin_update_entry(pass text, entry_id uuid, new_constellation int,
  new_refinement int, new_icon text, new_message text)` — verifies the admin
  password inside the database, validates the new values, updates the entry
  and returns the updated row.
- `admin_delete_entry(pass text, entry_id uuid)` — verifies the admin password
  inside the database and deletes the entry.
2. Security changes
- altar_entries RLS: anon/authenticated keep SELECT and INSERT only.
  Direct UPDATE and DELETE through the Data API are now fully denied —
  the policies are dropped and the table grants revoked. Row changes are
  only possible through the password-checked RPC functions above.
- INSERT policy now validates input: uid_suffix must be exactly 4 digits,
  constellation 0..6, refinement 0..5, message at most 120 characters.
- RPC EXECUTE is revoked from PUBLIC and granted explicitly to
  anon + authenticated (the app has no sign-in; the password is the check).
3. Notes
- All functions are idempotent (CREATE OR REPLACE) and raise generic
  exceptions so no schema detail leaks to callers.
*/

CREATE OR REPLACE FUNCTION public.check_admin_password(pass text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pass IS NOT NULL AND pass = '085611882398';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_entry(
  pass text,
  entry_id uuid,
  new_constellation int,
  new_refinement int,
  new_icon text,
  new_message text
)
RETURNS public.altar_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated public.altar_entries;
BEGIN
  IF pass IS NULL OR pass <> '085611882398' THEN
    RAISE EXCEPTION 'Доступ запрещён';
  END IF;
  IF new_constellation < 0 OR new_constellation > 6
     OR new_refinement < 0 OR new_refinement > 5 THEN
    RAISE EXCEPTION 'Недопустимые значения';
  END IF;
  IF new_message IS NOT NULL AND char_length(new_message) > 120 THEN
    RAISE EXCEPTION 'Недопустимые значения';
  END IF;
  UPDATE public.altar_entries
    SET constellation = new_constellation,
        refinement = new_refinement,
        icon = new_icon,
        message = new_message
  WHERE id = entry_id
  RETURNING * INTO updated;
  IF updated IS NULL THEN
    RAISE EXCEPTION 'Запись не найдена';
  END IF;
  RETURN updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_entry(pass text, entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pass IS NULL OR pass <> '085611882398' THEN
    RAISE EXCEPTION 'Доступ запрещён';
  END IF;
  DELETE FROM public.altar_entries WHERE id = entry_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_admin_password(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_entry(text, uuid, int, int, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_entry(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_admin_password(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_entry(text, uuid, int, int, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_entry(text, uuid) TO anon, authenticated;

-- Direct row edits through the Data API are closed; admins use the RPCs.
DROP POLICY IF EXISTS "anon_update_altar_entries" ON public.altar_entries;
DROP POLICY IF EXISTS "anon_delete_altar_entries" ON public.altar_entries;
REVOKE UPDATE, DELETE ON public.altar_entries FROM anon, authenticated;

DROP POLICY IF EXISTS "anon_insert_altar_entries" ON public.altar_entries;
CREATE POLICY "anon_insert_altar_entries" ON public.altar_entries
FOR INSERT TO anon, authenticated
WITH CHECK (
  uid_suffix ~ '^[0-9]{4}$'
  AND constellation BETWEEN 0 AND 6
  AND refinement BETWEEN 0 AND 5
  AND (message IS NULL OR char_length(message) <= 120)
);