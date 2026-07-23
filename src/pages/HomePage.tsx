import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ArrowRight, Download, Users, FileText, Star,
  TrendingUp, Award, BookOpen, ChevronRight, Sparkles, GraduationCap
} from 'lucide-react';
import type { DatabaseSubject, DatabaseDocument, DatabaseTeacher } from '@/lib/types';
import { getSubjects, getDocuments, getTeachers, getStats } from '@/lib/data';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DocumentCard, DocumentCardSkeleton } from '@/components/DocumentCard';
import { formatNumber } from '@/lib/constants';

export function HomePage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<DatabaseSubject[]>([]);
  const [latestDocs, setLatestDocs] = useState<DatabaseDocument[]>([]);
  const [topDocs, setTopDocs] = useState<DatabaseDocument[]>([]);
  const [teachers, setTeachers] = useState<DatabaseTeacher[]>([]);
  const [stats, setStats] = useState({ documents: 0, downloads: 0, teachers: 0, students: 15000 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      const [subs, latest, top, tchrs, st] = await Promise.all([
        getSubjects(),
        getDocuments({ sort: 'newest', limit: 8 }),
        getDocuments({ sort: 'downloads', limit: 4 }),
        getTeachers(4),
        getStats(),
      ]);
      setSubjects(subs);
      setLatestDocs(latest);
      setTopDocs(top);
      setTeachers(tchrs);
      setStats({ ...st, students: 15000 });
      setLoading(false);
    }
    loadData();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  }

  const categories = [
    { name: 'Lessons', icon: BookOpen, color: 'bg-brand-500', slug: 'lessons' },
    { name: 'Exercises', icon: FileText, color: 'bg-accent-500', slug: 'exercises' },
    { name: 'Exams', icon: GraduationCap, color: 'bg-success-500', slug: 'exams' },
    { name: 'Corrections', icon: Award, color: 'bg-warning-500', slug: 'corrections' },
    { name: 'Revision Sheets', icon: Sparkles, color: 'bg-error-500', slug: 'revision-sheets' },
    { name: 'Books', icon: BookOpen, color: 'bg-brand-600', slug: 'books' },
    { name: 'Summaries', icon: FileText, color: 'bg-accent-600', slug: 'summaries' },
    { name: 'Tests', icon: TrendingUp, color: 'bg-success-600', slug: 'tests' },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-500/20 rounded-full blur-3xl -z-10" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-accent-500/10 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="primary" className="mb-6 animate-fade-in-down">
              <Sparkles className="h-3 w-3" />
              Tunisia's #1 Education Platform
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight text-balance mb-6 animate-fade-in-up">
              Everything you need to{' '}
              <span className="gradient-text">ace your BAC</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto animate-fade-in-up">
              Access thousands of lessons, exercises, exams, and revision materials from Tunisia's best teachers. All in one place, completely free.
            </p>

            <form onSubmit={handleSearch} className="max-w-2xl mx-auto animate-fade-in-up">
              <div className="relative flex items-center glass-strong rounded-2xl shadow-xl p-2">
                <Search className="absolute left-5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for subjects, exams, lessons..."
                  className="flex-1 h-12 pl-12 pr-3 bg-transparent text-sm focus:outline-none"
                />
                <Button type="submit" size="md" className="shrink-0">
                  Search
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-6 animate-fade-in">
              {['Mathematics', 'Physics', 'BAC 2024', 'Computer Science', 'French'].map((tag) => (
                <Link
                  key={tag}
                  to={`/search?q=${encodeURIComponent(tag)}`}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-300 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: FileText, label: 'Documents', value: stats.documents, color: 'text-brand-500' },
              { icon: Download, label: 'Downloads', value: stats.downloads, color: 'text-accent-500' },
              { icon: Users, label: 'Teachers', value: stats.teachers, color: 'text-success-500' },
              { icon: GraduationCap, label: 'Students', value: stats.students, color: 'text-warning-500' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 mb-3">
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-display">{formatNumber(stat.value)}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Subjects */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display mb-2">Popular Subjects</h2>
              <p className="text-gray-500 dark:text-gray-400">Explore materials across all Tunisian secondary subjects</p>
            </div>
            <Link to="/subjects" className="hidden sm:flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400 hover:gap-2 transition-all">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {subjects.slice(0, 8).map((subject) => (
              <Link key={subject.id} to={`/subjects/${subject.slug}`}>
                <Card hover className="p-5 h-full">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${subject.color}15` }}
                    >
                      <BookOpen className="h-5 w-5" style={{ color: subject.color ?? '#2563eb' }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{subject.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Lessons, exams & more</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Documents */}
      <section className="py-16 bg-white dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display mb-2">Latest Uploads</h2>
              <p className="text-gray-500 dark:text-gray-400">Freshly added study materials</p>
            </div>
            <Link to="/search?sort=newest" className="hidden sm:flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400 hover:gap-2 transition-all">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <DocumentCardSkeleton key={i} />)
              : latestDocs.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
          </div>
        </div>
      </section>

      {/* Featured Teachers */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display mb-2">Featured Teachers</h2>
              <p className="text-gray-500 dark:text-gray-400">Learn from the best educators in Tunisia</p>
            </div>
            <Link to="/teachers" className="hidden sm:flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400 hover:gap-2 transition-all">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {teachers.map((teacher) => (
              <Card key={teacher.id} hover className="p-5 text-center">
                <div className="w-16 h-16 rounded-2xl gradient-bg mx-auto mb-4 flex items-center justify-center text-white text-xl font-bold">
                  {teacher.full_name[0]}
                </div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{teacher.full_name}</h3>
                  {teacher.is_verified && (
                    <Badge variant="primary" className="!px-1.5">
                      <Award className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{teacher.bio}</p>
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {formatNumber(teacher.follower_count)}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {teacher.document_count}
                  </span>
                </div>
                {teacher.badges.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-3">
                    {teacher.badges.slice(0, 2).map((badge) => (
                      <Badge key={badge} variant="accent">{badge}</Badge>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Documents */}
      <section className="py-16 bg-white dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display mb-2">Trending Now</h2>
              <p className="text-gray-500 dark:text-gray-400">Most downloaded this week</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <DocumentCardSkeleton key={i} />)
              : topDocs.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold font-display mb-2 text-center">Browse by Category</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-8">Find exactly what you need</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link key={cat.name} to={`/search?category=${cat.slug}`}>
                <Card hover className="p-5 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${cat.color} flex items-center justify-center shrink-0`}>
                    <cat.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-semibold text-sm">{cat.name}</span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl gradient-bg p-8 sm:p-12 lg:p-16 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/20 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold font-display text-white mb-4">
                Ready to start learning?
              </h2>
              <p className="text-white/80 mb-8 max-w-xl mx-auto">
                Join thousands of Tunisian students and teachers. Create your free account today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/register">
                  <Button variant="secondary" size="lg" className="bg-white text-brand-700 hover:bg-gray-100">
                    Get Started Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/subjects">
                  <Button variant="ghost" size="lg" className="text-white hover:bg-white/10">
                    Browse Subjects
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
