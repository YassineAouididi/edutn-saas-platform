export const DOCUMENT_TYPES = [
  'lesson',
  'exercises',
  'homework',
  'test',
  'exam',
  'correction',
  'revision',
  'book',
  'summary',
] as const;

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  lesson: 'Lesson',
  exercises: 'Exercises',
  homework: 'Homework',
  test: 'Test',
  exam: 'Exam',
  correction: 'Correction',
  revision: 'Revision Sheet',
  book: 'Book',
  summary: 'Summary',
};

export const TRIMESTERS = [
  { value: 1, label: 'Trimester 1' },
  { value: 2, label: 'Trimester 2' },
  { value: 3, label: 'Trimester 3' },
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'downloads', label: 'Most Downloaded' },
  { value: 'rating', label: 'Highest Rated' },
];

export const REPORT_REASONS = [
  'Inappropriate content',
  'Copyright violation',
  'Spam or misleading',
  'Broken file',
  'Other',
];

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
