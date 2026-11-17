import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiSave, FiTrash2, FiExternalLink } from 'react-icons/fi';
import api from '@/utils/api';
import { useAuthStore } from '@/store/authStore';
import PageTransition from '@/components/layout/PageTransition';
import toast from 'react-hot-toast';

const BUILT_IN = new Set([
  'about', 'faq', 'size-guide', 'care-instructions', 'track-order',
  'privacy-policy', 'terms-of-service', 'cookie-policy', 'gdpr-compliance',
]);

const lines = (value) => (typeof value === 'string' ? value.split('\n').map((line) => line.trim()).filter(Boolean) : []);
const text = (value) => (Array.isArray(value) ? value.join('\n') : '');

const emptySection = () => ({ heading: '', body: '', items: '', columns: '', rows: '' });
const emptyValue = () => ({ title: '', desc: '' });

const toEditor = (sections = []) => sections.map((section) => ({
  heading: section.heading || '',
  body: text(section.body),
  items: text(section.items),
  columns: Array.isArray(section.table?.columns) ? section.table.columns.join(', ') : '',
  rows: Array.isArray(section.table?.rows) ? section.table.rows.map((row) => row.join(' | ')).join('\n') : '',
}));

const fromEditor = (sections) => sections
  .map((section) => {
    const columns = section.columns.split(',').map((column) => column.trim()).filter(Boolean);
    const rows = lines(section.rows).map((row) => row.split('|').map((cell) => cell.trim()));
    return {
      heading: section.heading.trim(),
      body: lines(section.body),
      items: lines(section.items),
      table: columns.length ? { columns, rows } : null,
    };
  })
  .filter((section) => section.heading || section.body.length || section.items.length || section.table);

