import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSiteSettings } from '@/hooks/useSiteContent';

/**
 * First-visit brand curtain. Kept short on purpose: it sits in front of the
 * storefront, so every extra 100 ms is a 100 ms delay before the hero and the
 * product queries can start.
 */
export default function SplashScreen({ onFinish }) {
  const { brandName } = useSiteSettings();
  const [brandFirst, ...brandRest] = brandName.split(' ');

  useEffect(() => {
    const timer = setTimeout(onFinish, 700);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-caviar-950"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.76, 0, 0.24, 1] }}
      >
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.h1
              className="font-serif text-4xl md:text-6xl lg:text-7xl tracking-[0.15em] text-caviar-950 dark:text-white"
              animate={{ opacity: [1, 1, 0] }}
              transition={{ duration: 0.65, times: [0, 0.6, 1] }}
            >
              {brandFirst}
            </motion.h1>
            <motion.p
              className="font-serif text-xl md:text-2xl text-gold-500 italic mt-2 tracking-[0.3em]"
              animate={{ opacity: [1, 1, 0] }}
              transition={{ duration: 0.65, times: [0, 0.6, 1], delay: 0.05 }}
            >
              {brandRest.join(' ')}
            </motion.p>
          <motion.div
            className="h-[1px] bg-gradient-to-r from-transparent via-gold-500 to-transparent mt-6 mx-auto"
            initial={{ width: 0 }}
            animate={{ width: ['0px', '120px', '0px'] }}
            transition={{ duration: 0.65, times: [0, 0.4, 1], delay: 0.1 }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}