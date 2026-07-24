import { sql } from '@/lib/db';
import type {
  DatabaseSubject, DatabaseGrade, DatabaseStream, DatabaseCategory,
  DatabaseDocument, DatabaseTeacher, DatabaseComment, DatabaseNotification,
  DatabaseUser,
} from '@/lib/types';

// ---- Reference data ----

export async function getSubjects(): Promise<DatabaseSubject[]> {
  const rows = await sql`SELECT * FROM subjects ORDER BY sort_order`;
  return rows as DatabaseSubject[];
}

export async function getGrades(): Promise<DatabaseGrade[]> {
  const rows = await sql`SELECT * FROM grades ORDER BY sort_order`;
  return rows as DatabaseGrade[];
}

export async function getStreams(): Promise<DatabaseStream[]> {
  const rows = await sql`SELECT * FROM streams ORDER BY sort_order`;
  return rows as DatabaseStream[];
}

export async function getCategories(): Promise<DatabaseCategory[]> {
  const rows = await sql`SELECT * FROM categories ORDER BY sort_order`;
  return rows as DatabaseCategory[];
}

export async function getSubjectBySlug(slug: string): Promise<DatabaseSubject | null> {
  const rows = await sql`SELECT * FROM subjects WHERE slug = ${slug}`;
  return (rows[0] as DatabaseSubject) ?? null;
}

// ---- Documents ----

interface DocumentQueryOptions {
  subjectId?: string;
  gradeId?: string;
  streamId?: string;
  categoryId?: string;
  teacherId?: string;
  documentType?: string;
  search?: string;
  status?: string;
  sort?: 'newest' | 'downloads' | 'rating';
  limit?: number;
}

