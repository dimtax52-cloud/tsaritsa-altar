/*
# Admin update: allow changing or clearing the avatar

1. Modified functions
- `public.admin_update_entry` gains an optional parameter
  `new_avatar_url text DEFAULT NULL`.
2. Behavior
- NULL (default) leaves `avatar_url` unchanged.
- A non-empty string sets `avatar_url` to that value (data URL or image link).
- An empty string clears `avatar_url` and resets `icon` handling on the client side.
3. Security
- The function stays SECURITY DEFINER with a fixed search_path and the same
  admin password check; no grants change.
*/

CREATE OR REPLACE FUNCTION public.admin_update_entry(
  pass text,
  entry_id uuid,
  new_constellation integer,
  new_refinement integer,
  new_icon text,
  new_message text,
  new_avatar_url text DEFAULT NULL
)
RETURNS altar_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  IF new_avatar_url IS NOT NULL AND char_length(new_avatar_url) > 20000 THEN
    RAISE EXCEPTION 'Недопустимые значения';
  END IF;
  UPDATE public.altar_entries
  SET constellation = new_constellation,
      refinement = new_refinement,
      icon = new_icon,
      message = new_message,
      avatar_url = CASE
        WHEN new_avatar_url IS NULL THEN avatar_url
        WHEN new_avatar_url = '' THEN NULL
        ELSE new_avatar_url
      END
  WHERE id = entry_id
  RETURNING * INTO updated;
  IF updated IS NULL THEN
    RAISE EXCEPTION 'Запись не найдена';
  END IF;
  RETURN updated;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_update_entry(text, uuid, integer, integer, text, text, text) FROM PUBLIC, anon;
