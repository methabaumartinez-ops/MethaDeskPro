export type KSCategory = 'KS 1 Baumeister' | 'KS 2 Produktion' | 'KS 3 Andere' | 'Kein KS';

/** Options for the KS dropdown in Teilsystem forms */
export const KS_OPTIONS = [
    { label: 'KS 1 Baumeister', value: '1' },
    { label: 'KS 2 Produktion', value: '2' },
    { label: 'KS 3 Andere',     value: '3' },
] as const;

/** Maps a numeric KS value ('1', '2', '3') to its full label */
export function ksValueToLabel(ks: string | null | undefined): KSCategory | 'Kein KS' {
    if (ks === '1') return 'KS 1 Baumeister';
    if (ks === '2') return 'KS 2 Produktion';
    if (ks === '3') return 'KS 3 Andere';
    // Legacy: stored as full string
    if (ks === 'KS 1 Baumeister') return 'KS 1 Baumeister';
    if (ks === 'KS 2 Produktion')  return 'KS 2 Produktion';
    if (ks === 'KS 3 Andere')      return 'KS 3 Andere';
    return 'Kein KS';
}

/** Maps an Abteilung name to a KS numeric value ('1', '2', '3' or '') */
export const EXACT_ABTEILUNG_TO_KS_MAP: Record<string, '1' | '2' | '3'> = {
    // KS 1 Baumeister
    'bauleitung':  '1',
    'bauleiter':   '1',
    'ausfuehrung': '1',
    'bau':         '1',

    // KS 2 Produktion
    'einkauf':        '2',
    'avor':           '2',
    'schlosserei':    '2',
    'blech':          '2',
    'blechabteilung': '2',
    'werkhof':        '2',
    'montage':        '2',
    'produktion':     '2',
    'planung':        '2',
    'planer':         '2',
};

/**
 * Derives the KS numeric value from a given Abteilung string.
 * Returns '1', '2', '3' or '' (empty = Kein KS).
 */
export function getKSFromAbteilung(abteilung: string | null | undefined): string {
    if (!abteilung || abteilung === 'Sin Abteilung') return '';
    const key = abteilung.toLowerCase().trim();
    return EXACT_ABTEILUNG_TO_KS_MAP[key] || '';
}

/**
 * Returns Tailwind badge classes for KS.
 * KS 1 = Rojo | KS 2 = Azul | KS 3 = Amarillo
 * Accepts both numeric values ('1', '2', '3') and legacy full-string values.
 */
export function getKSColorClasses(ks: string | KSCategory | undefined | null): string {
    const normalized = ksValueToLabel(ks as string);
    if (normalized === 'KS 1 Baumeister') {
        return 'bg-red-100 text-red-800 border-red-400 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700';
    }
    if (normalized === 'KS 2 Produktion') {
        return 'bg-blue-100 text-blue-800 border-blue-400 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700';
    }
    if (normalized === 'KS 3 Andere') {
        return 'bg-yellow-100 text-yellow-800 border-yellow-400 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
}

/**
 * Returns only the background + text Tailwind classes for coloring form selects/inputs.
 * Slightly more saturated than badge classes for visibility in white backgrounds.
 */
export function getKSSelectClasses(ks: string | null | undefined): string {
    const normalized = ksValueToLabel(ks as string);
    if (normalized === 'KS 1 Baumeister') {
        return 'bg-red-50 text-red-900 border-red-300 font-bold';
    }
    if (normalized === 'KS 2 Produktion') {
        return 'bg-blue-50 text-blue-900 border-blue-300 font-bold';
    }
    if (normalized === 'KS 3 Andere') {
        return 'bg-yellow-50 text-yellow-900 border-yellow-300 font-bold';
    }
    return '';
}