export async function getDocuments(opts: DocumentQueryOptions = {}): Promise<DatabaseDocument[]> {
  const {
    subjectId, gradeId, streamId, categoryId, teacherId, documentType,
    search, status = 'approved', sort = 'newest', limit = 24,
  } = opts;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (status) { conditions.push(`d.status = $${paramIdx++}`); params.push(status); }
  if (subjectId) { conditions.push(`d.subject_id = $${paramIdx++}`); params.push(subjectId); }
  if (gradeId) { conditions.push(`d.grade_id = $${paramIdx++}`); params.push(gradeId); }
  if (streamId) { conditions.push(`d.stream_id = $${paramIdx++}`); params.push(streamId); }
  if (categoryId) { conditions.push(`d.category_id = $${paramIdx++}`); params.push(categoryId); }
  if (teacherId) { conditions.push(`d.teacher_id = $${paramIdx++}`); params.push(teacherId); }
  if (documentType) { conditions.push(`d.document_type = $${paramIdx++}`); params.push(documentType); }
  if (search) { conditions.push(`d.title ILIKE $${paramIdx++}`); params.push(`%${search}%`); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = sort === 'downloads' ? 'd.download_count DESC' : sort === 'rating' ? 'd.rating_avg DESC' : 'd.created_at DESC';

  const queryText = `
    SELECT
      d.*,
      s.id AS subject_id, s.name AS subject_name, s.slug AS subject_slug, s.icon AS subject_icon, s.color AS subject_color, s.description AS subject_description, s.sort_order AS subject_sort_order, s.created_at AS subject_created_at,
      g.id AS grade_id_fk, g.name AS grade_name, g.slug AS grade_slug, g.level AS grade_level, g.sort_order AS grade_sort_order, g.created_at AS grade_created_at,
      st.id AS stream_id_fk, st.name AS stream_name, st.slug AS stream_slug, st.sort_order AS stream_sort_order, st.created_at AS stream_created_at,
      t.id AS teacher_id_fk, t.full_name AS teacher_full_name, t.avatar_url AS teacher_avatar_url, t.bio AS teacher_bio, t.is_verified AS teacher_is_verified, t.badges AS teacher_badges, t.follower_count AS teacher_follower_count, t.document_count AS teacher_document_count,
      c.id AS category_id_fk, c.name AS category_name, c.slug AS category_slug, c.description AS category_description, c.icon AS category_icon, c.sort_order AS category_sort_order
    FROM documents d
    LEFT JOIN subjects s ON d.subject_id = s.id
    LEFT JOIN grades g ON d.grade_id = g.id
    LEFT JOIN streams st ON d.stream_id = st.id
    LEFT JOIN teachers t ON d.teacher_id = t.id
    LEFT JOIN categories c ON d.category_id = c.id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ${limit}
  `;

  const rows = await sql.query(queryText, params) as unknown as Record<string, unknown>[];
  return rows.map(mapDocumentRow);
}

export async function getDocumentById(id: string): Promise<DatabaseDocument | null> {
  const rows = await sql.query(`
    SELECT
      d.*,
      s.id AS subject_id, s.name AS subject_name, s.slug AS subject_slug, s.icon AS subject_icon, s.color AS subject_color, s.description AS subject_description, s.sort_order AS subject_sort_order, s.created_at AS subject_created_at,
      g.id AS grade_id_fk, g.name AS grade_name, g.slug AS grade_slug, g.level AS grade_level, g.sort_order AS grade_sort_order, g.created_at AS grade_created_at,
      st.id AS stream_id_fk, st.name AS stream_name, st.slug AS stream_slug, st.sort_order AS stream_sort_order, st.created_at AS stream_created_at,
      t.id AS teacher_id_fk, t.full_name AS teacher_full_name, t.avatar_url AS teacher_avatar_url, t.bio AS teacher_bio, t.is_verified AS teacher_is_verified, t.badges AS teacher_badges, t.follower_count AS teacher_follower_count, t.document_count AS teacher_document_count,
      c.id AS category_id_fk, c.name AS category_name, c.slug AS category_slug, c.description AS category_description, c.icon AS category_icon, c.sort_order AS category_sort_order
    FROM documents d
    LEFT JOIN subjects s ON d.subject_id = s.id
    LEFT JOIN grades g ON d.grade_id = g.id
    LEFT JOIN streams st ON d.stream_id = st.id
    LEFT JOIN teachers t ON d.teacher_id = t.id
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE d.id = $1
  `, [id]) as unknown as Record<string, unknown>[];

  if (rows.length === 0) return null;
  const doc = mapDocumentRow(rows[0]);
  // Increment view count
  await sql`UPDATE documents SET view_count = view_count + 1 WHERE id = ${id}`;
  doc.view_count += 1;
  return doc;
}

export async function getRelatedDocuments(subjectId: string, excludeId: string, limit = 4): Promise<DatabaseDocument[]> {
  const rows = await sql.query(`
    SELECT
      d.*,
      s.id AS subject_id, s.name AS subject_name, s.slug AS subject_slug, s.icon AS subject_icon, s.color AS subject_color, s.description AS subject_description, s.sort_order AS subject_sort_order, s.created_at AS subject_created_at,
      g.id AS grade_id_fk, g.name AS grade_name, g.slug AS grade_slug, g.level AS grade_level, g.sort_order AS grade_sort_order, g.created_at AS grade_created_at,
      st.id AS stream_id_fk, st.name AS stream_name, st.slug AS stream_slug, st.sort_order AS stream_sort_order, st.created_at AS stream_created_at,
      t.id AS teacher_id_fk, t.full_name AS teacher_full_name, t.avatar_url AS teacher_avatar_url, t.bio AS teacher_bio, t.is_verified AS teacher_is_verified, t.badges AS teacher_badges, t.follower_count AS teacher_follower_count, t.document_count AS teacher_document_count,
      c.id AS category_id_fk, c.name AS category_name, c.slug AS category_slug, c.description AS category_description, c.icon AS category_icon, c.sort_order AS category_sort_order
    FROM documents d
    LEFT JOIN subjects s ON d.subject_id = s.id
    LEFT JOIN grades g ON d.grade_id = g.id
    LEFT JOIN streams st ON d.stream_id = st.id
    LEFT JOIN teachers t ON d.teacher_id = t.id
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE d.subject_id = $1 AND d.id != $2 AND d.status = 'approved'
    ORDER BY d.download_count DESC
    LIMIT $3
  `, [subjectId, excludeId, limit]) as unknown as Record<string, unknown>[];

  return rows.map(mapDocumentRow);
}

export async function getDocumentsByUser(userId: string): Promise<DatabaseDocument[]> {
  const rows = await sql.query(`
    SELECT
      d.*,
      s.id AS subject_id, s.name AS subject_name, s.slug AS subject_slug, s.icon AS subject_icon, s.color AS subject_color, s.description AS subject_description, s.sort_order AS subject_sort_order, s.created_at AS subject_created_at,
      g.id AS grade_id_fk, g.name AS grade_name, g.slug AS grade_slug, g.level AS grade_level, g.sort_order AS grade_sort_order, g.created_at AS grade_created_at,
      st.id AS stream_id_fk, st.name AS stream_name, st.slug AS stream_slug, st.sort_order AS stream_sort_order, st.created_at AS stream_created_at,
      t.id AS teacher_id_fk, t.full_name AS teacher_full_name, t.avatar_url AS teacher_avatar_url, t.bio AS teacher_bio, t.is_verified AS teacher_is_verified, t.badges AS teacher_badges, t.follower_count AS teacher_follower_count, t.document_count AS teacher_document_count,
      c.id AS category_id_fk, c.name AS category_name, c.slug AS category_slug, c.description AS category_description, c.icon AS category_icon, c.sort_order AS category_sort_order
    FROM documents d
    LEFT JOIN subjects s ON d.subject_id = s.id
    LEFT JOIN grades g ON d.grade_id = g.id
    LEFT JOIN streams st ON d.stream_id = st.id
    LEFT JOIN teachers t ON d.teacher_id = t.id
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE d.uploaded_by = $1
    ORDER BY d.created_at DESC
  `, [userId]) as Record<string, unknown>[];

  return rows.map(mapDocumentRow);
}

export async function getAllDocuments(): Promise<DatabaseDocument[]> {
  const rows = await sql.query(`
    SELECT
      d.*,
      s.id AS subject_id, s.name AS subject_name, s.slug AS subject_slug, s.icon AS subject_icon, s.color AS subject_color, s.description AS subject_description, s.sort_order AS subject_sort_order, s.created_at AS subject_created_at,
      g.id AS grade_id_fk, g.name AS grade_name, g.slug AS grade_slug, g.level AS grade_level, g.sort_order AS grade_sort_order, g.created_at AS grade_created_at,
      st.id AS stream_id_fk, st.name AS stream_name, st.slug AS stream_slug, st.sort_order AS stream_sort_order, st.created_at AS stream_created_at,
      t.id AS teacher_id_fk, t.full_name AS teacher_full_name, t.avatar_url AS teacher_avatar_url, t.bio AS teacher_bio, t.is_verified AS teacher_is_verified, t.badges AS teacher_badges, t.follower_count AS teacher_follower_count, t.document_count AS teacher_document_count,
      c.id AS category_id_fk, c.name AS category_name, c.slug AS category_slug, c.description AS category_description, c.icon AS category_icon, c.sort_order AS category_sort_order
    FROM documents d
    LEFT JOIN subjects s ON d.subject_id = s.id
    LEFT JOIN grades g ON d.grade_id = g.id
    LEFT JOIN streams st ON d.stream_id = st.id
    LEFT JOIN teachers t ON d.teacher_id = t.id
    LEFT JOIN categories c ON d.category_id = c.id
    ORDER BY d.created_at DESC
  `) as unknown as Record<string, unknown>[];

  return rows.map(mapDocumentRow);
}

export async function createDocument(data: {
  title: string; description?: string; file_url: string; file_size?: number;
  subject_id?: string; grade_id?: string; stream_id?: string; category_id?: string;
  document_type: string; trimester: number; year: number; uploaded_by: string;
  status?: string;
}): Promise<DatabaseDocument | null> {
  const rows = await sql`
    INSERT INTO documents (title, description, file_url, file_size, subject_id, grade_id, stream_id, category_id, document_type, trimester, year, uploaded_by, status)
    VALUES (${data.title}, ${data.description ?? null}, ${data.file_url}, ${data.file_size ?? 1000000}, ${data.subject_id ?? null}, ${data.grade_id ?? null}, ${data.stream_id ?? null}, ${data.category_id ?? null}, ${data.document_type}, ${data.trimester}, ${data.year}, ${data.uploaded_by}, ${data.status ?? 'pending'})
    RETURNING *
  `;
  return (rows[0] as DatabaseDocument) ?? null;
}

export async function updateDocumentStatus(id: string, status: string): Promise<void> {
  await sql`UPDATE documents SET status = ${status}, updated_at = now() WHERE id = ${id}`;
}

export async function incrementDownloadCount(id: string): Promise<void> {
  await sql`UPDATE documents SET download_count = download_count + 1 WHERE id = ${id}`;
}

// ---- Teachers ----

export async function getTeachers(limit?: number): Promise<DatabaseTeacher[]> {
  const rows = limit
    ? await sql`SELECT * FROM teachers ORDER BY follower_count DESC LIMIT ${limit}`
    : await sql`SELECT * FROM teachers ORDER BY follower_count DESC`;
  return rows as DatabaseTeacher[];
}

// ---- Comments ----

export async function getComments(documentId: string): Promise<DatabaseComment[]> {
  const rows = await sql`
    SELECT c.*, u.full_name AS user_name, u.avatar_url AS user_avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.document_id = ${documentId} AND c.is_approved = true
    ORDER BY c.created_at DESC
  `;
  return rows as unknown as DatabaseComment[];
}

export async function addComment(userId: string, documentId: string, content: string): Promise<DatabaseComment | null> {
  const rows = await sql`
    INSERT INTO comments (user_id, document_id, content)
    VALUES (${userId}, ${documentId}, ${content})
    RETURNING *, (SELECT full_name FROM users WHERE id = ${userId}) AS user_name, (SELECT avatar_url FROM users WHERE id = ${userId}) AS user_avatar
  `;
  return (rows[0] as DatabaseComment) ?? null;
}

// ---- Ratings ----

export async function getUserRating(userId: string, documentId: string): Promise<number | null> {
  const rows = await sql`SELECT score FROM ratings WHERE user_id = ${userId} AND document_id = ${documentId}`;
  return rows.length > 0 ? (rows[0] as { score: number }).score : null;
}

export async function upsertRating(userId: string, documentId: string, score: number): Promise<void> {
  await sql`
    INSERT INTO ratings (user_id, document_id, score)
    VALUES (${userId}, ${documentId}, ${score})
    ON CONFLICT (user_id, document_id) DO UPDATE SET score = ${score}
  `;
  // Recalculate averages
  await sql`
    UPDATE documents SET
      rating_avg = (SELECT COALESCE(AVG(score), 0) FROM ratings WHERE document_id = ${documentId}),
      rating_count = (SELECT COUNT(*) FROM ratings WHERE document_id = ${documentId})
    WHERE id = ${documentId}
  `;
}

// ---- Favorites ----

export async function getFavorites(userId: string): Promise<{ id: string; document_id: string; document: DatabaseDocument }[]> {
  const rows = await sql.query(`
    SELECT
      f.id, f.document_id,
      d.*,
      s.id AS subject_id, s.name AS subject_name, s.slug AS subject_slug, s.icon AS subject_icon, s.color AS subject_color, s.description AS subject_description, s.sort_order AS subject_sort_order, s.created_at AS subject_created_at,
      g.id AS grade_id_fk, g.name AS grade_name, g.slug AS grade_slug, g.level AS grade_level, g.sort_order AS grade_sort_order, g.created_at AS grade_created_at,
      st.id AS stream_id_fk, st.name AS stream_name, st.slug AS stream_slug, st.sort_order AS stream_sort_order, st.created_at AS stream_created_at,
      t.id AS teacher_id_fk, t.full_name AS teacher_full_name, t.avatar_url AS teacher_avatar_url, t.bio AS teacher_bio, t.is_verified AS teacher_is_verified, t.badges AS teacher_badges, t.follower_count AS teacher_follower_count, t.document_count AS teacher_document_count,
      c.id AS category_id_fk, c.name AS category_name, c.slug AS category_slug, c.description AS category_description, c.icon AS category_icon, c.sort_order AS category_sort_order
    FROM favorites f
    JOIN documents d ON f.document_id = d.id
    LEFT JOIN subjects s ON d.subject_id = s.id
    LEFT JOIN grades g ON d.grade_id = g.id
    LEFT JOIN streams st ON d.stream_id = st.id
    LEFT JOIN teachers t ON d.teacher_id = t.id
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE f.user_id = $1
    ORDER BY f.created_at DESC
  `, [userId]) as unknown as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    document_id: row.document_id as string,
    document: mapDocumentRow(row),
  }));
}

