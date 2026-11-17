import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiSave, FiTrash2, FiLogOut, FiFileText } from 'react-icons/fi';
import api from '@/utils/api';
import { useAuthStore } from '@/store/authStore';
import PageTransition from '@/components/layout/PageTransition';
import { siteDefaults } from '@/data/siteDefaults';
import toast from 'react-hot-toast';

const emptySlide = () => ({ title: '', subtitle: '', cta: '', ctaHref: '/products', cta2: '', cta2Href: '/collections' });

export default function AdminSettings() {
  const { user, logout, isLoading: authLoading } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(siteDefaults);
  const [loaded, setLoaded] = useState(false);

  const { data } = useQuery({
    queryKey: ['site-settings-admin'],
    queryFn: () => api.get('/site').then((r) => r.data),
  });

  useEffect(() => {
    if (!data) return;
    setForm({ ...siteDefaults, ...data, heroSlides: data.heroSlides?.length ? data.heroSlides : siteDefaults.heroSlides });
    setLoaded(true);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put('/site', payload),
    onSuccess: (response) => {
      queryClient.setQueryData(['site-settings'], response.data);
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      toast.success('Site settings saved');
      navigate('/admin');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Save failed'),
  });

  if (authLoading) return <div className="pt-32 text-center text-caviar-400">Checking administrator access...</div>;
  if (user?.role !== 'ADMIN') return <Navigate to={user ? '/dashboard' : '/login'} replace />;

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setSlide = (index, field, value) => setForm((prev) => ({
    ...prev,
    heroSlides: prev.heroSlides.map((slide, i) => (i === index ? { ...slide, [field]: value } : slide)),
  }));
  const addSlide = () => setForm((prev) => ({ ...prev, heroSlides: [...prev.heroSlides, emptySlide()].slice(0, 6) }));
  const removeSlide = (index) => setForm((prev) => ({ ...prev, heroSlides: prev.heroSlides.filter((_, i) => i !== index) }));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.brandName?.trim()) return toast.error('Brand name is required');
    saveMutation.mutate({
      brandName: form.brandName,
      tagline: form.tagline,
      supportEmail: form.supportEmail,
      supportPhone: form.supportPhone,
      whatsapp: form.whatsapp,
      address: form.address,
      hours: form.hours,
      footerBlurb: form.footerBlurb,
      instagramUrl: form.instagramUrl,
      twitterUrl: form.twitterUrl,
      linkedinUrl: form.linkedinUrl,
      youtubeUrl: form.youtubeUrl,
      announcement: form.announcement,
      announcementEnabled: form.announcementEnabled,
      heroSlides: form.heroSlides.filter((slide) => slide.title?.trim()),
    });
  };

  const handleLogout = async () => { await logout(); toast.success('Logged out'); };

  if (!loaded) return <div className="pt-32 text-center text-caviar-400">Loading settings...</div>;

  return (
    <PageTransition>
      <div className="pt-24 md:pt-32 pb-20 px-4 md:px-8 lg:px-12 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <Link to="/admin" className="text-xs text-caviar-400 hover:text-gold-500 inline-flex items-center space-x-1 mb-3">
                <FiArrowLeft className="w-3 h-3" /><span>Dashboard</span>
              </Link>
              <h1 className="section-title">Site settings</h1>
              <div className="w-16 h-[1px] bg-gold-500 mt-4" />
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/admin/content" className="btn-secondary text-xs flex items-center space-x-2">
                <FiFileText className="w-3 h-3" /><span>Pages</span>
              </Link>
              <button onClick={handleLogout} className="btn-secondary text-xs flex items-center space-x-2">
                <FiLogOut className="w-3 h-3" /><span>Logout</span>
              </button>
              <button type="submit" form="settings-form" disabled={saveMutation.isPending} className="btn-primary text-xs flex items-center space-x-2">
                <FiSave className="w-3 h-3" /><span>{saveMutation.isPending ? 'Saving...' : 'Save settings'}</span>
              </button>
            </div>
          </div>

          <form id="settings-form" onSubmit={handleSubmit} className="space-y-8">
            <section className="p-6 border border-caviar-200 dark:border-caviar-800 space-y-4">
              <h2 className="text-sm tracking-widest uppercase font-medium">Identity</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Brand name</label>
                  <input value={form.brandName || ''} onChange={(e) => set('brandName', e.target.value)} className="input-field" placeholder="Caviar Beauty" />
                </div>
                <div>
                  <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Tagline</label>
                  <input value={form.tagline || ''} onChange={(e) => set('tagline', e.target.value)} className="input-field" placeholder="Timeless luxury, handcrafted" />
                </div>
              </div>
              <div>
                <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Footer description</label>
                <textarea value={form.footerBlurb || ''} onChange={(e) => set('footerBlurb', e.target.value)} rows={3} className="input-field resize-y" />
              </div>
            </section>

            <section className="p-6 border border-caviar-200 dark:border-caviar-800 space-y-4">
              <h2 className="text-sm tracking-widest uppercase font-medium">Contact details</h2>
              <p className="text-xs text-caviar-500">Shown on the Contact page and used across the storefront.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Support email</label>
                  <input type="email" value={form.supportEmail || ''} onChange={(e) => set('supportEmail', e.target.value)} className="input-field" placeholder="hello@caviarbeauty.com" />
                </div>
                <div>
                  <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Phone</label>
                  <input value={form.supportPhone || ''} onChange={(e) => set('supportPhone', e.target.value)} className="input-field" placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">WhatsApp</label>
                  <input value={form.whatsapp || ''} onChange={(e) => set('whatsapp', e.target.value)} className="input-field" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Business hours</label>
                  <input value={form.hours || ''} onChange={(e) => set('hours', e.target.value)} className="input-field" placeholder="Mon - Sat: 10AM - 8PM" />
                </div>
              </div>
              <div>
                <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Address</label>
                <input value={form.address || ''} onChange={(e) => set('address', e.target.value)} className="input-field" placeholder="Street, city, postal code" />
              </div>
            </section>

            <section className="p-6 border border-caviar-200 dark:border-caviar-800 space-y-4">
              <h2 className="text-sm tracking-widest uppercase font-medium">Social links</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ['instagramUrl', 'Instagram'],
                  ['twitterUrl', 'Twitter / X'],
                  ['linkedinUrl', 'LinkedIn'],
                  ['youtubeUrl', 'YouTube'],
                ].map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">{label}</label>
                    <input value={form[field] || ''} onChange={(e) => set(field, e.target.value)} className="input-field" placeholder="https://" />
                  </div>
                ))}
              </div>
            </section>

            <section className="p-6 border border-caviar-200 dark:border-caviar-800 space-y-4">
              <h2 className="text-sm tracking-widest uppercase font-medium">Announcement</h2>
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" checked={Boolean(form.announcementEnabled)} onChange={(e) => set('announcementEnabled', e.target.checked)} />
                <span>Show the announcement above the footer</span>
              </label>
              <input value={form.announcement || ''} onChange={(e) => set('announcement', e.target.value)} className="input-field" placeholder="Complimentary shipping on orders above ₹5,000" />
            </section>

            <section className="p-6 border border-caviar-200 dark:border-caviar-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm tracking-widest uppercase font-medium">Home hero slides</h2>
                  <p className="text-xs text-caviar-500 mt-1">Up to six slides. Leave the list empty to fall back to the shipped defaults.</p>
                </div>
                <button type="button" onClick={addSlide} className="text-xs text-gold-500 flex items-center space-x-1">
                  <FiPlus className="w-3 h-3" /><span>Add slide</span>
                </button>
              </div>
              {form.heroSlides.map((slide, index) => (
                <div key={index} className="p-4 border border-caviar-200 dark:border-caviar-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs tracking-wider uppercase text-caviar-400">Slide {index + 1}</span>
                    <button type="button" onClick={() => removeSlide(index)} className="p-1 text-caviar-400 hover:text-red-500">
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input value={slide.title || ''} onChange={(e) => setSlide(index, 'title', e.target.value)} className="input-field" placeholder="Headline" />
                    <input value={slide.subtitle || ''} onChange={(e) => setSlide(index, 'subtitle', e.target.value)} className="input-field" placeholder="Eyebrow text" />
                    <input value={slide.cta || ''} onChange={(e) => setSlide(index, 'cta', e.target.value)} className="input-field" placeholder="Primary button label" />
                    <input value={slide.ctaHref || ''} onChange={(e) => setSlide(index, 'ctaHref', e.target.value)} className="input-field" placeholder="/products" />
                    <input value={slide.cta2 || ''} onChange={(e) => setSlide(index, 'cta2', e.target.value)} className="input-field" placeholder="Secondary button label" />
                    <input value={slide.cta2Href || ''} onChange={(e) => setSlide(index, 'cta2Href', e.target.value)} className="input-field" placeholder="/collections" />
                  </div>
                </div>
              ))}
            </section>

            <div className="flex items-center justify-end space-x-3">
              <Link to="/admin" className="btn-secondary text-xs">Cancel</Link>
              <button type="submit" disabled={saveMutation.isPending} className="btn-primary text-xs flex items-center space-x-2">
                <FiSave className="w-3 h-3" /><span>{saveMutation.isPending ? 'Saving...' : 'Save settings'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageTransition>
  );
}
