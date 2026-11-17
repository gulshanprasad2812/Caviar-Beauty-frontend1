import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '@/components/layout/PageTransition';
import { useSeo } from '@/hooks/useSeo';
import { useContentPage, useSiteSettings } from '@/hooks/useSiteContent';
import { infoPages } from '@/data/infoPages';

const SLUG_BY_KEY = {
  faq: 'faq',
  sizeGuide: 'size-guide',
  careInstructions: 'care-instructions',
  trackOrder: 'track-order',
};

const FALLBACK_BY_SLUG = {
  faq: infoPages.faq,
  'size-guide': infoPages.sizeGuide,
  'care-instructions': infoPages.careInstructions,
  'track-order': infoPages.trackOrder,
};

const renderTable = (table) => {
  if (!table) return null;
  if (Array.isArray(table)) {
    if (!table.length) return null;
    const columns = Object.keys(table[0]);
    return { columns, rows: table.map((row) => columns.map((key) => row[key])) };
  }
  return table.columns?.length ? table : null;
};

/**
 * Renders an admin-editable article page. `page` accepts the legacy info-page
 * key (faq, sizeGuide…) and `slug` an explicit slug; otherwise the :slug route
 * param is used, which powers /p/:slug custom pages.
 */
export default function InfoPage({ page, slug: slugProp }) {
  const { brandName } = useSiteSettings();
  const params = useParams();
  const slug = slugProp || SLUG_BY_KEY[page] || page || params.slug;
  const fallback = FALLBACK_BY_SLUG[slug];
  const { page: content, isLoading } = useContentPage(slug, fallback);

  useSeo(content?.seoTitle || content?.title || brandName, content?.seoDesc || '');

  if (!content) {
    return (
      <PageTransition>
        <div className="pt-32 pb-24 px-4 text-center">
          <p className="section-subtitle">404</p>
          <h1 className="section-title mt-3">{isLoading ? 'Loading…' : 'Page not found'}</h1>
          {!isLoading && (
            <p className="mt-6 text-sm text-caviar-500">
              This page may have been unpublished. <Link to="/" className="text-gold-500 underline">Return home</Link>
            </p>
          )}
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="pt-24 md:pt-32 pb-20 px-4 md:px-8 lg:px-12">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
            <p className="section-subtitle">{content.subtitle}</p>
            <h1 className="section-title mt-3">{content.title}</h1>
            <div className="w-16 h-[1px] bg-gold-500 mt-6" />
          </motion.div>

          {content.intro && (
            <p className="text-caviar-600 dark:text-caviar-300 leading-relaxed mb-12">{content.intro}</p>
          )}

          <div className="space-y-12">
            {content.sections?.map((section, i) => {
              const table = renderTable(section.table);
              return (
                <motion.section
                  key={`${section.heading}-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  {section.heading && <h2 className="font-serif text-2xl mb-4">{section.heading}</h2>}
                  {section.body?.map((p) => (
                    <p key={p} className="text-sm text-caviar-600 dark:text-caviar-300 leading-relaxed mb-4">{p}</p>
                  ))}
                  {table && (
                    <div className="overflow-x-auto mb-6 border border-caviar-200 dark:border-caviar-700">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-caviar-100 dark:bg-caviar-800">
                            {table.columns.map((column) => (
                              <th key={column} className="px-4 py-3 text-left text-xs uppercase tracking-widest font-medium">{column}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-t border-caviar-200 dark:border-caviar-700">
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="px-4 py-3 text-caviar-600 dark:text-caviar-300">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {section.items?.length > 0 && (
                    <ul className="space-y-3">
                      {section.items.map((item, itemIndex) => (
                        <li key={`${item}-${itemIndex}`} className="flex items-start space-x-3 text-sm text-caviar-600 dark:text-caviar-300 leading-relaxed">
                          <span className="w-1.5 h-1.5 bg-gold-500 flex-shrink-0 mt-2 rounded-full" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.section>
              );
            })}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
