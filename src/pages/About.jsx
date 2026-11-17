import { motion } from 'framer-motion';
import PageTransition from '@/components/layout/PageTransition';
import { useInView } from '@/hooks/useInView';
import { useSeo } from '@/hooks/useSeo';
import { useContentPage, useSiteSettings } from '@/hooks/useSiteContent';
import { aboutDefaults } from '@/data/siteDefaults';
import { getImageUrl } from '@/utils/helpers';
import Testimonials from '@/components/sections/Testimonials';

export default function About() {
  const { brandName } = useSiteSettings();
  const fallback = {
    subtitle: aboutDefaults.subtitle,
    title: aboutDefaults.title,
    seoTitle: 'About',
    seoDesc: `Learn about the ${brandName} story and craftsmanship.`,
    sections: [],
    data: aboutDefaults,
  };
  const { page } = useContentPage('about', fallback);
  const content = page || fallback;
  const data = { ...aboutDefaults, ...(content.data || {}) };
  const values = data.values?.length ? data.values : aboutDefaults.values;
  const story = data.story?.length ? data.story : aboutDefaults.story;

  useSeo(content.seoTitle || 'About', content.seoDesc || `Learn about the ${brandName} story and craftsmanship.`);
  const { ref, isInView } = useInView();

  return (
    <PageTransition>
      <div className="pt-24 md:pt-32 pb-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
            <p className="section-subtitle">{content.subtitle}</p>
            <h1 className="section-title mt-3">{content.title}</h1>
            <div className="w-16 h-[1px] bg-gold-500 mt-6" />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="aspect-[4/5] bg-caviar-100 dark:bg-caviar-800 flex items-center justify-center overflow-hidden"
            >
              {data.imageUrl ? (
                <img src={getImageUrl(data.imageUrl)} alt={content.title} className="w-full h-full object-cover" />
              ) : (
                <span className="font-serif text-9xl text-caviar-200 dark:text-caviar-700">CB</span>
              )}
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
              {data.founded && (
                <p className="text-gold-500 text-sm tracking-[0.3em] uppercase font-medium mb-4">{data.founded}</p>
              )}
              <div className="space-y-5 text-caviar-600 dark:text-caviar-300 leading-relaxed">
                {story.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </motion.div>
          </div>

          <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {values.map((value, i) => (
              <motion.div
                key={`${value.title}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1 }}
                className="p-8 border border-caviar-200 dark:border-caviar-800"
              >
                <span className="text-gold-500 font-serif text-3xl">0{i + 1}</span>
                <h3 className="font-serif text-xl mt-4 mb-2">{value.title}</h3>
                <p className="text-sm text-caviar-500 dark:text-caviar-400">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
        <Testimonials />
      </div>
    </PageTransition>
  );
}
