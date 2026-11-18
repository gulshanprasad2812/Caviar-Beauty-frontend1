import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { FiMail, FiLogOut, FiTrash2, FiCheck, FiCornerUpLeft } from 'react-icons/fi';
import api from '@/utils/api';
import { useAuthStore } from '@/store/authStore';
import PageTransition from '@/components/layout/PageTransition';
import toast from 'react-hot-toast';

/**
 * Contact-form inbox. Submissions are stored by the API and, when SMTP is
 * configured, also emailed to CONTACT_TO; this page is the in-app record of
 * everything that came through.
 */
export default function AdminMessages() {
  const { user, logout, isLoading: authLoading } = useAuthStore();
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading: messagesLoading } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: () => api.get('/contact?limit=100').then((r) => r.data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-messages'] });

  const readMutation = useMutation({
    mutationFn: (id) => api.put(`/contact/${id}/read`),
    onSuccess: () => { invalidate(); toast.success('Marked as read'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Could not update the message'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/contact/${id}`),
    onSuccess: () => { invalidate(); toast.success('Message deleted'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Could not delete the message'),
  });

  // The session is restored asynchronously, so a hard load of this URL would
  // otherwise redirect before we know whether the visitor is an admin.
  if (authLoading) {
    return (
      <div className="pt-24 md:pt-32 pb-20 px-4 md:px-8 lg:px-12 min-h-screen text-center text-caviar-400">
        Loading messages...
      </div>
    );
  }

  if (user?.role !== 'ADMIN') return <Navigate to={user ? '/dashboard' : '/login'} replace />;

  const handleLogout = async () => { await logout(); toast.success('Logged out'); };

  const messages = data?.messages || [];
  const unread = messages.filter((m) => !m.isRead).length;
  const visible = unreadOnly ? messages.filter((m) => !m.isRead) : messages;

  return (
    <PageTransition>
      <div className="pt-24 md:pt-32 pb-20 px-4 md:px-8 lg:px-12 min-h-screen">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <p className="section-subtitle">Admin Panel</p>
              <h1 className="section-title mt-3">Messages</h1>
              <div className="w-16 h-[1px] bg-gold-500 mt-6" />
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/admin" className="btn-secondary text-xs">Dashboard</Link>
              <button onClick={handleLogout} className="btn-secondary text-xs flex items-center space-x-2"><FiLogOut className="w-4 h-4" /><span>Logout</span></button>
            </div>
          </div>

          <div className="mb-6 flex items-center space-x-2">
            <button
              onClick={() => setUnreadOnly(false)}
              className={`text-xs tracking-wider uppercase px-3 py-1.5 border transition-colors ${!unreadOnly ? 'bg-gold-500 border-gold-500 text-white' : 'border-caviar-300 dark:border-caviar-600 text-caviar-500 hover:border-gold-500'}`}
            >
              All ({messages.length})
            </button>
            <button
              onClick={() => setUnreadOnly(true)}
              className={`text-xs tracking-wider uppercase px-3 py-1.5 border transition-colors ${unreadOnly ? 'bg-gold-500 border-gold-500 text-white' : 'border-caviar-300 dark:border-caviar-600 text-caviar-500 hover:border-gold-500'}`}
            >
              Unread ({unread})
            </button>
          </div>

          {messagesLoading ? (
            <div className="text-center py-20 text-caviar-400">Loading messages...</div>
          ) : visible.length === 0 ? (
            <div className="text-center py-20">
              <FiMail className="w-12 h-12 mx-auto text-caviar-300 mb-4" />
              <p className="text-caviar-500">{unreadOnly ? 'No unread messages' : 'No messages yet'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visible.map((msg) => (
                <div key={msg.id} className={`border p-6 ${msg.isRead ? 'border-caviar-200 dark:border-caviar-800' : 'border-gold-500'}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-[260px]">
                      <div className="flex items-center space-x-3 flex-wrap">
                        {!msg.isRead && <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 bg-gold-500 text-white">New</span>}
                        <p className="text-sm font-medium">{msg.name}</p>
                        <a href={`mailto:${msg.email}`} className="text-xs text-caviar-500 hover:text-gold-500">{msg.email}</a>
                      </div>
                      <p className="text-sm font-medium mt-2">{msg.subject}</p>
                      <p className="text-sm text-caviar-600 dark:text-caviar-300 mt-1 whitespace-pre-wrap">{msg.message}</p>
                      <p className="text-xs text-caviar-400 mt-3">{new Date(msg.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <a
                        href={`mailto:${msg.email}?subject=${encodeURIComponent(`Re: ${msg.subject}`)}`}
                        className="text-xs tracking-wider uppercase px-3 py-1.5 border border-caviar-300 dark:border-caviar-600 text-caviar-600 dark:text-caviar-300 hover:border-gold-500 hover:text-gold-500 transition-colors flex items-center space-x-2"
                      >
                        <FiCornerUpLeft className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </a>
                      {!msg.isRead && (
                        <button
                          onClick={() => readMutation.mutate(msg.id)}
                          disabled={readMutation.isPending}
                          className="text-xs tracking-wider uppercase px-3 py-1.5 border border-green-400 text-green-600 hover:bg-green-500 hover:text-white transition-colors flex items-center space-x-2"
                        >
                          <FiCheck className="w-3.5 h-3.5" />
                          <span>Mark read</span>
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(msg.id)}
                        disabled={deleteMutation.isPending}
                        className="text-xs tracking-wider uppercase px-3 py-1.5 border border-red-400 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center space-x-2"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
