import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, FileText } from 'lucide-react';
import type { DatabaseDocument, DatabaseSubject, DatabaseGrade, DatabaseStream, DatabaseCategory } from '@/lib/types';
import { getDocuments, getSubjects, getGrades, getStreams, getCategories } from '@/lib/data';
import { DocumentCard, DocumentCardSkeleton } from '@/components/DocumentCard';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SORT_OPTIONS } from '@/lib/constants';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState<DatabaseDocument[]>([]);
  const [subjects, setSubjects] = useState<DatabaseSubject[]>([]);
  const [grades, setGrades] = useState<DatabaseGrade[]>([]);
  const [streams, setStreams] = useState<DatabaseStream[]>([]);
  const [categories, setCategories] = useState<DatabaseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const q = searchParams.get('q') ?? '';
  const subjectFilter = searchParams.get('subject') ?? '';
  const gradeFilter = searchParams.get('grade') ?? '';
  const streamFilter = searchParams.get('stream') ?? '';
  const categoryFilter = searchParams.get('category') ?? '';
  const typeFilter = searchParams.get('type') ?? '';
  const sort = (searchParams.get('sort') as 'newest' | 'downloads' | 'rating') ?? 'newest';

  const docTypes = [
    { value: '', label: 'All Types' },
    { value: 'lesson', label: 'Lessons' },
    { value: 'exercises', label: 'Exercises' },
    { value: 'homework', label: 'Homework' },
    { value: 'test', label: 'Tests' },
    { value: 'exam', label: 'Exams' },
    { value: 'correction', label: 'Corrections' },
    { value: 'revision', label: 'Revision Sheets' },
    { value: 'book', label: 'Books' },
    { value: 'summary', label: 'Summaries' },
  ];

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

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    const docs = await getDocuments({
      search: q || undefined,
      subjectId: subjectFilter || undefined,
      gradeId: gradeFilter || undefined,
      streamId: streamFilter || undefined,
      categoryId: categoryFilter || undefined,
      documentType: typeFilter || undefined,
      sort,
      limit: 24,
    });
    setDocuments(docs);
    setLoading(false);
  }, [q, subjectFilter, gradeFilter, streamFilter, categoryFilter, typeFilter, sort]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams());
  }

  const activeFilters = [subjectFilter, gradeFilter, streamFilter, categoryFilter, typeFilter].filter(Boolean).length;

  const filterControls = (
    <div className="space-y-4">
      <Select label="Subject" value={subjectFilter} onChange={(e) => updateFilter('subject', e.target.value)}>
        <option value="">All Subjects</option>
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
      <Select label="Grade" value={gradeFilter} onChange={(e) => updateFilter('grade', e.target.value)}>
        <option value="">All Grades</option>
        {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </Select>
      <Select label="Stream" value={streamFilter} onChange={(e) => updateFilter('stream', e.target.value)}>
        <option value="">All Streams</option>
        {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
      <Select label="Category" value={categoryFilter} onChange={(e) => updateFilter('category', e.target.value)}>
        <option value="">All Categories</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Select label="Document Type" value={typeFilter} onChange={(e) => updateFilter('type', e.target.value)}>
        {docTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </Select>
      {activeFilters > 0 && (
        <Button variant="outline" onClick={clearFilters} className="w-full">Clear all</Button>
      )}
    </div>
  );

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold font-display mb-2">
            {q ? `Results for "${q}"` : 'Browse Documents'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {loading ? 'Searching...' : `${documents.length} documents found`}
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              defaultValue={q}
              placeholder="Search documents..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-sm"
              onChange={(e) => updateFilter('q', e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="shrink-0">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilters > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-brand-600 text-white">{activeFilters}</span>
            )}
          </Button>
        </div>

        <div className="flex gap-6">
          {showFilters && (
            <aside className="w-64 shrink-0 hidden lg:block">
              <div className="sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm">Filters</h3>
                  {activeFilters > 0 && (
                    <button onClick={clearFilters} className="text-xs text-brand-600 hover:underline">Clear all</button>
                  )}
                </div>
                {filterControls}
              </div>
            </aside>
          )}

          <div className="flex-1">
            <div className="flex items-center justify-between mb-4 gap-2">
              {showFilters && (
                <div className="lg:hidden fixed inset-0 z-50">
                  <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
                  <div className="absolute right-0 top-0 bottom-0 w-80 glass-strong p-5 overflow-y-auto animate-slide-in-right">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Filters</h3>
                      <button onClick={() => setShowFilters(false)}><X className="h-5 w-5" /></button>
                    </div>
                    {filterControls}
                  </div>
                </div>
              )}
              <div className="ml-auto w-48">
                <Select value={sort} onChange={(e) => updateFilter('sort', e.target.value)}>
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => <DocumentCardSkeleton key={i} />)}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-1">No documents found</h3>
                <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
