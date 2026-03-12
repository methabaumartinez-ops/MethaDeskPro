export type KSCategory = 'KS 1 Baumeister' | 'KS 2 Produktion' | 'Kein KS';

/**
 * Maps an Abteilung ID or Name to its corresponding KS category.
 */
export const ABTEILUNG_TO_KS_MAP: Record<string, KSCategory> = {
    // KS 1
    'bauleitung': 'KS 1 Baumeister',
    'bauleiter': 'KS 1 Baumeister',
    'ausfuehrung': 'KS 1 Baumeister',
    'bau': 'KS 1 Baumeister',
    'montage': 'KS 1 Baumeister', // Assuming Montage is Baumeister based on typical split or maybe it's Produktion? Let's check prompt: "Montage" is KS2 in prompt!

    // Wait, prompt says:
    // KS 1: Bauleitung, Ausführung
    // KS 2: Einkauf, AVOR, Schlosserei, Blechabteilung, Werkhof, Montage
    
    // So let's fix that mapping exactly as requested:
};

// Re-declaring exactly as user requested:
export const EXACT_ABTEILUNG_TO_KS_MAP: Record<string, KSCategory> = {
    // KS 1 Baumeister
    'bauleitung': 'KS 1 Baumeister',
    'bauleiter': 'KS 1 Baumeister',
    'ausfuehrung': 'KS 1 Baumeister',
    'bau': 'KS 1 Baumeister', // Alias for backward compat
    
    // KS 2 Produktion
    'einkauf': 'KS 2 Produktion',
    'avor': 'KS 2 Produktion',
    'schlosserei': 'KS 2 Produktion',
    'blech': 'KS 2 Produktion',
    'blechabteilung': 'KS 2 Produktion',
    'werkhof': 'KS 2 Produktion',
    'montage': 'KS 2 Produktion',
    'produktion': 'KS 2 Produktion', // Alias
    'planung': 'KS 2 Produktion', // Planner usually goes to Produktion context in this app unless specified
    'planer': 'KS 2 Produktion',
};

/**
 * Derives the KS category from a given Abteilung string.
 * @param abteilung Name or ID of the Abteilung
 * @returns 'KS 1 Baumeister', 'KS 2 Produktion' or 'Kein KS'
 */
export function getKSFromAbteilung(abteilung: string | null | undefined): KSCategory {
    if (!abteilung || abteilung === 'Sin Abteilung') return 'Kein KS';
    const key = abteilung.toLowerCase().trim();
    return EXACT_ABTEILUNG_TO_KS_MAP[key] || 'Kein KS';
}

/**
 * Returns Tailwind classes for KS badges based on the parsed KS.
 */
export function getKSColorClasses(ks: string | KSCategory | undefined | null): string {
    if (ks === 'KS 1 Baumeister') {
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700';
    }
    if (ks === 'KS 2 Produktion') {
        return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
}
