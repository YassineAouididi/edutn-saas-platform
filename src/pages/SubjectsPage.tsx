import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, ChevronRight, FileText, ArrowLeft } from 'lucide-react';
import type { DatabaseSubject, DatabaseDocument, DatabaseGrade } from '@/lib/types';
import { getSubjects, getSubjectBySlug, getDocuments, getGrades } from '@/lib/data';
import { Card } from '@/components/ui/Card';
import { DocumentCard, DocumentCardSkeleton } from '@/components/DocumentCard';
import { Select } from '@/components/ui/Input';

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<DatabaseSubject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubjects().then((data) => {
      setSubjects(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4">
            <Link to="/" className="hover:text-brand-600">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 dark:text-gray-100">Subjects</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold font-display mb-2">All Subjects</h1>
          <p className="text-gray-500 dark:text-gray-400">Browse materials across {subjects.length} Tunisian secondary subjects</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 9 }).map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl shimmer-bg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 shimmer-bg rounded w-2/3" />
                      <div className="h-3 shimmer-bg rounded w-1/2" />
                    </div>
                  </div>
                </Card>
              ))
            : subjects.map((subject) => (
                <Link key={subject.id} to={`/subjects/${subject.slug}`}>
                  <Card hover className="p-6 h-full">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${subject.color}15` }}
                      >
                        <BookOpen className="h-6 w-6" style={{ color: subject.color ?? '#2563eb' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{subject.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {subject.description ?? 'Lessons, exercises, exams, and revision materials'}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                    </div>
                  </Card>
                </Link>
              ))}
        </div>
      </div>
    </div>
  );
}

export function SubjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [subject, setSubject] = useState<DatabaseSubject | null>(null);
  const [documents, setDocuments] = useState<DatabaseDocument[]>([]);
  const [grades, setGrades] = useState<DatabaseGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!slug) return;
      const sub = await getSubjectBySlug(slug);
      setSubject(sub);
      const gr = await getGrades();
      setGrades(gr);
      setLoading(false);
    }
    loadData();
  }, [slug]);

  useEffect(() => {
    async function loadDocs() {
      if (!subject) return;
      const docs = await getDocuments({
        subjectId: subject.id,
        gradeId: selectedGrade || undefined,
        documentType: selectedType || undefined,
        sort: 'newest',
        limit: 100,
      });
      setDocuments(docs);
    }
    loadDocs();
  }, [subject, selectedGrade, selectedType]);

  const docTypes = ['lesson', 'exercises', 'homework', 'test', 'exam', 'correction', 'revision', 'book', 'summary'];
  const typeLabels: Record<string, string> = {
    lesson: 'Lessons', exercises: 'Exercises', homework: 'Homework', test: 'Tests',
    exam: 'Exams', correction: 'Corrections', revision: 'Revision Sheets', book: 'Books', summary: 'Summaries',
  };

  if (!loading && !subject) {
    return (
      <div className="pt-32 pb-16 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Subject not found</h1>
        <Link to="/subjects" className="text-brand-600 hover:underline">Back to subjects</Link>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          <Link to="/" className="hover:text-brand-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/subjects" className="hover:text-brand-600">Subjects</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 dark:text-gray-100">{subject?.name}</span>
        </nav>

        <Link to="/subjects" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to subjects
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${subject?.color}15` }}
          >
            <BookOpen className="h-8 w-8" style={{ color: subject?.color ?? '#2563eb' }} />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-display">{subject?.name}</h1>
            <p className="text-gray-500 dark:text-gray-400">{subject?.description ?? 'Browse all materials for this subject'}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedType('')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              !selectedType ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {docTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedType === type ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {typeLabels[type]}
            </button>
          ))}
        </div>

        <div className="mb-6 max-w-xs">
          <Select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
            <option value="">All Grades</option>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <DocumentCardSkeleton key={i} />)}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">No documents found</h3>
            <p className="text-sm text-gray-500">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{documents.length} documents found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {documents.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
