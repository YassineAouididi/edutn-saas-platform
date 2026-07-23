import pg from 'pg';

const connectionString = 'postgresql://neondb_owner:npg_6Jsb1oxTgwkl@ep-rough-mode-a2yza4v8-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new pg.Client({ connectionString });

const schemaSQL = `
-- Drop existing tables (safe since this is initial setup)
DROP TABLE IF EXISTS activity_logs, reports, document_tags, notifications, ratings, comments, favorites, downloads, documents, teachers, users, tags, categories, streams, grades, subjects, roles CASCADE;

-- Reference tables
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  color TEXT,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  level INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users (custom auth - password_hash stored here)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  grade_id UUID REFERENCES grades(id),
  stream_id UUID REFERENCES streams(id),
  bio TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Teachers
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  subject_id UUID REFERENCES subjects(id),
  is_verified BOOLEAN DEFAULT false,
  badges TEXT[] DEFAULT '{}',
  follower_count INT DEFAULT 0,
  document_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  file_type TEXT DEFAULT 'pdf',
  thumbnail_url TEXT,
  subject_id UUID REFERENCES subjects(id),
  grade_id UUID REFERENCES grades(id),
  stream_id UUID REFERENCES streams(id),
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id),
  document_type TEXT DEFAULT 'lesson',
  trimester INT DEFAULT 1,
  year INT,
  status TEXT DEFAULT 'pending',
  download_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_subject ON documents(subject_id);
CREATE INDEX idx_documents_grade ON documents(grade_id);
CREATE INDEX idx_documents_stream ON documents(stream_id);
CREATE INDEX idx_documents_teacher ON documents(teacher_id);
CREATE INDEX idx_documents_category ON documents(category_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created ON documents(created_at DESC);
CREATE INDEX idx_documents_downloads ON documents(download_count DESC);

-- User activity tables
CREATE TABLE downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_downloads_user ON downloads(user_id);
CREATE INDEX idx_downloads_document ON downloads(document_id);

CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, document_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_document ON comments(document_id);

CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, document_id)
);

CREATE INDEX idx_ratings_document ON ratings(document_id);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);

CREATE TABLE document_tags (
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);
`;

