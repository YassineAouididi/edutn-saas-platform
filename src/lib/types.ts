export type UserRole = 'student' | 'teacher' | 'admin';

export interface DatabaseSubject {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  sort_order: number;
}

export interface DatabaseGrade {
  id: string;
  name: string;
  slug: string;
  level: number;
  sort_order: number;
  created_at?: string;
}

export interface DatabaseStream {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at?: string;
}

export interface DatabaseCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  created_at?: string;
}

export interface DatabaseTeacher {
  id: string;
  user_id: string | null;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  subject_id: string | null;
  is_verified: boolean;
  badges: string[];
  follower_count: number;
  document_count: number;
  created_at: string;
}

export interface DatabaseDocument {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_size: number;
  file_type: string;
  thumbnail_url: string | null;
  subject_id: string | null;
  grade_id: string | null;
  stream_id: string | null;
  teacher_id: string | null;
  category_id: string | null;
  document_type: string;
  trimester: number;
  year: number | null;
  status: string;
  download_count: number;
  view_count: number;
  like_count: number;
  rating_avg: number;
  rating_count: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  subject?: DatabaseSubject | null;
  grade?: DatabaseGrade | null;
  stream?: DatabaseStream | null;
  teacher?: DatabaseTeacher | null;
  category?: DatabaseCategory | null;
}

export interface DatabaseComment {
  id: string;
  user_id: string;
  document_id: string;
  content: string;
  is_approved: boolean;
  created_at: string;
  user_name?: string | null;
  user_avatar?: string | null;
}

export interface DatabaseRating {
  id: string;
  user_id: string;
  document_id: string;
  score: number;
  created_at: string;
}

export interface DatabaseFavorite {
  id: string;
  user_id: string;
  document_id: string;
  created_at: string;
  document?: DatabaseDocument | null;
}

export interface DatabaseDownload {
  id: string;
  user_id: string;
  document_id: string;
  created_at: string;
  document?: DatabaseDocument | null;
}

export interface DatabaseNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DatabaseUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  grade_id: string | null;
  stream_id: string | null;
  bio: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role_id: string | null;
  grade_id: string | null;
  stream_id: string | null;
  bio: string | null;
  is_active: boolean;
}

export interface DocumentWithRelations extends DatabaseDocument {
  subject?: DatabaseSubject | null;
  grade?: DatabaseGrade | null;
  stream?: DatabaseStream | null;
  teacher?: DatabaseTeacher | null;
  category?: DatabaseCategory | null;
}
