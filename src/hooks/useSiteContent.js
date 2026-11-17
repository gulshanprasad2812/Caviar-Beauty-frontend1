import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import { siteDefaults } from '@/data/siteDefaults';

/**
 * Storefront settings edited in Admin → Site settings.
 * Returns the shipped defaults until the API responds, so nothing flinches.
 */
export function useSiteSettings() {
  const { data } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.get('/site').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    placeholderData: siteDefaults,
  });

  return {
    ...siteDefaults,
    ...(data || {}),
    heroSlides: data?.heroSlides?.length ? data.heroSlides : siteDefaults.heroSlides,
  };
}

/**
 * Loads one editable page by slug. `fallback` is returned while loading and if
 * the page has been removed, so the storefront never shows a blank screen.
 */
export function useContentPage(slug, fallback) {
  const query = useQuery({
    queryKey: ['content-page', slug],
    queryFn: () => api.get(`/content/pages/${slug}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const page = query.data
    ? {
        ...fallback,
        ...query.data,
        sections: query.data.sections?.length ? query.data.sections : fallback?.sections || [],
        data: query.data.data || fallback?.data || null,
      }
    : fallback;

  return { page, isLoading: query.isLoading, exists: query.isSuccess };
}