const seedSQL = `
-- Seed roles
INSERT INTO roles (name, description) VALUES
  ('student', 'Student user'),
  ('teacher', 'Teacher user'),
  ('admin', 'Administrator')
ON CONFLICT (name) DO NOTHING;

-- Seed subjects
INSERT INTO subjects (name, slug, icon, color, sort_order) VALUES
  ('Mathematics', 'mathematics', 'Calculator', '#2563eb', 1),
  ('Physics', 'physics', 'Atom', '#0ea5e9', 2),
  ('Computer Science', 'computer-science', 'LaptopCode', '#14b8a6', 3),
  ('Technology', 'technology', 'Cpu', '#f59e0b', 4),
  ('Science', 'science', 'FlaskConical', '#10b981', 5),
  ('Arabic', 'arabic', 'BookOpen', '#dc2626', 6),
  ('French', 'french', 'Languages', '#6366f1', 7),
  ('English', 'english', 'Languages', '#7c3aed', 8),
  ('History', 'history', 'Landmark', '#a16207', 9),
  ('Geography', 'geography', 'Globe', '#0891b2', 10),
  ('Economics', 'economics', 'TrendingUp', '#059669', 11),
  ('Philosophy', 'philosophy', 'Brain', '#9333ea', 12),
  ('Islamic Thinking', 'islamic-thinking', 'Moon', '#0d9488', 13),
  ('Spanish', 'spanish', 'Languages', '#e11d48', 14),
  ('German', 'german', 'Languages', '#b45309', 15),
  ('Italian', 'italian', 'Languages', '#16a34a', 16)
ON CONFLICT (name) DO NOTHING;

-- Seed grades
INSERT INTO grades (name, slug, level, sort_order) VALUES
  ('1st Secondary', '1st-secondary', 1, 1),
  ('2nd Secondary', '2nd-secondary', 2, 2),
  ('3rd Secondary', '3rd-secondary', 3, 3),
  ('4th Secondary (BAC)', '4th-secondary-bac', 4, 4)
ON CONFLICT (name) DO NOTHING;

-- Seed streams
INSERT INTO streams (name, slug, sort_order) VALUES
  ('Science', 'science', 1),
  ('Mathematics', 'mathematics', 2),
  ('Economics', 'economics', 3),
  ('Computer Science', 'computer-science', 4),
  ('Technical', 'technical', 5),
  ('Sports', 'sports', 6),
  ('Literature', 'literature', 7)
ON CONFLICT (name) DO NOTHING;

-- Seed categories
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Lessons', 'lessons', 1),
  ('Exercises', 'exercises', 2),
  ('Homework', 'homework', 3),
  ('Tests', 'tests', 4),
  ('Exams', 'exams', 5),
  ('Corrections', 'corrections', 6),
  ('Revision Sheets', 'revision-sheets', 7),
  ('Books', 'books', 8),
  ('Summaries', 'summaries', 9)
ON CONFLICT (name) DO NOTHING;

-- Seed tags
INSERT INTO tags (name, slug) VALUES
  ('BAC', 'bac'),
  ('Trimester 1', 'trimester-1'),
  ('Trimester 2', 'trimester-2'),
  ('Trimester 3', 'trimester-3'),
  ('Revision', 'revision'),
  ('Official Exam', 'official-exam'),
  ('Sample', 'sample'),
  ('Past Papers', 'past-papers')
ON CONFLICT (name) DO NOTHING;

-- Seed demo teachers (no user_id needed for demo)
INSERT INTO teachers (full_name, bio, subject_id, is_verified, badges, follower_count, document_count)
SELECT 'Mr. Ahmed Ben Salah', 'Experienced mathematics teacher with 15+ years preparing students for BAC.', id, true, ARRAY['Top Contributor', 'Verified Educator'], 1250, 45
FROM subjects WHERE slug = 'mathematics';

INSERT INTO teachers (full_name, bio, subject_id, is_verified, badges, follower_count, document_count)
SELECT 'Mrs. Leila Trabelsi', 'Physics and chemistry specialist, author of multiple revision guides.', id, true, ARRAY['Verified Educator', 'Expert'], 980, 38
FROM subjects WHERE slug = 'physics';

INSERT INTO teachers (full_name, bio, subject_id, is_verified, badges, follower_count, document_count)
SELECT 'Mr. Karim Mansouri', 'Computer science teacher passionate about programming education.', id, true, ARRAY['Top Contributor'], 750, 28
FROM subjects WHERE slug = 'computer-science';

INSERT INTO teachers (full_name, bio, subject_id, is_verified, badges, follower_count, document_count)
SELECT 'Mrs. Sonia Gharbi', 'French literature and language teacher with a passion for teaching.', id, true, ARRAY['Verified Educator'], 620, 32
FROM subjects WHERE slug = 'french';

INSERT INTO teachers (full_name, bio, subject_id, is_verified, badges, follower_count, document_count)
SELECT 'Mr. Mohamed Khelifi', 'History and geography teacher, specialized in contemporary studies.', id, false, ARRAY['Rising Star'], 340, 18
FROM subjects WHERE slug = 'history';

INSERT INTO teachers (full_name, bio, subject_id, is_verified, badges, follower_count, document_count)
SELECT 'Mrs. Ines Bouzid', 'Philosophy teacher focused on critical thinking and argumentation.', id, true, ARRAY['Expert', 'Verified Educator'], 510, 22
FROM subjects WHERE slug = 'philosophy';

-- Seed demo documents
INSERT INTO documents (title, description, file_url, file_size, subject_id, grade_id, stream_id, teacher_id, category_id, document_type, trimester, year, status, download_count, view_count, like_count, rating_avg, rating_count)
SELECT
  'BAC Mathematics 2024 - Final Exam with Solutions',
  'Complete final exam for the 2024 Baccalaureate in Mathematics, including detailed solutions and step-by-step explanations.',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  2400000,
  s.id, g.id, st.id, t.id, c.id, 'exam', 3, 2024, 'approved', 3420, 8900, 510, 4.80, 320
FROM subjects s, grades g, streams st, teachers t, categories c
WHERE s.slug = 'mathematics' AND g.slug = '4th-secondary-bac' AND st.slug = 'mathematics' AND t.full_name = 'Mr. Ahmed Ben Salah' AND c.slug = 'exams';

INSERT INTO documents (title, description, file_url, file_size, subject_id, grade_id, stream_id, teacher_id, category_id, document_type, trimester, year, status, download_count, view_count, like_count, rating_avg, rating_count)
SELECT
  'Physics - Trimester 1 Exercises Collection',
  'A comprehensive collection of physics exercises covering mechanics, electricity, and waves for the first trimester.',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  1800000,
  s.id, g.id, st.id, t.id, c.id, 'exercises', 1, 2024, 'approved', 2150, 5600, 340, 4.60, 180
FROM subjects s, grades g, streams st, teachers t, categories c
WHERE s.slug = 'physics' AND g.slug = '3rd-secondary' AND st.slug = 'science' AND t.full_name = 'Mrs. Leila Trabelsi' AND c.slug = 'exercises';

INSERT INTO documents (title, description, file_url, file_size, subject_id, grade_id, stream_id, teacher_id, category_id, document_type, trimester, year, status, download_count, view_count, like_count, rating_avg, rating_count)
SELECT
  'Computer Science - Algorithmic Programming Lessons',
  'Complete lesson series on algorithmic problem-solving, data structures, and Python programming fundamentals.',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  3200000,
  s.id, g.id, st.id, t.id, c.id, 'lesson', 1, 2024, 'approved', 1890, 4200, 280, 4.70, 150
FROM subjects s, grades g, streams st, teachers t, categories c
WHERE s.slug = 'computer-science' AND g.slug = '4th-secondary-bac' AND st.slug = 'computer-science' AND t.full_name = 'Mr. Karim Mansouri' AND c.slug = 'lessons';

INSERT INTO documents (title, description, file_url, file_size, subject_id, grade_id, stream_id, teacher_id, category_id, document_type, trimester, year, status, download_count, view_count, like_count, rating_avg, rating_count)
SELECT
  'French Literature - BAC Revision Sheet',
  'Thorough revision sheet covering all major French literary movements and authors for BAC preparation.',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  1500000,
  s.id, g.id, st.id, t.id, c.id, 'revision', 3, 2024, 'approved', 2780, 6100, 420, 4.90, 240
FROM subjects s, grades g, streams st, teachers t, categories c
WHERE s.slug = 'french' AND g.slug = '4th-secondary-bac' AND st.slug = 'literature' AND t.full_name = 'Mrs. Sonia Gharbi' AND c.slug = 'revision-sheets';

INSERT INTO documents (title, description, file_url, file_size, subject_id, grade_id, stream_id, teacher_id, category_id, document_type, trimester, year, status, download_count, view_count, like_count, rating_avg, rating_count)
SELECT
  'History - World War II Complete Lesson',
  'Detailed lesson on World War II: causes, major events, consequences, and impact on Tunisia.',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  2100000,
  s.id, g.id, st.id, t.id, c.id, 'lesson', 2, 2024, 'approved', 1450, 3800, 220, 4.50, 110
FROM subjects s, grades g, streams st, teachers t, categories c
WHERE s.slug = 'history' AND g.slug = '3rd-secondary' AND st.slug = 'literature' AND t.full_name = 'Mr. Mohamed Khelifi' AND c.slug = 'lessons';

INSERT INTO documents (title, description, file_url, file_size, subject_id, grade_id, stream_id, teacher_id, category_id, document_type, trimester, year, status, download_count, view_count, like_count, rating_avg, rating_count)
SELECT
  'Philosophy - Critical Thinking Summary',
  'A concise summary of key philosophical concepts, thinkers, and argumentation techniques for BAC.',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  1200000,
  s.id, g.id, st.id, t.id, c.id, 'summary', 3, 2024, 'approved', 1980, 4500, 310, 4.70, 190
FROM subjects s, grades g, streams st, teachers t, categories c
WHERE s.slug = 'philosophy' AND g.slug = '4th-secondary-bac' AND st.slug = 'literature' AND t.full_name = 'Mrs. Ines Bouzid' AND c.slug = 'summaries';

INSERT INTO documents (title, description, file_url, file_size, subject_id, grade_id, stream_id, teacher_id, category_id, document_type, trimester, year, status, download_count, view_count, like_count, rating_avg, rating_count)
SELECT
  'Mathematics - Limits and Continuity Exercises',
  'Practice exercises on limits, continuity, and differentiability with full corrections.',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  1700000,
  s.id, g.id, st.id, t.id, c.id, 'exercises', 1, 2024, 'approved', 1650, 3900, 240, 4.40, 130
FROM subjects s, grades g, streams st, teachers t, categories c
WHERE s.slug = 'mathematics' AND g.slug = '4th-secondary-bac' AND st.slug = 'science' AND t.full_name = 'Mr. Ahmed Ben Salah' AND c.slug = 'exercises';

INSERT INTO documents (title, description, file_url, file_size, subject_id, grade_id, stream_id, teacher_id, category_id, document_type, trimester, year, status, download_count, view_count, like_count, rating_avg, rating_count)
SELECT
  'Physics - Electricity Test with Correction',
  'Complete test on electricity and circuits with detailed correction key.',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  1400000,
  s.id, g.id, st.id, t.id, c.id, 'test', 2, 2024, 'approved', 1230, 2900, 180, 4.30, 95
FROM subjects s, grades g, streams st, teachers t, categories c
WHERE s.slug = 'physics' AND g.slug = '4th-secondary-bac' AND st.slug = 'science' AND t.full_name = 'Mrs. Leila Trabelsi' AND c.slug = 'tests';

INSERT INTO documents (title, description, file_url, file_size, subject_id, grade_id, stream_id, teacher_id, category_id, document_type, trimester, year, status, download_count, view_count, like_count, rating_avg, rating_count)
SELECT
  'English - Writing Skills Book',
  'A comprehensive guide to English writing skills: essays, summaries, and argumentative texts.',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  2800000,
  s.id, g.id, st.id, t.id, c.id, 'book', 1, 2024, 'approved', 980, 2100, 150, 4.60, 80
FROM subjects s, grades g, streams st, teachers t, categories c
WHERE s.slug = 'english' AND g.slug = '4th-secondary-bac' AND st.slug = 'literature' AND t.full_name = 'Mrs. Sonia Gharbi' AND c.slug = 'books';

INSERT INTO documents (title, description, file_url, file_size, subject_id, grade_id, stream_id, teacher_id, category_id, document_type, trimester, year, status, download_count, view_count, like_count, rating_avg, rating_count)
SELECT
  'Geography - Climate and Environment Lesson',
  'Complete lesson covering climate types, environmental challenges, and sustainable development.',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  1900000,
  s.id, g.id, st.id, t.id, c.id, 'lesson', 2, 2024, 'approved', 870, 1900, 120, 4.20, 60
FROM subjects s, grades g, streams st, teachers t, categories c
WHERE s.slug = 'geography' AND g.slug = '3rd-secondary' AND st.slug = 'literature' AND t.full_name = 'Mr. Mohamed Khelifi' AND c.slug = 'lessons';

INSERT INTO documents (title, description, file_url, file_size, subject_id, grade_id, stream_id, teacher_id, category_id, document_type, trimester, year, status, download_count, view_count, like_count, rating_avg, rating_count)
SELECT
  'Economics - Microeconomics Homework',
  'Homework assignment on supply, demand, and market equilibrium with exercises.',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  900000,
  s.id, g.id, st.id, t.id, c.id, 'homework', 1, 2024, 'approved', 650, 1500, 90, 4.10, 45
FROM subjects s, grades g, streams st, teachers t, categories c
WHERE s.slug = 'economics' AND g.slug = '4th-secondary-bac' AND st.slug = 'economics' AND t.full_name = 'Mr. Karim Mansouri' AND c.slug = 'homework';

INSERT INTO documents (title, description, file_url, file_size, subject_id, grade_id, stream_id, teacher_id, category_id, document_type, trimester, year, status, download_count, view_count, like_count, rating_avg, rating_count)
SELECT
  'Arabic - Grammar and Text Analysis',
  'Complete lesson on Arabic grammar rules, text analysis techniques, and literary devices.',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  2200000,
  s.id, g.id, st.id, t.id, c.id, 'lesson', 1, 2024, 'approved', 1340, 3100, 200, 4.50, 120
FROM subjects s, grades g, streams st, teachers t, categories c
WHERE s.slug = 'arabic' AND g.slug = '3rd-secondary' AND st.slug = 'literature' AND t.full_name = 'Mrs. Sonia Gharbi' AND c.slug = 'lessons';
`;

async function main() {
  await client.connect();
  console.log('Connected to Neon DB');

  console.log('Creating schema...');
  await client.query(schemaSQL);
  console.log('Schema created');

  console.log('Seeding data...');
  await client.query(seedSQL);
  console.log('Data seeded');

  // Verify
  const res = await client.query('SELECT COUNT(*) as count FROM documents');
  console.log(`Documents in DB: ${res.rows[0].count}`);

  await client.end();
  console.log('Done');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