export default function AdminContentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthStore();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    slug: '',
    title: '',
    subtitle: '',
    seoTitle: '',
    seoDesc: '',
    layout: 'article',
    isPublished: true,
    sections: [emptySection()],
    founded: '',
    imageUrl: '',
    story: '',
    values: [],
  });
  const [loaded, setLoaded] = useState(!isEdit);

  const { data: page } = useQuery({
    queryKey: ['admin-content-page', id],
    queryFn: () => api.get(`/content/admin/pages/${id}`).then((r) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!page) return;
    setForm({
      slug: page.slug,
      title: page.title || '',
      subtitle: page.subtitle || '',
      seoTitle: page.seoTitle || '',
      seoDesc: page.seoDesc || '',
      layout: page.layout || 'article',
      isPublished: page.isPublished !== false,
      sections: toEditor(page.sections || []).length ? toEditor(page.sections || []) : [emptySection()],
      founded: page.data?.founded || '',
      imageUrl: page.data?.imageUrl || '',
      story: text(page.data?.story),
      values: page.data?.values || [],
    });
    setLoaded(true);
  }, [page]);

  const saveMutation = useMutation({
    mutationFn: (payload) => (isEdit ? api.put(`/content/pages/${id}`, payload) : api.post('/content/pages', payload)),
    onSuccess: () => {
      toast.success(isEdit ? 'Page saved' : 'Page created');
      navigate('/admin/content');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Save failed'),
  });

  if (authLoading) return <div className="pt-32 text-center text-caviar-400">Checking administrator access...</div>;
  if (user?.role !== 'ADMIN') return <Navigate to={user ? '/dashboard' : '/login'} replace />;

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setSection = (index, field, value) => setForm((prev) => ({
    ...prev,
    sections: prev.sections.map((section, i) => (i === index ? { ...section, [field]: value } : section)),
  }));
  const addSection = () => setForm((prev) => ({ ...prev, sections: [...prev.sections, emptySection()] }));
  const removeSection = (index) => setForm((prev) => ({ ...prev, sections: prev.sections.filter((_, i) => i !== index) }));
  const setValue = (index, field, value) => setForm((prev) => ({
    ...prev,
    values: prev.values.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
  }));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) return toast.error('A title is required');
    if (!isEdit && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())) {
      return toast.error('Slug must use lowercase letters, numbers and hyphens');
    }

    const payload = {
      title: form.title,
      subtitle: form.subtitle,
      seoTitle: form.seoTitle,
      seoDesc: form.seoDesc,
      layout: form.layout,
      isPublished: form.isPublished,
      sections: form.layout === 'about' ? [] : fromEditor(form.sections),
      data: form.layout === 'about'
        ? {
            founded: form.founded,
            imageUrl: form.imageUrl,
            story: lines(form.story),
            values: form.values.filter((value) => value.title?.trim() || value.desc?.trim()),
          }
        : null,
    };
    if (!isEdit || !BUILT_IN.has(form.slug)) payload.slug = form.slug.trim();

    saveMutation.mutate(payload);
  };

  if (isEdit && !loaded) {
    return <div className="pt-32 text-center text-caviar-400">Loading page...</div>;
  }

  const previewPath = BUILT_IN.has(form.slug) ? `/${form.slug}` : `/p/${form.slug}`;

  return (
    <PageTransition>
      <div className="pt-24 md:pt-32 pb-20 px-4 md:px-8 lg:px-12 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <Link to="/admin/content" className="text-xs text-caviar-400 hover:text-gold-500 inline-flex items-center space-x-1 mb-3">
                <FiArrowLeft className="w-3 h-3" /><span>Pages</span>
              </Link>
              <h1 className="section-title">{isEdit ? 'Edit page' : 'New page'}</h1>
              <div className="w-16 h-[1px] bg-gold-500 mt-4" />
            </div>
            <div className="flex items-center space-x-3">
              {isEdit && (
                <a href={previewPath} target="_blank" rel="noreferrer" className="btn-secondary text-xs flex items-center space-x-2">
                  <FiExternalLink className="w-3 h-3" /><span>Preview</span>
                </a>
              )}
              <button type="submit" form="page-form" disabled={saveMutation.isPending} className="btn-primary text-xs flex items-center space-x-2">
                <FiSave className="w-3 h-3" /><span>{saveMutation.isPending ? 'Saving...' : 'Save page'}</span>
              </button>
            </div>
          </div>

          <form id="page-form" onSubmit={handleSubmit} className="space-y-8">
            <section className="p-6 border border-caviar-200 dark:border-caviar-800 space-y-4">
              <h2 className="text-sm tracking-widest uppercase font-medium">Page details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Title</label>
                  <input value={form.title} onChange={(e) => set('title', e.target.value)} className="input-field" placeholder="Privacy Policy" />
                </div>
                <div>
                  <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">
                    Slug {isEdit && BUILT_IN.has(form.slug) && <span className="text-caviar-400 normal-case">(fixed for built-in pages)</span>}
                  </label>
                  <input
                    value={form.slug}
                    onChange={(e) => set('slug', e.target.value)}
                    className="input-field"
                    placeholder="privacy-policy"
                    readOnly={isEdit && BUILT_IN.has(form.slug)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Subtitle</label>
                  <input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} className="input-field" placeholder="The Fine Print" />
                </div>
                <div>
                  <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Layout</label>
                  <select value={form.layout} onChange={(e) => set('layout', e.target.value)} className="input-field">
                    <option value="article">Article (headings, paragraphs, lists, tables)</option>
                    <option value="about">About page (story and values)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">SEO title</label>
                  <input value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} className="input-field" placeholder="Privacy Policy | Caviar Beauty" />
                </div>
                <div>
                  <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">SEO description</label>
                  <input value={form.seoDesc} onChange={(e) => set('seoDesc', e.target.value)} className="input-field" placeholder="One sentence for search results" />
                </div>
              </div>
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => set('isPublished', e.target.checked)} />
                <span>Published (visible on the storefront)</span>
              </label>
            </section>

            {form.layout === 'about' ? (
              <section className="p-6 border border-caviar-200 dark:border-caviar-800 space-y-4">
                <h2 className="text-sm tracking-widest uppercase font-medium">About page</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Founded label</label>
                    <input value={form.founded} onChange={(e) => set('founded', e.target.value)} className="input-field" placeholder="Founded 2024" />
                  </div>
                  <div>
                    <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Image URL</label>
                    <input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} className="input-field" placeholder="/uploads/atelier.jpg (leave blank for the CB mark)" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Story — one paragraph per line</label>
                  <textarea value={form.story} onChange={(e) => set('story', e.target.value)} rows={8} className="input-field resize-y" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs tracking-wider uppercase text-caviar-500">Values</label>
                    <button type="button" onClick={() => set('values', [...form.values, emptyValue()])} className="text-xs text-gold-500 flex items-center space-x-1">
                      <FiPlus className="w-3 h-3" /><span>Add value</span>
                    </button>
                  </div>
                  {form.values.map((value, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 items-start">
                      <input value={value.title} onChange={(e) => setValue(index, 'title', e.target.value)} className="input-field" placeholder="Craftsmanship" />
                      <input value={value.desc} onChange={(e) => setValue(index, 'desc', e.target.value)} className="input-field" placeholder="One sentence about this value" />
                      <button type="button" onClick={() => set('values', form.values.filter((_, i) => i !== index))} className="p-3 text-caviar-400 hover:text-red-500">
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="p-6 border border-caviar-200 dark:border-caviar-800 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm tracking-widest uppercase font-medium">Sections</h2>
                  <button type="button" onClick={addSection} className="text-xs text-gold-500 flex items-center space-x-1">
                    <FiPlus className="w-3 h-3" /><span>Add section</span>
                  </button>
                </div>
                {form.sections.length === 0 && <p className="text-sm text-caviar-500">No sections yet. Add one to start writing.</p>}
                {form.sections.map((section, index) => (
                  <div key={index} className="p-5 border border-caviar-200 dark:border-caviar-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs tracking-wider uppercase text-caviar-400">Section {index + 1}</span>
                      <button type="button" onClick={() => removeSection(index)} className="p-1 text-caviar-400 hover:text-red-500">
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input value={section.heading} onChange={(e) => setSection(index, 'heading', e.target.value)} className="input-field" placeholder="Heading, e.g. Ordering & Payment" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Paragraphs — one per line</label>
                        <textarea value={section.body} onChange={(e) => setSection(index, 'body', e.target.value)} rows={4} className="input-field resize-y" />
                      </div>
                      <div>
                        <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Bullets — one per line</label>
                        <textarea value={section.items} onChange={(e) => setSection(index, 'items', e.target.value)} rows={4} className="input-field resize-y" />
                      </div>
                    </div>
                    <details className="text-sm">
                      <summary className="cursor-pointer text-xs tracking-wider uppercase text-caviar-500">Optional table</summary>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Columns — comma separated</label>
                          <input value={section.columns} onChange={(e) => setSection(index, 'columns', e.target.value)} className="input-field" placeholder="EU, UK, US, IN" />
                        </div>
                        <div>
                          <label className="block text-xs tracking-wider uppercase text-caviar-500 mb-2">Rows — one per line, cells with |</label>
                          <textarea value={section.rows} onChange={(e) => setSection(index, 'rows', e.target.value)} rows={3} className="input-field resize-y" placeholder="EU 36 | UK 3 | US 6 | IN 5" />
                        </div>
                      </div>
                    </details>
                  </div>
                ))}
              </section>
            )}

            <div className="flex items-center justify-end space-x-3">
              <Link to="/admin/content" className="btn-secondary text-xs">Cancel</Link>
              <button type="submit" disabled={saveMutation.isPending} className="btn-primary text-xs flex items-center space-x-2">
                <FiSave className="w-3 h-3" /><span>{saveMutation.isPending ? 'Saving...' : 'Save page'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageTransition>
  );
}
