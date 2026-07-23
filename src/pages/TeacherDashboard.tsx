import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Upload, FileText, TrendingUp, Award, BarChart3,
  CheckCircle, Clock, XCircle, ChevronRight, Star, Download
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { DatabaseDocument, DatabaseSubject, DatabaseGrade, DatabaseStream, DatabaseCategory } from '@/lib/types';
import {
  getDocumentsByUser, getSubjects, getGrades, getStreams, getCategories, createDocument,
} from '@/lib/data';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Feedback';
import { DOCUMENT_TYPE_LABELS, formatNumber, timeAgo } from '@/lib/constants';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'upload' | 'documents' | 'analytics';

export function TeacherDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [documents, setDocuments] = useState<DatabaseDocument[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [subjects, setSubjects] = useState<DatabaseSubject[]>([]);
  const [grades, setGrades] = useState<DatabaseGrade[]>([]);
  const [streams, setStreams] = useState<DatabaseStream[]>([]);
  const [categories, setCategories] = useState<DatabaseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    Promise.all([getSubjects(), getGrades(), getStreams(), getCategories()]).then(
      ([s, g, st, c]) => {
        setSubjects(s);
        setGrades(g);
        setStreams(st);
        setCategories(c);
      }
    );
  }, []);

  useEffect(() => {
    if (!user) return;
    getDocumentsByUser(user.id).then((docs) => {
      setDocuments(docs);
      setLoading(false);
    });
  }, [user]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    if (!user) return;

    const doc = await createDocument({
      title: fd.get('title') as string,
      description: (fd.get('description') as string) || undefined,
      file_url: fd.get('file_url') as string,
      subject_id: (fd.get('subject_id') as string) || undefined,
      grade_id: (fd.get('grade_id') as string) || undefined,
      stream_id: (fd.get('stream_id') as string) || undefined,
      category_id: (fd.get('category_id') as string) || undefined,
      document_type: fd.get('document_type') as string,
      trimester: parseInt(fd.get('trimester') as string) || 1,
      year: parseInt(fd.get('year') as string) || new Date().getFullYear(),
      uploaded_by: user.id,
    });

    if (doc) {
      setDocuments([doc, ...documents]);
      setShowUpload(false);
      form.reset();
    }
  }

  if (authLoading || !user) return null;

  const totalDownloads = documents.reduce((sum, d) => sum + d.download_count, 0);
  const totalViews = documents.reduce((sum, d) => sum + d.view_count, 0);
  const pending = documents.filter(d => d.status === 'pending').length;
  const approved = documents.filter(d => d.status === 'approved').length;

  const tabs: { id: Tab; label: string; icon: typeof Upload }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'documents', label: 'My Documents', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  const uploadForm = (
    <form onSubmit={handleUpload} className="space-y-4">
      <Input label="Title" name="title" required placeholder="Document title" />
      <Textarea label="Description" name="description" rows={3} placeholder="Brief description" />
      <Input label="PDF URL" name="file_url" required placeholder="https://..." />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Subject" name="subject_id" required>
          <option value="">Select subject</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select label="Category" name="category_id">
          <option value="">Select category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Grade" name="grade_id">
          <option value="">Select grade</option>
          {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </Select>
        <Select label="Stream" name="stream_id">
          <option value="">Select stream</option>
          {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select label="Document Type" name="document_type" required>
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select label="Trimester" name="trimester" defaultValue="1">
          <option value="1">Trimester 1</option>
          <option value="2">Trimester 2</option>
          <option value="3">Trimester 3</option>
        </Select>
      </div>
      <Input label="Year" name="year" type="number" defaultValue={new Date().getFullYear()} />
      <Button type="submit" className="w-full">Submit for Review</Button>
    </form>
  );

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Badge variant="accent" className="mb-2"><Award className="h-3 w-3" /> Teacher Portal</Badge>
            <h1 className="text-2xl font-bold font-display">Teacher Dashboard</h1>
            <p className="text-sm text-gray-500">Manage your documents and track performance</p>
          </div>
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4" /> Upload Document
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-56 shrink-0">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors whitespace-nowrap',
                    tab === t.id ? 'bg-brand-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: FileText, label: 'Documents', value: documents.length, color: 'text-brand-500' },
                    { icon: Download, label: 'Downloads', value: formatNumber(totalDownloads), color: 'text-accent-500' },
                    { icon: TrendingUp, label: 'Views', value: formatNumber(totalViews), color: 'text-success-500' },
                    { icon: Clock, label: 'Pending', value: pending, color: 'text-warning-500' },
                  ].map((s) => (
                    <Card key={s.label} className="p-5">
                      <s.icon className={`h-6 w-6 ${s.color} mb-2`} />
                      <div className="text-2xl font-bold">{s.value}</div>
                      <div className="text-xs text-gray-500">{s.label}</div>
                    </Card>
                  ))}
                </div>

                <Card className="p-5">
                  <h3 className="font-semibold mb-4">Recent Documents</h3>
                  <div className="space-y-2">
                    {documents.slice(0, 5).map((d) => (
                      <Link key={d.id} to={`/documents/${d.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <FileText className="h-8 w-8 text-brand-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate">{d.title}</h4>
                            <p className="text-xs text-gray-500">{timeAgo(d.created_at)}</p>
                          </div>
                          <StatusBadge status={d.status} />
                        </div>
                      </Link>
                    ))}
                    {documents.length === 0 && (
                      <EmptyState icon={<FileText className="h-12 w-12" />} title="No documents yet" description="Upload your first document to get started" />
                    )}
                  </div>
                </Card>
              </div>
            )}

            {tab === 'upload' && (
              <Card className="p-6 max-w-2xl">
                <h2 className="text-xl font-bold mb-4">Upload a Document</h2>
                {uploadForm}
              </Card>
            )}

            {tab === 'documents' && (
              <div>
                <h2 className="text-xl font-bold mb-4">My Documents ({documents.length})</h2>
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 shimmer-bg rounded-2xl" />)}
                  </div>
                ) : documents.length === 0 ? (
                  <EmptyState icon={<FileText className="h-12 w-12" />} title="No documents" description="Upload your first document" />
                ) : (
                  <div className="space-y-2">
                    {documents.map((d) => (
                      <Card key={d.id} className="p-4 flex items-center gap-3">
                        <FileText className="h-8 w-8 text-brand-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Link to={`/documents/${d.id}`} className="font-medium text-sm hover:text-brand-600 truncate block">{d.title}</Link>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {formatNumber(d.download_count)}</span>
                            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {formatNumber(d.view_count)}</span>
                            <span>{timeAgo(d.created_at)}</span>
                          </div>
                        </div>
                        <StatusBadge status={d.status} />
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'analytics' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Performance Overview</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Downloads', value: formatNumber(totalDownloads), icon: Download, color: 'text-brand-500' },
                      { label: 'Total Views', value: formatNumber(totalViews), icon: TrendingUp, color: 'text-accent-500' },
                      { label: 'Approved', value: approved, icon: CheckCircle, color: 'text-success-500' },
                      { label: 'Avg Rating', value: documents.length ? (documents.reduce((s, d) => s + Number(d.rating_avg), 0) / documents.length).toFixed(1) : '0.0', icon: Star, color: 'text-warning-500' },
                    ].map((s) => (
                      <div key={s.label}>
                        <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
                        <div className="text-xl font-bold">{s.value}</div>
                        <div className="text-xs text-gray-500">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Top Documents</h3>
                  <div className="space-y-2">
                    {[...documents].sort((a, b) => b.download_count - a.download_count).slice(0, 5).map((d, i) => (
                      <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                        <span className="text-lg font-bold text-gray-400 w-6">{i + 1}</span>
                        <FileText className="h-8 w-8 text-brand-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Link to={`/documents/${d.id}`} className="text-sm font-medium hover:text-brand-600 truncate block">{d.title}</Link>
                          <p className="text-xs text-gray-500">{DOCUMENT_TYPE_LABELS[d.document_type]}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold">{formatNumber(d.download_count)}</div>
                          <div className="text-xs text-gray-500">downloads</div>
                        </div>
                      </div>
                    ))}
                    {documents.length === 0 && <EmptyState icon={<BarChart3 className="h-12 w-12" />} title="No data yet" />}
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Upload Document" size="lg">
        {uploadForm}
      </Modal>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'success' | 'warning' | 'error'; icon: typeof CheckCircle; label: string }> = {
    approved: { variant: 'success', icon: CheckCircle, label: 'Approved' },
    pending: { variant: 'warning', icon: Clock, label: 'Pending' },
    rejected: { variant: 'error', icon: XCircle, label: 'Rejected' },
  };
  const cfg = map[status] ?? map.pending;
  return (
    <Badge variant={cfg.variant} className="shrink-0">
      <cfg.icon className="h-3 w-3" /> {cfg.label}
    </Badge>
  );
}
