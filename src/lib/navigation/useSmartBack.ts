'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * useSmartBack — returns a back-navigation callback with a deterministic fallback.
 *
 * Behavior:
 *  - If the browser history stack has entries (i.e. user navigated here normally),
 *    uses router.back() to stay in-app.
 *  - If the page was deep-linked (no sufficient history), uses router.push(fallback)
 *    so the user always lands on a logical parent page.
 *
 * @param fallback  The route to push when no history exists.
 */
export function useSmartBack(fallback: string) {
    const router = useRouter();

    return useCallback(() => {
        // history.length is 1 when the tab was just opened to this URL directly.
        // > 2 gives a small safety margin for browser quirks.
        if (typeof window !== 'undefined' && window.history.length > 2) {
            router.back();
        } else {
            router.push(fallback);
        }
    }, [router, fallback]);
}