export async function isFavorited(userId: string, documentId: string): Promise<boolean> {
  const rows = await sql`SELECT id FROM favorites WHERE user_id = ${userId} AND document_id = ${documentId}`;
  return rows.length > 0;
}

export async function addFavorite(userId: string, documentId: string): Promise<void> {
  await sql`INSERT INTO favorites (user_id, document_id) VALUES (${userId}, ${documentId}) ON CONFLICT DO NOTHING`;
}

export async function removeFavorite(userId: string, documentId: string): Promise<void> {
  await sql`DELETE FROM favorites WHERE user_id = ${userId} AND document_id = ${documentId}`;
}

// ---- Downloads ----

export async function getDownloadHistory(userId: string, limit = 20): Promise<{ id: string; created_at: string; document: DatabaseDocument }[]> {
  const rows = await sql.query(`
    SELECT
      dl.id, dl.created_at,
      d.*,
      s.id AS subject_id, s.name AS subject_name, s.slug AS subject_slug, s.icon AS subject_icon, s.color AS subject_color, s.description AS subject_description, s.sort_order AS subject_sort_order, s.created_at AS subject_created_at,
      g.id AS grade_id_fk, g.name AS grade_name, g.slug AS grade_slug, g.level AS grade_level, g.sort_order AS grade_sort_order, g.created_at AS grade_created_at,
      st.id AS stream_id_fk, st.name AS stream_name, st.slug AS stream_slug, st.sort_order AS stream_sort_order, st.created_at AS stream_created_at,
      t.id AS teacher_id_fk, t.full_name AS teacher_full_name, t.avatar_url AS teacher_avatar_url, t.bio AS teacher_bio, t.is_verified AS teacher_is_verified, t.badges AS teacher_badges, t.follower_count AS teacher_follower_count, t.document_count AS teacher_document_count,
      c.id AS category_id_fk, c.name AS category_name, c.slug AS category_slug, c.description AS category_description, c.icon AS category_icon, c.sort_order AS category_sort_order
    FROM downloads dl
    JOIN documents d ON dl.document_id = d.id
    LEFT JOIN subjects s ON d.subject_id = s.id
    LEFT JOIN grades g ON d.grade_id = g.id
    LEFT JOIN streams st ON d.stream_id = st.id
    LEFT JOIN teachers t ON d.teacher_id = t.id
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE dl.user_id = $1
    ORDER BY dl.created_at DESC
    LIMIT $2
  `, [userId, limit]) as unknown as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    created_at: row.created_at as string,
    document: mapDocumentRow(row),
  }));
}

