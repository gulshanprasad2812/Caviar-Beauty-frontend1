// Cookie consent is stored in localStorage under one key so every part of the
// app (banner, analytics, footer link) reads the same decision.
export const CONSENT_STORAGE_KEY = 'cb-cookie-consent';
export const CONSENT_EVENT = 'cb:cookie-consent-changed';
export const OPEN_COOKIE_SETTINGS_EVENT = 'cb:open-cookie-settings';

export const defaultConsent = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export function readConsent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      necessary: true,
      functional: Boolean(parsed.functional),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

export function saveConsent(preferences) {
  const value = {
    necessary: true,
    functional: Boolean(preferences.functional),
    analytics: Boolean(preferences.analytics),
    marketing: Boolean(preferences.marketing),
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private modes; the choice still applies
    // for the current page view.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  return value;
}

export function hasConsent(category) {
  const consent = readConsent();
  return Boolean(consent && consent[category]);
}

export function openCookieSettings() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}