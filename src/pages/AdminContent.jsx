import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { FiFileText, FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiLogOut, FiSettings, FiExternalLink } from 'react-icons/fi';
import api from '@/utils/api';
import { useAuthStore } from '@/store/authStore';
import PageTransition from '@/components/layout/PageTransition';
import toast from 'react-hot-toast';

const BUILT_IN = new Set([
  'about', 'faq', 'size-guide', 'care-instructions', 'track-order',
  'privacy-policy', 'terms-of-service', 'cookie-policy', 'gdpr-compliance',
]);

const publicPath = (slug) => (BUILT_IN.has(slug) ? `/${slug}` : `/p/${slug}`);

export default function AdminContent() {
  const { user, logout, isLoading: authLoading } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-content-pages'],
    queryFn: () => api.get('/content/admin/pages').then((r) => r.data.pages),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-content-pages'] });

  const toggleMutation = useMutation({
    mutationFn: (page) => api.put(`/content/pages/${page.id}`, { isPublished: !page.isPublished }),
    onSuccess: () => { invalidate(); toast.success('Visibility updated'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/content/pages/${id}`),
    onSuccess: () => { invalidate(); toast.success('Page deleted'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Delete failed'),
  });

  if (authLoading) return <div className="pt-32 text-center text-caviar-400">Checking administrator access...</div>;
  if (user?.role !== 'ADMIN') return <Navigate to={user ? '/dashboard' : '/login'} replace />;

  const handleLogout = async () => { await logout(); toast.success('Logged out'); };

  return (
    <PageTransition>
      <div className="pt-24 md:pt-32 pb-20 px-4 md:px-8 lg:px-12 min-h-screen">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <p className="section-subtitle">Admin Panel</p>
              <h1 className="section-title mt-3">Pages &amp; Content</h1>
              <div className="w-16 h-[1px] bg-gold-500 mt-6" />
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/admin/settings" className="btn-secondary text-xs flex items-center space-x-2">
                <FiSettings className="w-4 h-4" /><span>Site settings</span>
              </Link>
              <Link to="/admin" className="btn-secondary text-xs">Dashboard</Link>
              <button onClick={handleLogout} className="btn-secondary text-xs flex items-center space-x-2">
                <FiLogOut className="w-4 h-4" /><span>Logout</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <p className="text-sm text-caviar-500 max-w-2xl">
              Edit the About, privacy, terms, cookie and support pages, or add your own. Changes go live as soon as you save.
            </p>
            <Link to="/admin/content/new" className="btn-primary text-xs flex items-center space-x-2">
              <FiPlus className="w-4 h-4" /><span>New page</span>
            </Link>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-caviar-400">Loading pages...</div>
          ) : !data?.length ? (
            <div className="text-center py-20 border border-caviar-200 dark:border-caviar-800">
              <FiFileText className="w-12 h-12 mx-auto text-caviar-300 mb-4" />
              <p className="text-caviar-500">No content pages yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-caviar-200 dark:border-caviar-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-caviar-200 dark:border-caviar-800 bg-caviar-50 dark:bg-caviar-900/50">
                    <th className="text-left py-4 px-4 text-xs tracking-wider uppercase text-caviar-500 font-medium">Page</th>
                    <th className="text-left py-4 px-4 text-xs tracking-wider uppercase text-caviar-500 font-medium">Path</th>
                    <th className="text-left py-4 px-4 text-xs tracking-wider uppercase text-caviar-500 font-medium">Status</th>
                    <th className="text-left py-4 px-4 text-xs tracking-wider uppercase text-caviar-500 font-medium">Updated</th>
                    <th className="text-right py-4 px-4 text-xs tracking-wider uppercase text-caviar-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((page) => (
                    <tr key={page.id} className="border-b border-caviar-100 dark:border-caviar-800 hover:bg-caviar-50 dark:hover:bg-caviar-900/50 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-medium">{page.title}</p>
                        <p className="text-xs text-caviar-500">{page.slug}</p>
                      </td>
                      <td className="py-4 px-4">
                        <a
                          href={publicPath(page.slug)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 text-xs text-caviar-500 hover:text-gold-500"
                        >
                          <span>{publicPath(page.slug)}</span>
                          <FiExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-[10px] tracking-wider uppercase px-2 py-0.5 ${
                          page.isPublished
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700'
                            : 'bg-caviar-100 dark:bg-caviar-800 text-caviar-500'
                        }`}>
                          {page.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-caviar-500 text-xs">
                        {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => toggleMutation.mutate(page)}
                            disabled={toggleMutation.isPending}
                            title={page.isPublished ? 'Unpublish' : 'Publish'}
                            className="p-2 text-caviar-400 hover:text-gold-500 transition-colors"
                          >
                            {page.isPublished ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                          </button>
                          <Link to={`/admin/content/${page.id}/edit`} className="p-2 text-caviar-400 hover:text-gold-500 transition-colors">
                            <FiEdit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${page.title}"? Built-in pages can only be unpublished.`)) deleteMutation.mutate(page.id);
                            }}
                            disabled={deleteMutation.isPending}
                            className="p-2 text-caviar-400 hover:text-red-500 transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