export async function addDownload(userId: string, documentId: string): Promise<void> {
  await sql`INSERT INTO downloads (user_id, document_id) VALUES (${userId}, ${documentId})`;
}

// ---- Notifications ----

export async function getNotifications(userId: string, limit = 20): Promise<DatabaseNotification[]> {
  const rows = await sql`SELECT * FROM notifications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}`;
  return rows as DatabaseNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  await sql`UPDATE notifications SET is_read = true WHERE id = ${id}`;
}

// ---- Reports ----

export async function createReport(reporterId: string, documentId: string, reason: string, details: string): Promise<void> {
  await sql`INSERT INTO reports (reporter_id, document_id, reason, details) VALUES (${reporterId}, ${documentId}, ${reason}, ${details})`;
}

// ---- Stats ----

export async function getStats(): Promise<{ documents: number; downloads: number; teachers: number }> {
  const [docCount, dlCount, teacherCount] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM documents WHERE status = 'approved'`,
    sql`SELECT COALESCE(SUM(download_count), 0) as total FROM documents WHERE status = 'approved'`,
    sql`SELECT COUNT(*) as count FROM teachers`,
  ]);
  return {
    documents: Number((docCount[0] as { count: string }).count),
    downloads: Number((dlCount[0] as { total: string }).total),
    teachers: Number((teacherCount[0] as { count: string }).count),
  };
}

// ---- Row mapper ----

function mapDocumentRow(row: Record<string, unknown>): DatabaseDocument {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    file_url: row.file_url as string,
    file_size: Number(row.file_size ?? 0),
    file_type: (row.file_type as string) ?? 'pdf',
    thumbnail_url: (row.thumbnail_url as string) ?? null,
    subject_id: (row.subject_id as string) ?? null,
    grade_id: (row.grade_id as string) ?? null,
    stream_id: (row.stream_id as string) ?? null,
    teacher_id: (row.teacher_id as string) ?? null,
    category_id: (row.category_id as string) ?? null,
    document_type: (row.document_type as string) ?? 'lesson',
    trimester: Number(row.trimester ?? 1),
    year: row.year as number | null,
    status: (row.status as string) ?? 'pending',
    download_count: Number(row.download_count ?? 0),
    view_count: Number(row.view_count ?? 0),
    like_count: Number(row.like_count ?? 0),
    rating_avg: Number(row.rating_avg ?? 0),
    rating_count: Number(row.rating_count ?? 0),
    uploaded_by: (row.uploaded_by as string) ?? null,
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string) ?? row.created_at as string,
    subject: row.subject_name ? {
      id: row.subject_id as string,
      name: row.subject_name as string,
      slug: row.subject_slug as string,
      icon: (row.subject_icon as string) ?? null,
      color: (row.subject_color as string) ?? null,
      description: (row.subject_description as string) ?? null,
      sort_order: Number(row.subject_sort_order ?? 0),
    } : null,
    grade: row.grade_name ? {
      id: row.grade_id_fk as string,
      name: row.grade_name as string,
      slug: row.grade_slug as string,
      level: Number(row.grade_level ?? 0),
      sort_order: Number(row.grade_sort_order ?? 0),
      created_at: row.grade_created_at as string,
    } : null,
    stream: row.stream_name ? {
      id: row.stream_id_fk as string,
      name: row.stream_name as string,
      slug: row.stream_slug as string,
      sort_order: Number(row.stream_sort_order ?? 0),
      created_at: row.stream_created_at as string,
    } : null,
    teacher: row.teacher_full_name ? {
      id: row.teacher_id_fk as string,
      user_id: null,
      full_name: row.teacher_full_name as string,
      avatar_url: (row.teacher_avatar_url as string) ?? null,
      bio: (row.teacher_bio as string) ?? null,
      subject_id: null,
      is_verified: (row.teacher_is_verified as boolean) ?? false,
      badges: (row.teacher_badges as string[]) ?? [],
      follower_count: Number(row.teacher_follower_count ?? 0),
      document_count: Number(row.teacher_document_count ?? 0),
      created_at: row.created_at as string,
    } : null,
    category: row.category_name ? {
      id: row.category_id_fk as string,
      name: row.category_name as string,
      slug: row.category_slug as string,
      description: (row.category_description as string) ?? null,
      icon: (row.category_icon as string) ?? null,
      sort_order: Number(row.category_sort_order ?? 0),
      created_at: row.created_at as string,
    } : null,
  };
}

// ===================== ADMIN: USER MANAGEMENT =====================

export async function getAllUsers(): Promise<DatabaseUser[]> {
  const rows = await sql`
    SELECT id, email, full_name, avatar_url, role, grade_id, stream_id, bio, is_active, created_at, updated_at
    FROM users ORDER BY created_at DESC
  `;
  return rows as DatabaseUser[];
}

export async function updateUser(id: string, updates: {
  full_name?: string;
  role?: string;
  is_active?: boolean;
  bio?: string;
  avatar_url?: string;
  grade_id?: string | null;
  stream_id?: string | null;
}): Promise<DatabaseUser | null> {
  const rows = await sql`
    UPDATE users SET
      full_name = COALESCE(${updates.full_name ?? null}, full_name),
      role = COALESCE(${updates.role ?? null}, role),
      is_active = COALESCE(${updates.is_active ?? null}, is_active),
      bio = COALESCE(${updates.bio ?? null}, bio),
      avatar_url = COALESCE(${updates.avatar_url ?? null}, avatar_url),
      grade_id = ${updates.grade_id !== undefined ? updates.grade_id : sql`grade_id`},
      stream_id = ${updates.stream_id !== undefined ? updates.stream_id : sql`stream_id`},
      updated_at = now()
    WHERE id = ${id}
    RETURNING id, email, full_name, avatar_url, role, grade_id, stream_id, bio, is_active, created_at, updated_at
  `;
  return (rows[0] as DatabaseUser) ?? null;
}

export async function deleteUser(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM users WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ===================== ADMIN: DOCUMENT MANAGEMENT =====================

export async function updateDocument(id: string, updates: {
  title?: string;
  description?: string;
  subject_id?: string | null;
  grade_id?: string | null;
  stream_id?: string | null;
  category_id?: string | null;
  document_type?: string;
  trimester?: number;
  year?: number;
  status?: string;
}): Promise<DatabaseDocument | null> {
  const rows = await sql`
    UPDATE documents SET
      title = COALESCE(${updates.title ?? null}, title),
      description = COALESCE(${updates.description ?? null}, description),
      subject_id = ${updates.subject_id !== undefined ? updates.subject_id : sql`subject_id`},
      grade_id = ${updates.grade_id !== undefined ? updates.grade_id : sql`grade_id`},
      stream_id = ${updates.stream_id !== undefined ? updates.stream_id : sql`stream_id`},
      category_id = ${updates.category_id !== undefined ? updates.category_id : sql`category_id`},
      document_type = COALESCE(${updates.document_type ?? null}, document_type),
      trimester = COALESCE(${updates.trimester ?? null}, trimester),
      year = COALESCE(${updates.year ?? null}, year),
      status = COALESCE(${updates.status ?? null}, status),
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as DatabaseDocument) ?? null;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM documents WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ===================== ADMIN: SUBJECT MANAGEMENT =====================

