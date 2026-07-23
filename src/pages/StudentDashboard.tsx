import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Bookmark, Download, Bell, User, FileText,
  Clock, Star, ChevronRight, Heart
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { DatabaseDocument, DatabaseNotification } from '@/lib/types';
import {
  getFavorites, getDownloadHistory, getNotifications, markNotificationRead,
  getDocuments,
} from '@/lib/data';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DocumentCard } from '@/components/DocumentCard';
import { EmptyState } from '@/components/ui/Feedback';
import { timeAgo } from '@/lib/constants';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'bookmarks' | 'history' | 'favorites' | 'notifications' | 'profile';

export function StudentDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [bookmarks, setBookmarks] = useState<{ id: string; document: DatabaseDocument }[]>([]);
  const [history, setHistory] = useState<{ id: string; created_at: string; document: DatabaseDocument }[]>([]);
  const [notifications, setNotifications] = useState<DatabaseNotification[]>([]);
  const [recentDocs, setRecentDocs] = useState<DatabaseDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    async function loadData() {
      const [favs, hist, notifs, recent] = await Promise.all([
        getFavorites(user!.id),
        getDownloadHistory(user!.id, 20),
        getNotifications(user!.id, 20),
        getDocuments({ sort: 'newest', limit: 4 }),
      ]);
      setBookmarks(favs);
      setHistory(hist);
      setNotifications(notifs);
      setRecentDocs(recent);
      setLoading(false);
    }
    loadData();
  }, [user]);

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  if (authLoading || !user) return null;

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'history', label: 'Downloads', icon: Download },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white text-xl font-bold">
              {user.full_name?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase() ?? 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display">{user.full_name ?? 'Student'}</h1>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => { signOut(); navigate('/'); }}>
            Sign Out
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
                    tab === t.id
                      ? 'bg-brand-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
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
                    { icon: Bookmark, label: 'Bookmarks', value: bookmarks.length, color: 'text-brand-500' },
                    { icon: Download, label: 'Downloads', value: history.length, color: 'text-accent-500' },
                    { icon: Bell, label: 'Unread', value: notifications.filter(n => !n.is_read).length, color: 'text-warning-500' },
                    { icon: Star, label: 'Member', value: 'Free', color: 'text-success-500' },
                  ].map((s) => (
                    <Card key={s.label} className="p-5">
                      <s.icon className={`h-6 w-6 ${s.color} mb-2`} />
                      <div className="text-2xl font-bold">{s.value}</div>
                      <div className="text-xs text-gray-500">{s.label}</div>
                    </Card>
                  ))}
                </div>

                <Card className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Recently Added</h3>
                    <Link to="/search" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
                      View all <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recentDocs.map((d) => <DocumentCard key={d.id} doc={d} />)}
                  </div>
                </Card>
              </div>
            )}

            {tab === 'bookmarks' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Your Bookmarks</h2>
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-48 shimmer-bg rounded-2xl" />
                    ))}
                  </div>
                ) : bookmarks.length === 0 ? (
                  <EmptyState icon={<Bookmark className="h-12 w-12" />} title="No bookmarks yet" description="Save documents for quick access later" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bookmarks.map((b) => b.document && <DocumentCard key={b.id} doc={b.document} />)}
                  </div>
                )}
              </div>
            )}

            {tab === 'history' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Download History</h2>
                {history.length === 0 ? (
                  <EmptyState icon={<Download className="h-12 w-12" />} title="No downloads yet" description="Documents you download will appear here" />
                ) : (
                  <div className="space-y-2">
                    {history.map((h) => (
                      h.document && (
                        <Link key={h.id} to={`/documents/${h.document.id}`}>
                          <Card hover className="p-4 flex items-center gap-3">
                            <FileText className="h-8 w-8 text-brand-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm truncate">{h.document.title}</h3>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {timeAgo(h.created_at)}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                          </Card>
                        </Link>
                      )
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'favorites' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Your Favorites</h2>
                {bookmarks.length === 0 ? (
                  <EmptyState icon={<Heart className="h-12 w-12" />} title="No favorites yet" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bookmarks.map((b) => b.document && <DocumentCard key={b.id} doc={b.document} />)}
                  </div>
                )}
              </div>
            )}

            {tab === 'notifications' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Notifications</h2>
                {notifications.length === 0 ? (
                  <EmptyState icon={<Bell className="h-12 w-12" />} title="No notifications" />
                ) : (
                  <div className="space-y-2">
                    {notifications.map((n) => (
                      <Card key={n.id} className={cn('p-4', !n.is_read && 'border-brand-300 dark:border-brand-700')}>
                        <div className="flex items-start gap-3">
                          <div className={cn('w-2 h-2 rounded-full mt-2 shrink-0', n.is_read ? 'bg-gray-300' : 'bg-brand-500')} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-medium text-sm">{n.title}</h3>
                              <span className="text-xs text-gray-400 shrink-0">{timeAgo(n.created_at)}</span>
                            </div>
                            {n.body && <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>}
                            {!n.is_read && (
                              <button onClick={() => handleMarkRead(n.id)} className="text-xs text-brand-600 hover:underline mt-1">
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'profile' && (
              <Card className="p-6 max-w-lg">
                <h2 className="text-xl font-bold mb-4">Profile Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user.full_name ?? 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                    <p className="mt-1 text-sm text-gray-500">{user.bio ?? 'No bio set'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 capitalize">{user.role}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
