export type Locale = 'pt' | 'en';

export const DEFAULT_LOCALE: Locale = 'pt';

export interface RoutePair {
  pt: string;
  en: string;
}

/**
 * Mapping between Portuguese (default) and English routes with translated slugs.
 */
export const ROUTE_PAIRS: RoutePair[] = [
  { pt: '/', en: '/en/' },
  { pt: '/calculadoras/', en: '/en/calculators/' },
  {
    pt: '/calculadoras/canalizacao-remodelacao/',
    en: '/en/calculators/renovation-plumbing/',
  },
  { pt: '/blog/', en: '/en/blog/' },
  {
    pt: '/blog/preco-canalizador-tavira/',
    en: '/en/blog/plumber-prices-tavira/',
  },
];

/**
 * Ensures a pathname starts and ends with `/` (with `/` staying `/`).
 */
export function normalizePath(pathname: string): string {
  let clean = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (clean.length > 1 && !clean.endsWith('/')) {
    clean = `${clean}/`;
  }
  return clean;
}

/**
 * Detects the active locale from the URL pathname.
 */
export function getLocaleFromUrl(url: URL): Locale {
  const pathname = normalizePath(url.pathname);
  return pathname === '/en/' || pathname.startsWith('/en/') ? 'en' : 'pt';
}

/**
 * Finds the matching PT and EN paths for a given pathname.
 * Returns null if the route is not in ROUTE_PAIRS.
 */
export function getAlternatePaths(pathname: string): RoutePair | null {
  const normalized = normalizePath(pathname);
  return (
    ROUTE_PAIRS.find(
      (pair) => pair.pt === normalized || pair.en === normalized,
    ) ?? null
  );
}

/**
 * Returns the path for the target locale corresponding to the current pathname.
 * Falls back to the target locale's home page if no exact match exists.
 */
export function getLocalizedPath(pathname: string, targetLocale: Locale): string {
  const pair = getAlternatePaths(pathname);
  if (pair) {
    return pair[targetLocale];
  }
  return targetLocale === 'en' ? '/en/' : '/';
}
