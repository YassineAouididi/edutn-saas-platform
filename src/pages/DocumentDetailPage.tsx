import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Download, Eye, Star, Bookmark, Share2, Flag, ChevronRight,
  FileText, Calendar, User, BookOpen, MessageCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { DatabaseDocument, DatabaseComment } from '@/lib/types';
import {
  getDocumentById, getRelatedDocuments, getComments, addComment,
  getUserRating, upsertRating, isFavorited, addFavorite, removeFavorite,
  addDownload, incrementDownloadCount, createReport,
} from '@/lib/data';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DocumentCard } from '@/components/DocumentCard';
import { DOCUMENT_TYPE_LABELS, formatFileSize, formatNumber, timeAgo, REPORT_REASONS } from '@/lib/constants';

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doc, setDoc] = useState<DatabaseDocument | null>(null);
  const [related, setRelated] = useState<DatabaseDocument[]>([]);
  const [comments, setComments] = useState<DatabaseComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      const docData = await getDocumentById(id);
      setDoc(docData);
      if (docData) {
        if (docData.subject_id) {
          const rel = await getRelatedDocuments(docData.subject_id, id, 4);
          setRelated(rel);
        }
        const cmts = await getComments(id);
        setComments(cmts);
        if (user) {
          const [fav, rating] = await Promise.all([
            isFavorited(user.id, id),
            getUserRating(user.id, id),
          ]);
          setIsBookmarked(fav);
          if (rating) setUserRating(rating);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [id, user]);

  async function handleDownload() {
    if (!doc || !user) return;
    await addDownload(user.id, doc.id);
    await incrementDownloadCount(doc.id);
    setDoc({ ...doc, download_count: doc.download_count + 1 });
    window.open(doc.file_url, '_blank');
  }

  async function handleBookmark() {
    if (!doc || !user) return;
    if (isBookmarked) {
      await removeFavorite(user.id, doc.id);
      setIsBookmarked(false);
    } else {
      await addFavorite(user.id, doc.id);
      setIsBookmarked(true);
    }
  }

  async function handleRate(score: number) {
    if (!doc || !user) return;
    setUserRating(score);
    await upsertRating(user.id, doc.id, score);
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!doc || !user || !newComment.trim()) return;
    const cmt = await addComment(user.id, doc.id, newComment.trim());
    if (cmt) {
      setComments([cmt, ...comments]);
      setNewComment('');
    }
  }

  async function handleReport(e: React.FormEvent) {
    e.preventDefault();
    if (!doc || !user) return;
    await createReport(user.id, doc.id, reportReason, reportDetails);
    setShowReport(false);
    setReportDetails('');
  }

  if (loading) {
    return (
      <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 shimmer-bg rounded w-1/2" />
            <div className="h-64 shimmer-bg rounded-2xl" />
            <div className="h-32 shimmer-bg rounded-2xl" />
          </div>
          <div className="h-64 shimmer-bg rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="pt-32 pb-16 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Document not found</h1>
        <Link to="/search" className="text-brand-600 hover:underline">Browse documents</Link>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4 flex-wrap">
          <Link to="/" className="hover:text-brand-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          {doc.subject && (
            <>
              <Link to={`/subjects/${doc.subject.slug}`} className="hover:text-brand-600">{doc.subject.name}</Link>
              <ChevronRight className="h-4 w-4" />
            </>
          )}
          <span className="text-gray-900 dark:text-gray-100 truncate">{doc.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="primary">{DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}</Badge>
                {doc.subject && <Badge>{doc.subject.name}</Badge>}
                {doc.grade && <Badge>{doc.grade.name}</Badge>}
                {doc.stream && <Badge>{doc.stream.name}</Badge>}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display mb-2">{doc.title}</h1>
              {doc.description && <p className="text-gray-600 dark:text-gray-400">{doc.description}</p>}
            </div>

            <Card className="overflow-hidden">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-500" />
                  <span className="text-sm font-medium">{formatFileSize(doc.file_size)} - PDF</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => window.open(doc.file_url, '_blank')}>
                  <Eye className="h-4 w-4" /> Open in new tab
                </Button>
              </div>
              <iframe
                src={doc.file_url}
                className="w-full h-[500px] border-0"
                title="PDF Preview"
              />
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Download, label: 'Downloads', value: formatNumber(doc.download_count) },
                { icon: Eye, label: 'Views', value: formatNumber(doc.view_count) },
                { icon: Star, label: 'Rating', value: Number(doc.rating_avg).toFixed(1) },
                { icon: MessageCircle, label: 'Comments', value: comments.length },
              ].map((s) => (
                <Card key={s.label} className="p-4 text-center">
                  <s.icon className="h-5 w-5 text-brand-500 mx-auto mb-1" />
                  <div className="text-lg font-bold">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </Card>
              ))}
            </div>

            <Card className="p-5">
              <h3 className="font-semibold text-lg mb-4">Comments ({comments.length})</h3>
              {user ? (
                <form onSubmit={handleComment} className="mb-6">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    rows={3}
                  />
                  <Button type="submit" size="sm" className="mt-2" disabled={!newComment.trim()}>
                    Post Comment
                  </Button>
                </form>
              ) : (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center text-sm text-gray-500">
                  <Link to="/login" className="text-brand-600 hover:underline">Sign in</Link> to leave a comment
                </div>
              )}

              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No comments yet. Be the first!</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {c.user_name?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold">{c.user_name ?? 'Anonymous'}</span>
                          <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-5 space-y-3">
              <Button onClick={handleDownload} className="w-full" size="lg">
                <Download className="h-5 w-5" /> Download
              </Button>
              <div className="grid grid-cols-3 gap-2">
                <Button variant={isBookmarked ? 'primary' : 'outline'} size="sm" onClick={handleBookmark}>
                  <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-white' : ''}`} />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigator.share?.({ url: window.location.href }).catch(() => {})}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => user ? setShowReport(true) : navigate('/login')}>
                  <Flag className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-sm mb-3">Rate this document</h3>
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => user ? handleRate(star) : navigate('/login')}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= (hoverRating || userRating)
                          ? 'text-warning-500 fill-warning-500'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {userRating ? `You rated ${userRating} stars` : 'Click to rate'}
              </p>
            </Card>

            <Card className="p-5 space-y-3 text-sm">
              <h3 className="font-semibold">Document Info</h3>
              {doc.teacher && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <Link to="/teachers" className="text-brand-600 hover:underline">{doc.teacher.full_name}</Link>
                </div>
              )}
              {doc.subject && (
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-gray-400" />
                  <Link to={`/subjects/${doc.subject.slug}`} className="text-brand-600 hover:underline">{doc.subject.name}</Link>
                </div>
              )}
              {doc.year && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{doc.year}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span>{formatFileSize(doc.file_size)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>Uploaded {timeAgo(doc.created_at)}</span>
              </div>
            </Card>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold font-display mb-4">Related Documents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((r) => <DocumentCard key={r.id} doc={r} />)}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showReport} onClose={() => setShowReport(false)} title="Report Document" size="sm">
        <form onSubmit={handleReport} className="space-y-4">
          <Select label="Reason" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
            {REPORT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Textarea
            label="Additional details (optional)"
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            rows={3}
            placeholder="Provide more context..."
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setShowReport(false)}>Cancel</Button>
            <Button type="submit" variant="danger">Submit Report</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