export async function createSubject(data: {
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  sort_order?: number;
}): Promise<DatabaseSubject | null> {
  const sort = data.sort_order ?? 999;
  const rows = await sql`
    INSERT INTO subjects (name, slug, icon, color, description, sort_order)
    VALUES (${data.name}, ${data.slug}, ${data.icon ?? null}, ${data.color ?? null}, ${data.description ?? null}, ${sort})
    RETURNING *
  `;
  return (rows[0] as DatabaseSubject) ?? null;
}

export async function updateSubject(id: string, data: {
  name?: string;
  slug?: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  sort_order?: number;
}): Promise<DatabaseSubject | null> {
  const rows = await sql`
    UPDATE subjects SET
      name = COALESCE(${data.name ?? null}, name),
      slug = COALESCE(${data.slug ?? null}, slug),
      icon = ${data.icon !== undefined ? data.icon : sql`icon`},
      color = ${data.color !== undefined ? data.color : sql`color`},
      description = ${data.description !== undefined ? data.description : sql`description`},
      sort_order = COALESCE(${data.sort_order ?? null}, sort_order)
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as DatabaseSubject) ?? null;
}

export async function deleteSubject(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM subjects WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ===================== ADMIN: GRADE MANAGEMENT =====================

export async function createGrade(data: {
  name: string;
  slug: string;
  level: number;
  sort_order?: number;
}): Promise<DatabaseGrade | null> {
  const sort = data.sort_order ?? 999;
  const rows = await sql`
    INSERT INTO grades (name, slug, level, sort_order)
    VALUES (${data.name}, ${data.slug}, ${data.level}, ${sort})
    RETURNING *
  `;
  return (rows[0] as DatabaseGrade) ?? null;
}

export async function updateGrade(id: string, data: {
  name?: string;
  slug?: string;
  level?: number;
  sort_order?: number;
}): Promise<DatabaseGrade | null> {
  const rows = await sql`
    UPDATE grades SET
      name = COALESCE(${data.name ?? null}, name),
      slug = COALESCE(${data.slug ?? null}, slug),
      level = COALESCE(${data.level ?? null}, level),
      sort_order = COALESCE(${data.sort_order ?? null}, sort_order)
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as DatabaseGrade) ?? null;
}

