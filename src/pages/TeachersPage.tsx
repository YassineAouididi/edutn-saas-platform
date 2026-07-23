import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Users, FileText, ChevronRight } from 'lucide-react';
import type { DatabaseTeacher } from '@/lib/types';
import { getTeachers } from '@/lib/data';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/constants';

export function TeachersPage() {
  const [teachers, setTeachers] = useState<DatabaseTeacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeachers().then((data) => {
      setTeachers(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          <Link to="/" className="hover:text-brand-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 dark:text-gray-100">Teachers</span>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-bold font-display mb-2">Featured Teachers</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Meet the educators behind the content</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <Card key={i} className="p-6"><div className="h-20 shimmer-bg rounded" /></Card>)
            : teachers.map((teacher) => (
                <Card key={teacher.id} hover className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center text-white text-xl font-bold shrink-0">
                      {teacher.full_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{teacher.full_name}</h3>
                        {teacher.is_verified && (
                          <Badge variant="primary" className="!px-1.5"><Award className="h-3 w-3" /></Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{teacher.bio}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {formatNumber(teacher.follower_count)} followers</span>
                        <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {teacher.document_count} docs</span>
                      </div>
                      {teacher.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {teacher.badges.map((badge) => <Badge key={badge} variant="accent">{badge}</Badge>)}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
        </div>
      </div>
    </div>
  );
}
