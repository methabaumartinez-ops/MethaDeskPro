'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * useSmartBack — returns a deterministic back-navigation callback.
 *
 * Always navigates to the specified fallback route (the logical parent in the
 * application hierarchy). Never uses browser history to avoid landing on
 * unrelated pages after a refresh or direct URL entry.
 *
 * @param fallback  The hierarchical parent route to navigate to.
 */
export function useSmartBack(fallback: string) {
    const router = useRouter();

    return useCallback(() => {
        router.push(fallback);
    }, [router, fallback]);
}