export async function deleteGrade(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM grades WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ===================== ADMIN: STREAM MANAGEMENT =====================

export async function createStream(data: {
  name: string;
  slug: string;
  sort_order?: number;
}): Promise<DatabaseStream | null> {
  const sort = data.sort_order ?? 999;
  const rows = await sql`
    INSERT INTO streams (name, slug, sort_order)
    VALUES (${data.name}, ${data.slug}, ${sort})
    RETURNING *
  `;
  return (rows[0] as DatabaseStream) ?? null;
}

export async function updateStream(id: string, data: {
  name?: string;
  slug?: string;
  sort_order?: number;
}): Promise<DatabaseStream | null> {
  const rows = await sql`
    UPDATE streams SET
      name = COALESCE(${data.name ?? null}, name),
      slug = COALESCE(${data.slug ?? null}, slug),
      sort_order = COALESCE(${data.sort_order ?? null}, sort_order)
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as DatabaseStream) ?? null;
}

export async function deleteStream(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM streams WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ===================== ADMIN: CATEGORY MANAGEMENT =====================

export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  sort_order?: number;
}): Promise<DatabaseCategory | null> {
  const sort = data.sort_order ?? 999;
  const rows = await sql`
    INSERT INTO categories (name, slug, description, icon, sort_order)
    VALUES (${data.name}, ${data.slug}, ${data.description ?? null}, ${data.icon ?? null}, ${sort})
    RETURNING *
  `;
  return (rows[0] as DatabaseCategory) ?? null;
}

export async function updateCategory(id: string, data: {
  name?: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  sort_order?: number;
}): Promise<DatabaseCategory | null> {
  const rows = await sql`
    UPDATE categories SET
      name = COALESCE(${data.name ?? null}, name),
      slug = COALESCE(${data.slug ?? null}, slug),
      description = ${data.description !== undefined ? data.description : sql`description`},
      icon = ${data.icon !== undefined ? data.icon : sql`icon`},
      sort_order = COALESCE(${data.sort_order ?? null}, sort_order)
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as DatabaseCategory) ?? null;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM categories WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
