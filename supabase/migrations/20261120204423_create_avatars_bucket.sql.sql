/*
# Public avatars storage bucket

1. Storage
- Creates the `avatars` bucket (public read) for user-uploaded altar avatars,
  limited to image files up to 2 MiB.
2. Security
- Public SELECT policy on `avatars/objects` so avatars load by public URL.
- Public INSERT/UPDATE/DELETE policies so the no-sign-in frontend can upload
  and replace avatars through the anon-key client.
3. Notes
- Idempotent: bucket and policies are only created when missing.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/png','image/jpeg','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public read avatars" ON storage.objects;
CREATE POLICY "public read avatars" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "public insert avatars" ON storage.objects;
CREATE POLICY "public insert avatars" ON storage.objects
FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "public update avatars" ON storage.objects;
CREATE POLICY "public update avatars" ON storage.objects
FOR UPDATE TO anon, authenticated USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "public delete avatars" ON storage.objects;
CREATE POLICY "public delete avatars" ON storage.objects
FOR DELETE TO anon, authenticated USING (bucket_id = 'avatars');