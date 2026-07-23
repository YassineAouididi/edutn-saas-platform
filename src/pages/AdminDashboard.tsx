import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, CheckCircle, XCircle,
  Clock, BarChart3, Settings, BookOpen, Download,
  Eye, Tag, Upload, FileUp, X, AlertCircle, Users,
  Pencil, Trash2, Search, Shield, UserCheck, UserX,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { DatabaseDocument, DatabaseSubject, DatabaseGrade, DatabaseStream, DatabaseCategory, DatabaseUser } from '@/lib/types';
import {
  getAllDocuments, getSubjects, getGrades, getStreams, getCategories, updateDocumentStatus, createDocument,
  getAllUsers, updateUser, deleteUser, updateDocument, deleteDocument,
} from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Feedback';
import { formatNumber, timeAgo, DOCUMENT_TYPE_LABELS, formatFileSize } from '@/lib/constants';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'upload' | 'documents' | 'users' | 'categories' | 'subjects' | 'grades' | 'streams';

export function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [documents, setDocuments] = useState<DatabaseDocument[]>([]);
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [subjects, setSubjects] = useState<DatabaseSubject[]>([]);
  const [grades, setGrades] = useState<DatabaseGrade[]>([]);
  const [streams, setStreams] = useState<DatabaseStream[]>([]);
  const [categories, setCategories] = useState<DatabaseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Edit document state
  const [editingDoc, setEditingDoc] = useState<DatabaseDocument | null>(null);
  const [showEditDoc, setShowEditDoc] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'document' | 'user'; id: string; name: string } | null>(null);

  // Edit user state
  const [editingUser, setEditingUser] = useState<DatabaseUser | null>(null);
  const [showEditUser, setShowEditUser] = useState(false);

  // Search
  const [docSearch, setDocSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    async function loadData() {
      const [docs, usrs, subs, grds, strms, cats] = await Promise.all([
        getAllDocuments(),
        getAllUsers(),
        getSubjects(),
        getGrades(),
        getStreams(),
        getCategories(),
      ]);
      setDocuments(docs);
      setUsers(usrs);
      setSubjects(subs);
      setGrades(grds);
      setStreams(strms);
      setCategories(cats);
      setLoading(false);
    }
    loadData();
  }, []);

  async function approveDocument(id: string) {
    await updateDocumentStatus(id, 'approved');
    setDocuments(documents.map(d => d.id === id ? { ...d, status: 'approved' } : d));
  }

  async function rejectDocument(id: string) {
    await updateDocumentStatus(id, 'rejected');
    setDocuments(documents.map(d => d.id === id ? { ...d, status: 'rejected' } : d));
  }

  const handleFileSelect = useCallback((file: File | null) => {
    if (file && file.type !== 'application/pdf') {
      setUploadError('Please select a PDF file');
      return;
    }
    if (file && file.size > 50 * 1024 * 1024) {
      setUploadError('File size must be under 50MB');
      return;
    }
    setUploadError(null);
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }, [handleFileSelect]);

  function resetUpload() {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadError(null);
    setUploading(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    if (!user) return;

    if (!selectedFile) {
      setUploadError('Please select a PDF file to upload');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    const fileExt = selectedFile.name.split('.').pop() ?? 'pdf';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    try {
      const { error: upErr } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false });

      if (upErr) throw upErr;
      setUploadProgress(100);

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

      const doc = await createDocument({
        title: fd.get('title') as string,
        description: (fd.get('description') as string) || undefined,
        file_url: urlData.publicUrl,
        file_size: selectedFile.size,
        subject_id: (fd.get('subject_id') as string) || undefined,
        grade_id: (fd.get('grade_id') as string) || undefined,
        stream_id: (fd.get('stream_id') as string) || undefined,
        category_id: (fd.get('category_id') as string) || undefined,
        document_type: fd.get('document_type') as string,
        trimester: parseInt(fd.get('trimester') as string) || 1,
        year: parseInt(fd.get('year') as string) || new Date().getFullYear(),
        uploaded_by: user.id,
        status: 'approved',
      });

      if (doc) {
        setDocuments([doc, ...documents]);
        setShowUpload(false);
        resetUpload();
        form.reset();
        setTab('documents');
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleEditDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDoc) return;
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);

    const updated = await updateDocument(editingDoc.id, {
      title: fd.get('title') as string,
      description: (fd.get('description') as string) || undefined,
      subject_id: (fd.get('subject_id') as string) || null,
      grade_id: (fd.get('grade_id') as string) || null,
      stream_id: (fd.get('stream_id') as string) || null,
      category_id: (fd.get('category_id') as string) || null,
      document_type: fd.get('document_type') as string,
      trimester: parseInt(fd.get('trimester') as string) || 1,
      year: parseInt(fd.get('year') as string) || new Date().getFullYear(),
      status: fd.get('status') as string,
    });

    if (updated) {
      setDocuments(documents.map(d => d.id === updated.id ? updated : d));
      setShowEditDoc(false);
      setEditingDoc(null);
    }
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);

    const updated = await updateUser(editingUser.id, {
      full_name: fd.get('full_name') as string,
      role: fd.get('role') as string,
      is_active: fd.get('is_active') === 'true',
      bio: (fd.get('bio') as string) || undefined,
      grade_id: (fd.get('grade_id') as string) || null,
      stream_id: (fd.get('stream_id') as string) || null,
    });

    if (updated) {
      setUsers(users.map(u => u.id === updated.id ? updated : u));
      setShowEditUser(false);
      setEditingUser(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'document') {
      const ok = await deleteDocument(deleteTarget.id);
      if (ok) setDocuments(documents.filter(d => d.id !== deleteTarget.id));
    } else {
      const ok = await deleteUser(deleteTarget.id);
      if (ok) setUsers(users.filter(u => u.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  }

  if (authLoading || !user) return null;

  const pendingDocs = documents.filter(d => d.status === 'pending');
  const totalDownloads = documents.reduce((s, d) => s + d.download_count, 0);
  const totalViews = documents.reduce((s, d) => s + d.view_count, 0);
  const activeUsers = users.filter(u => u.is_active).length;

  const filteredDocs = docSearch
    ? documents.filter(d => d.title.toLowerCase().includes(docSearch.toLowerCase()))
    : documents;
  const filteredUsers = userSearch
    ? users.filter(u =>
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.full_name ?? '').toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'grades', label: 'Grades', icon: BarChart3 },
    { id: 'streams', label: 'Streams', icon: Settings },
  ];

  const fileDropZone = (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => document.getElementById('admin-file-input')?.click()}
      className={cn(
        'relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
        dragOver
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 scale-[1.02]'
          : 'border-gray-300 dark:border-gray-700 hover:border-brand-400 dark:hover:border-brand-600',
        selectedFile && 'border-success-400 bg-success-50 dark:bg-success-900/10'
      )}
    >
      <input id="admin-file-input" type="file" accept="application/pdf" className="hidden"
        onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)} />
      {selectedFile ? (
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
            <FileText className="h-6 w-6 text-success-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); resetUpload(); }}
            className="ml-2 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      ) : (
        <div>
          <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-3">
            <FileUp className="h-6 w-6 text-brand-600" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Drop your PDF here, or click to browse</p>
          <p className="text-xs text-gray-400">PDF files only, up to 50MB</p>
        </div>
      )}
    </div>
  );

  const uploadForm = (
    <form onSubmit={handleUpload} className="space-y-4">
      {fileDropZone}
      {uploadError && (
        <div className="p-3 rounded-xl bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{uploadError}
        </div>
      )}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
            <span className="font-medium text-brand-600">{uploadProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div className="h-full gradient-bg transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}
      <Input label="Title" name="title" required placeholder="Document title" />
      <Textarea label="Description" name="description" rows={3} placeholder="Brief description" />
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
        <Select label="Document Type" name="document_type" required defaultValue="lesson">
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select label="Trimester" name="trimester" defaultValue="1">
          <option value="1">Trimester 1</option>
          <option value="2">Trimester 2</option>
          <option value="3">Trimester 3</option>
        </Select>
      </div>
      <Input label="Year" name="year" type="number" defaultValue={new Date().getFullYear()} />
      <Button type="submit" className="w-full" loading={uploading} disabled={!selectedFile}>
        {uploading ? 'Uploading...' : 'Publish Document'}
      </Button>
    </form>
  );

  const editDocForm = editingDoc && (
    <form onSubmit={handleEditDoc} className="space-y-4">
      <Input label="Title" name="title" required defaultValue={editingDoc.title} />
      <Textarea label="Description" name="description" rows={3} defaultValue={editingDoc.description ?? ''} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Subject" name="subject_id" defaultValue={editingDoc.subject_id ?? ''}>
          <option value="">None</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select label="Category" name="category_id" defaultValue={editingDoc.category_id ?? ''}>
          <option value="">None</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Grade" name="grade_id" defaultValue={editingDoc.grade_id ?? ''}>
          <option value="">None</option>
          {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </Select>
        <Select label="Stream" name="stream_id" defaultValue={editingDoc.stream_id ?? ''}>
          <option value="">None</option>
          {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select label="Document Type" name="document_type" defaultValue={editingDoc.document_type}>
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select label="Trimester" name="trimester" defaultValue={String(editingDoc.trimester)}>
          <option value="1">Trimester 1</option>
          <option value="2">Trimester 2</option>
          <option value="3">Trimester 3</option>
        </Select>
        <Select label="Status" name="status" defaultValue={editingDoc.status}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Input label="Year" name="year" type="number" defaultValue={editingDoc.year ?? new Date().getFullYear()} />
      </div>
      <Button type="submit" className="w-full">Save Changes</Button>
    </form>
  );

  const editUserForm = editingUser && (
    <form onSubmit={handleEditUser} className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 mb-2">
        <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
          <Users className="h-5 w-5 text-brand-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{editingUser.email}</p>
          <p className="text-xs text-gray-500">Joined {timeAgo(editingUser.created_at)}</p>
        </div>
      </div>
      <Input label="Full Name" name="full_name" defaultValue={editingUser.full_name ?? ''} />
      <Textarea label="Bio" name="bio" rows={2} defaultValue={editingUser.bio ?? ''} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Role" name="role" defaultValue={editingUser.role}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </Select>
        <Select label="Status" name="is_active" defaultValue={String(editingUser.is_active)}>
          <option value="true">Active</option>
          <option value="false">Disabled</option>
        </Select>
        <Select label="Grade" name="grade_id" defaultValue={editingUser.grade_id ?? ''}>
          <option value="">None</option>
          {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </Select>
        <Select label="Stream" name="stream_id" defaultValue={editingUser.stream_id ?? ''}>
          <option value="">None</option>
          {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>
      <Button type="submit" className="w-full">Save Changes</Button>
    </form>
  );

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Badge variant="error" className="mb-2">Admin</Badge>
            <h1 className="text-2xl font-bold font-display">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Manage platform content and users</p>
          </div>
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4" /> Add Document
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-56 shrink-0">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors whitespace-nowrap',
                    tab === t.id ? 'bg-brand-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}>
                  <t.icon className="h-4 w-4" />{t.label}
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
                    { icon: Clock, label: 'Pending', value: pendingDocs.length, color: 'text-warning-500' },
                    { icon: Users, label: 'Users', value: users.length, color: 'text-accent-500' },
                    { icon: UserCheck, label: 'Active', value: activeUsers, color: 'text-success-500' },
                    { icon: Download, label: 'Downloads', value: formatNumber(totalDownloads), color: 'text-accent-500' },
                    { icon: Eye, label: 'Views', value: formatNumber(totalViews), color: 'text-success-500' },
                  ].map((s) => (
                    <Card key={s.label} className="p-5">
                      <s.icon className={`h-6 w-6 ${s.color} mb-2`} />
                      <div className="text-2xl font-bold">{s.value}</div>
                      <div className="text-xs text-gray-500">{s.label}</div>
                    </Card>
                  ))}
                </div>

                <Card className="p-5">
                  <h3 className="font-semibold mb-4">Pending Approvals</h3>
                  {pendingDocs.length === 0 ? (
                    <EmptyState icon={<CheckCircle className="h-12 w-12" />} title="All caught up!" description="No documents pending approval" />
                  ) : (
                    <div className="space-y-2">
                      {pendingDocs.slice(0, 5).map((d) => (
                        <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                          <FileText className="h-8 w-8 text-brand-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate">{d.title}</h4>
                            <p className="text-xs text-gray-500">{timeAgo(d.created_at)}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="success" onClick={() => approveDocument(d.id)}><CheckCircle className="h-4 w-4" /></Button>
                            <Button size="sm" variant="danger" onClick={() => rejectDocument(d.id)}><XCircle className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {tab === 'upload' && (
              <Card className="p-6 max-w-2xl">
                <h2 className="text-xl font-bold mb-1">Upload a Document</h2>
                <p className="text-sm text-gray-500 mb-4">Admin uploads are auto-approved and immediately visible to users.</p>
                {uploadForm}
              </Card>
            )}

            {tab === 'documents' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl font-bold">All Documents ({documents.length})</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      placeholder="Search documents..."
                      className="pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/50 w-full sm:w-64"
                    />
                  </div>
                </div>
                {loading ? (
                  <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 shimmer-bg rounded-2xl" />)}</div>
                ) : filteredDocs.length === 0 ? (
                  <EmptyState icon={<FileText className="h-12 w-12" />} title="No documents found" description={docSearch ? "Try a different search" : "Upload your first document"} />
                ) : (
                  <div className="space-y-2">
                    {filteredDocs.map((d) => (
                      <Card key={d.id} className="p-4 flex items-center gap-3">
                        <FileText className="h-8 w-8 text-brand-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate">{d.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span>{DOCUMENT_TYPE_LABELS[d.document_type]}</span>
                            <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {formatNumber(d.download_count)}</span>
                            <span>{timeAgo(d.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {d.status === 'pending' && (
                            <>
                              <Button size="sm" variant="success" onClick={() => approveDocument(d.id)} title="Approve"><CheckCircle className="h-4 w-4" /></Button>
                              <Button size="sm" variant="danger" onClick={() => rejectDocument(d.id)} title="Reject"><XCircle className="h-4 w-4" /></Button>
                            </>
                          )}
                          <Badge variant={d.status === 'approved' ? 'success' : d.status === 'pending' ? 'warning' : 'error'}>{d.status}</Badge>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingDoc(d); setShowEditDoc(true); }} title="Edit"><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget({ type: 'document', id: d.id, name: d.title })} title="Delete"><Trash2 className="h-4 w-4 text-error-500" /></Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'users' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl font-bold">All Users ({users.length})</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by name or email..."
                      className="pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/50 w-full sm:w-64"
                    />
                  </div>
                </div>
                {loading ? (
                  <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 shimmer-bg rounded-2xl" />)}</div>
                ) : filteredUsers.length === 0 ? (
                  <EmptyState icon={<Users className="h-12 w-12" />} title="No users found" description={userSearch ? "Try a different search" : "No users registered yet"} />
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map((u) => (
                      <Card key={u.id} className="p-4 flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                          u.role === 'admin' ? 'bg-error-100 dark:bg-error-900/30' :
                          u.role === 'teacher' ? 'bg-accent-100 dark:bg-accent-900/30' :
                          'bg-brand-100 dark:bg-brand-900/30'
                        )}>
                          {u.role === 'admin' ? <Shield className="h-5 w-5 text-error-600" /> :
                           u.role === 'teacher' ? <BookOpen className="h-5 w-5 text-accent-600" /> :
                           <Users className="h-5 w-5 text-brand-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium truncate">{u.full_name || 'Unnamed'}</h4>
                            <Badge variant={u.role === 'admin' ? 'error' : u.role === 'teacher' ? 'accent' : 'primary'}>{u.role}</Badge>
                            {!u.is_active && <Badge variant="warning"><UserX className="h-3 w-3" /> Disabled</Badge>}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{u.email} - Joined {timeAgo(u.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingUser(u); setShowEditUser(true); }} title="Edit"><Pencil className="h-4 w-4" /></Button>
                          {u.id !== user.id && (
                            <Button size="sm" variant="ghost" onClick={() => setDeleteTarget({ type: 'user', id: u.id, name: u.full_name || u.email })} title="Delete"><Trash2 className="h-4 w-4 text-error-500" /></Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(tab === 'categories' || tab === 'subjects' || tab === 'grades' || tab === 'streams') && (
              <CRUDView
                title={tab.charAt(0).toUpperCase() + tab.slice(1)}
                items={
                  tab === 'categories' ? categories :
                  tab === 'subjects' ? subjects :
                  tab === 'grades' ? grades :
                  streams
                }
              />
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={showUpload} onClose={() => { setShowUpload(false); resetUpload(); }} title="Add Document" size="lg">
        {uploadForm}
      </Modal>

      <Modal isOpen={showEditDoc} onClose={() => { setShowEditDoc(false); setEditingDoc(null); }} title="Edit Document" size="lg">
        {editDocForm}
      </Modal>

      <Modal isOpen={showEditUser} onClose={() => { setShowEditUser(false); setEditingUser(null); }} title="Edit User" size="lg">
        {editUserForm}
      </Modal>

      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Confirm Delete" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
              <Trash2 className="h-6 w-6 text-error-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Delete this {deleteTarget?.type}?</p>
              <p className="text-xs text-gray-500">"{deleteTarget?.name}"</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This action cannot be undone. {deleteTarget?.type === 'user' ? 'All their data will be permanently removed.' : 'The document will be permanently removed.'}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={confirmDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CRUDView({ title, items }: { title: string; items: { id: string; name: string; slug: string }[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{title} ({items.length})</h2>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Slug</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.slug}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
