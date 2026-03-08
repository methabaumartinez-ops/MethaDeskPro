'use client';

/**
 * PreviewAbteilungContext
 *
 * Allows the superadmin to simulate what a specific Abteilung sees in the sidebar.
 * When previewAbteilung is set, the main Sidebar uses that value instead of
 * the real currentUser.abteilung for permission filtering.
 *
 * The selected preview is stored in sessionStorage so it survives page navigations
 * but resets on browser close.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'methabau_preview_abteilung';

interface PreviewAbteilungContextType {
    previewAbteilung: string | null;
    setPreviewAbteilung: (id: string | null) => void;
    isPreviewMode: boolean;
}

const PreviewAbteilungContext = createContext<PreviewAbteilungContextType>({
    previewAbteilung: null,
    setPreviewAbteilung: () => {},
    isPreviewMode: false,
});

export function PreviewAbteilungProvider({ children }: { children: React.ReactNode }) {
    const [previewAbteilung, _setPreviewAbteilung] = useState<string | null>(null);

    useEffect(() => {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) _setPreviewAbteilung(stored);
    }, []);

    const setPreviewAbteilung = (id: string | null) => {
        _setPreviewAbteilung(id);
        if (id) sessionStorage.setItem(STORAGE_KEY, id);
        else sessionStorage.removeItem(STORAGE_KEY);
    };

    return (
        <PreviewAbteilungContext.Provider
            value={{ previewAbteilung, setPreviewAbteilung, isPreviewMode: !!previewAbteilung }}
        >
            {children}
        </PreviewAbteilungContext.Provider>
    );
}

export function usePreviewAbteilung() {
    return useContext(PreviewAbteilungContext);
}
