/*
# Fix documents storage bucket upload policy

## Problem
The app uses custom auth (Neon database with password_hash), NOT Supabase Auth.
The previous upload policy was scoped to `TO authenticated` only, meaning requests
made with the anon key (which is what the frontend uses) were rejected with
"new row violates row-level security policy".

## Fix
- Drop the old "Authenticated users can upload documents" INSERT policy.
- Create a new INSERT policy scoped to `TO anon, authenticated` so the anon-key
  frontend client can upload files to the documents bucket.
- Keep public read and owner-scoped delete policies unchanged.
*/

DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "anon_authenticated_can_upload_documents" ON storage.objects;

CREATE POLICY "anon_authenticated_can_upload_documents"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'documents');
