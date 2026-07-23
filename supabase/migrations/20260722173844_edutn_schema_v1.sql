/*
# EduTN - Full Schema v1

## Overview
Creates the complete schema for EduTN, a Tunisian secondary education document-sharing platform.

## New Tables (in creation order)
1. roles - role definitions (student, teacher, admin)
2. subjects - Tunisian secondary subjects
3. grades - education years (1st-4th secondary)
4. streams - academic streams
5. categories - document categories
6. tags - tag definitions
7. users - extended user profiles (links to auth.users)
8. teachers - teacher profiles
9. documents - uploaded PDFs with metadata
10. downloads - download history
11. favorites - user bookmarks
12. comments - document comments
13. ratings - document ratings (1-5)
14. notifications - user notifications
15. document_tags - many-to-many documents/tags
16. reports - document reports
17. activity_logs - audit trail

## Security
- RLS enabled on all tables.
- Public read on reference data.
- Owner-scoped CRUD on user-specific tables.
*/

-- Reference tables first (no FK dependencies on users)

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  color text,
  description text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  level int DEFAULT 0,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Now users (can reference grades, streams, roles)

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  role_id uuid REFERENCES roles(id),
  grade_id uuid REFERENCES grades(id),
  stream_id uuid REFERENCES streams(id),
  bio text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Teachers (references users + subjects)

CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  avatar_url text,
  bio text,
  subject_id uuid REFERENCES subjects(id),
  is_verified boolean DEFAULT false,
  badges text[] DEFAULT '{}',
  follower_count int DEFAULT 0,
  document_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Documents (references subjects, grades, streams, teachers, categories, users)

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  file_type text DEFAULT 'pdf',
  thumbnail_url text,
  subject_id uuid REFERENCES subjects(id),
  grade_id uuid REFERENCES grades(id),
  stream_id uuid REFERENCES streams(id),
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id),
  document_type text DEFAULT 'lesson',
  trimester int DEFAULT 1,
  year int,
  status text DEFAULT 'pending',
  download_count int DEFAULT 0,
  view_count int DEFAULT 0,
  like_count int DEFAULT 0,
  rating_avg numeric(3,2) DEFAULT 0,
  rating_count int DEFAULT 0,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_subject ON documents(subject_id);
CREATE INDEX IF NOT EXISTS idx_documents_grade ON documents(grade_id);
CREATE INDEX IF NOT EXISTS idx_documents_stream ON documents(stream_id);
CREATE INDEX IF NOT EXISTS idx_documents_teacher ON documents(teacher_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_downloads ON documents(download_count DESC);

-- User activity tables

CREATE TABLE IF NOT EXISTS downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_document ON downloads(document_id);

CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_document ON comments(document_id);

CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  score int NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_document ON ratings(document_id);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

CREATE TABLE IF NOT EXISTS document_tags (
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- roles: public read
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_roles" ON roles;
CREATE POLICY "read_roles" ON roles FOR SELECT TO anon, authenticated USING (true);

-- subjects: public read, auth write
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_subjects" ON subjects;
CREATE POLICY "read_subjects" ON subjects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "write_subjects" ON subjects;
CREATE POLICY "write_subjects" ON subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- grades: public read, auth write
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_grades" ON grades;
CREATE POLICY "read_grades" ON grades FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "write_grades" ON grades;
CREATE POLICY "write_grades" ON grades FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- streams: public read, auth write
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_streams" ON streams;
CREATE POLICY "read_streams" ON streams FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "write_streams" ON streams;
CREATE POLICY "write_streams" ON streams FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- categories: public read, auth write
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_categories" ON categories;
CREATE POLICY "read_categories" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "write_categories" ON categories;
CREATE POLICY "write_categories" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- tags: public read, auth write
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_tags" ON tags;
CREATE POLICY "read_tags" ON tags FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "write_tags" ON tags;
CREATE POLICY "write_tags" ON tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- users: owner-scoped
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_user" ON users;
CREATE POLICY "select_own_user" ON users FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_user" ON users;
CREATE POLICY "insert_own_user" ON users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_user" ON users;
CREATE POLICY "update_own_user" ON users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- teachers: public read, owner write
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_teachers" ON teachers;
CREATE POLICY "read_teachers" ON teachers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_teacher" ON teachers;
CREATE POLICY "insert_own_teacher" ON teachers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_teacher" ON teachers;
CREATE POLICY "update_own_teacher" ON teachers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- documents: public read approved, owner CRUD
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_approved_documents" ON documents;
CREATE POLICY "read_approved_documents" ON documents FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR uploaded_by = auth.uid());
DROP POLICY IF EXISTS "insert_own_document" ON documents;
CREATE POLICY "insert_own_document" ON documents FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());
DROP POLICY IF EXISTS "update_own_document" ON documents;
CREATE POLICY "update_own_document" ON documents FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid()) WITH CHECK (uploaded_by = auth.uid());
DROP POLICY IF EXISTS "delete_own_document" ON documents;
CREATE POLICY "delete_own_document" ON documents FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- downloads: owner-scoped
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_downloads" ON downloads;
CREATE POLICY "select_own_downloads" ON downloads FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_downloads" ON downloads;
CREATE POLICY "insert_own_downloads" ON downloads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_downloads" ON downloads;
CREATE POLICY "delete_own_downloads" ON downloads FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- favorites: owner-scoped
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_favorites" ON favorites;
CREATE POLICY "select_own_favorites" ON favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_favorites" ON favorites;
CREATE POLICY "insert_own_favorites" ON favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_favorites" ON favorites;
CREATE POLICY "delete_own_favorites" ON favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- comments: public read approved, owner CRUD
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_comments" ON comments;
CREATE POLICY "read_comments" ON comments FOR SELECT TO anon, authenticated USING (is_approved = true OR auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_comment" ON comments;
CREATE POLICY "insert_own_comment" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_comment" ON comments;
CREATE POLICY "update_own_comment" ON comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_comment" ON comments;
CREATE POLICY "delete_own_comment" ON comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ratings: public read, owner write
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_ratings" ON ratings;
CREATE POLICY "read_ratings" ON ratings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_rating" ON ratings;
CREATE POLICY "insert_own_rating" ON ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_rating" ON ratings;
CREATE POLICY "update_own_rating" ON ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_rating" ON ratings;
CREATE POLICY "delete_own_rating" ON ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- notifications: owner-scoped
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- document_tags: public read, auth write
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_document_tags" ON document_tags;
CREATE POLICY "read_document_tags" ON document_tags FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "write_document_tags" ON document_tags;
CREATE POLICY "write_document_tags" ON document_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- reports: owner insert/select
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insert_own_report" ON reports;
CREATE POLICY "insert_own_report" ON reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "select_own_report" ON reports;
CREATE POLICY "select_own_report" ON reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

-- activity_logs: owner-scoped
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_activity" ON activity_logs;
CREATE POLICY "select_own_activity" ON activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_activity" ON activity_logs;
CREATE POLICY "insert_own_activity" ON activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
