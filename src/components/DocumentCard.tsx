import { Link } from 'react-router-dom';
import { Download, Eye, Star, FileText, Bookmark } from 'lucide-react';
import type { DatabaseDocument } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DOCUMENT_TYPE_LABELS, formatFileSize, formatNumber, timeAgo } from '@/lib/constants';

export function DocumentCard({ doc }: { doc: DatabaseDocument }) {
  return (
    <Link to={`/documents/${doc.id}`}>
      <Card hover className="h-full overflow-hidden group">
        <div className="relative h-32 bg-gradient-to-br from-brand-500/10 to-accent-500/10 dark:from-brand-500/20 dark:to-accent-500/20 flex items-center justify-center overflow-hidden">
          <FileText className="h-12 w-12 text-brand-500/40 group-hover:scale-110 transition-transform duration-300" />
          <div className="absolute top-3 left-3">
            <Badge variant="primary">{DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}</Badge>
          </div>
          {doc.subject && (
            <div
              className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: doc.subject.color ?? '#2563eb' }}
            />
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-1.5 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {doc.title}
          </h3>
          {doc.teacher && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">by {doc.teacher.full_name}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Download className="h-3.5 w-3.5" />
              {formatNumber(doc.download_count)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {formatNumber(doc.view_count)}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-warning-500 fill-warning-500" />
              {Number(doc.rating_avg).toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-400">{timeAgo(doc.created_at)}</span>
            <span className="text-xs text-gray-400">{formatFileSize(doc.file_size)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function DocumentCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden">
      <div className="h-32 shimmer-bg" />
      <div className="p-4 space-y-2">
        <div className="h-4 shimmer-bg rounded w-full" />
        <div className="h-4 shimmer-bg rounded w-2/3" />
        <div className="h-3 shimmer-bg rounded w-1/3" />
        <div className="flex gap-3 pt-2">
          <div className="h-3 shimmer-bg rounded w-12" />
          <div className="h-3 shimmer-bg rounded w-12" />
          <div className="h-3 shimmer-bg rounded w-12" />
        </div>
      </div>
    </Card>
  );
}
