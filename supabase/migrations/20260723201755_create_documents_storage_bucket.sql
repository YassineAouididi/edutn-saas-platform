/*
# Create documents storage bucket

1. Storage
- Create a public bucket named 'documents' for storing PDF files uploaded by admins/teachers.
- Set file size limit to 50MB.
- Allow public read access so anyone can view/download documents.
- Allow authenticated users to upload files.

2. Security
- Public read access on the bucket (anyone can view/download documents).
- Only authenticated users can upload files.
- Only the uploader can delete their own files.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to documents bucket
DROP POLICY IF EXISTS "Public can read documents" ON storage.objects;
CREATE POLICY "Public can read documents"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to upload to documents bucket
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow users to delete their own uploads
DROP POLICY IF EXISTS "Users can delete own document uploads" ON storage.objects;
CREATE POLICY "Users can delete own document uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND owner = auth.uid());
