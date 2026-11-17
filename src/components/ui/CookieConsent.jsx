import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import {
  CONSENT_EVENT,
  OPEN_COOKIE_SETTINGS_EVENT,
  defaultConsent,
  readConsent,
  saveConsent,
} from '@/utils/consent';
import { initAnalytics } from '@/utils/analytics';

const categories = [
  {
    key: 'necessary',
    label: 'Strictly Necessary',
    note: 'Always active',
    desc: 'Essential for core store functions such as keeping items in your shopping bag, processing secure checkouts and managing your account login. These cannot be turned off.',
  },
  {
    key: 'functional',
    label: 'Functional',
    desc: 'Remember your preferences - such as your currency, language, saved wishlist items and recently viewed bags - so you get a smoother, more tailored browsing experience.',
  },
  {
    key: 'analytics',
    label: 'Analytics & Performance',
    desc: 'Help us understand how shoppers explore our collections, which bag styles or filters are most popular, and where we can improve site speed and navigation.',
  },
  {
    key: 'marketing',
    label: 'Marketing & Targeting',
    desc: 'Used to show you relevant bag recommendations, restock alerts and seasonal promotions across our site and partner platforms based on your browsing activity.',
  },
];

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefs, setPrefs] = useState(defaultConsent);

  useEffect(() => {
    const stored = readConsent();
    if (stored) {
      setPrefs(stored);
    } else {
      // Let the splash animation finish before sliding the banner in.
      const timer = window.setTimeout(() => setVisible(true), 1200);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const sync = (event) => {
      if (event.detail) setPrefs(event.detail);
    };
    const open = () => {
      setPrefs(readConsent() || defaultConsent);
      setSettingsOpen(true);
      setVisible(false);
    };
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    };
  }, []);

  const commit = useCallback((next) => {
    const saved = saveConsent(next);
    setPrefs(saved);
    setSettingsOpen(false);
    setVisible(false);
    if (saved.analytics) initAnalytics();
  }, []);

  const acceptAll = () => commit({ functional: true, analytics: true, marketing: true });
  const rejectOptional = () => commit({ functional: false, analytics: false, marketing: false });
  const toggle = (key) => setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));

  // Closing without saving keeps a previously saved choice, but a first-time
  // visitor should get the banner back so the decision is not silently skipped.
  const closeSettings = () => {
    setSettingsOpen(false);
    if (!readConsent()) setVisible(true);
  };

  return (
    <>
      {visible && !settingsOpen && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          aria-live="polite"
          className="fixed inset-x-0 bottom-0 z-[9990] border-t border-caviar-200 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:border-caviar-800 dark:bg-caviar-900"
        >
          <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 py-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
            <p className="text-sm text-caviar-600 dark:text-caviar-300 leading-relaxed lg:flex-1">
              We use cookies to keep your shopping bag intact, remember your style preferences, and recommend bags
              you&rsquo;ll love. By clicking <span className="font-medium text-caviar-950 dark:text-white">Accept All</span>,
              you agree to our use of cookies for site functionality, analytics, and personalized offers. You can
              update your choices anytime in{' '}
              <button
                type="button"
                onClick={() => { setSettingsOpen(true); setVisible(false); }}
                className="underline text-caviar-950 dark:text-white hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
              >
                Cookie Settings
              </button>
              . Read our{' '}
              <Link to="/cookie-policy" className="underline hover:text-gold-500 dark:hover:text-gold-400 transition-colors">
                Cookie Policy
              </Link>
              .
            </p>
            <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={rejectOptional}
                className="px-5 py-3 text-xs tracking-[0.15em] uppercase border border-caviar-300 dark:border-caviar-600 text-caviar-700 dark:text-caviar-200 hover:border-caviar-950 dark:hover:border-white transition-colors"
              >
                Reject Non-Essential
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="px-5 py-3 text-xs tracking-[0.15em] uppercase bg-caviar-950 text-white dark:bg-white dark:text-caviar-950 hover:bg-caviar-800 dark:hover:bg-caviar-100 transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-[9995] flex items-end md:items-center justify-center bg-caviar-950/60 backdrop-blur-sm p-0 md:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cookie settings"
            className="w-full md:max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-caviar-900 border border-caviar-200 dark:border-caviar-700 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-caviar-100 dark:border-caviar-800">
              <div>
                <p className="text-[10px] tracking-[0.25em] uppercase text-gold-600 dark:text-gold-400">Preferences</p>
                <h2 className="font-serif text-2xl mt-1">Cookie Settings</h2>
              </div>
              <button
                type="button"
                onClick={closeSettings}
                aria-label="Close cookie settings"
                className="p-2 text-caviar-400 hover:text-caviar-950 dark:hover:text-white transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {categories.map((category) => (
                <div key={category.key} className="flex items-start gap-4">
                  <input
                    id={`cookie-${category.key}`}
                    type="checkbox"
                    checked={category.key === 'necessary' ? true : Boolean(prefs[category.key])}
                    disabled={category.key === 'necessary'}
                    onChange={() => toggle(category.key)}
                    className="mt-1 h-4 w-4 accent-gold-500 disabled:opacity-60"
                  />
                  <label htmlFor={`cookie-${category.key}`} className="flex-1 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-caviar-950 dark:text-white">{category.label}</span>
                      {category.note && (
                        <span className="text-[10px] tracking-wider uppercase text-caviar-400 border border-caviar-200 dark:border-caviar-700 px-1.5 py-0.5">
                          {category.note}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-caviar-500 dark:text-caviar-400 leading-relaxed mt-1">
                      {category.desc}
                    </span>
                  </label>
                </div>
              ))}
            </div>

            <div className="px-6 py-5 border-t border-caviar-100 dark:border-caviar-800 flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={closeSettings}
                className="px-5 py-3 text-xs tracking-[0.15em] uppercase border border-caviar-300 dark:border-caviar-600 hover:border-caviar-950 dark:hover:border-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => commit(prefs)}
                className="px-5 py-3 text-xs tracking-[0.15em] uppercase bg-caviar-950 text-white dark:bg-white dark:text-caviar-950 hover:bg-caviar-800 dark:hover:bg-caviar-100 transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}