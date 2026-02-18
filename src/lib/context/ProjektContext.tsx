'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Projekt, User } from '@/types';
// import { mockStore } from '@/lib/mock/store'; // Removed
import { useRouter, usePathname } from 'next/navigation';

interface ProjektContextType {
    activeProjekt: Projekt | null;
    setActiveProjekt: (projekt: Projekt | null) => void;
    currentUser: User | null;
    setCurrentUser: (user: User | null) => void;
    loading: boolean;
}

const ProjektContext = createContext<ProjektContextType | undefined>(undefined);

export function ProjektProvider({ children }: { children: React.ReactNode }) {
    const [activeProjekt, _setActiveProjekt] = useState<Projekt | null>(null);
    const [currentUser, _setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const storedUserIdx = localStorage.getItem('methabau_currentUser');
        const storedProjektIdx = localStorage.getItem('methabau_activeProjekt');

        if (storedUserIdx) {
            try {
                _setCurrentUser(JSON.parse(storedUserIdx));
            } catch (e) {
                console.error("Failed to parse user", e);
            }
        }
        if (storedProjektIdx) {
            try {
                _setActiveProjekt(JSON.parse(storedProjektIdx));
            } catch (e) {
                console.error("Failed to parse project", e);
            }
        }

        setLoading(false);
    }, []);

    const setActiveProjekt = useCallback((projekt: Projekt | null) => {
        _setActiveProjekt(projekt);
        if (projekt) {
            localStorage.setItem('methabau_activeProjekt', JSON.stringify(projekt));
        } else {
            localStorage.removeItem('methabau_activeProjekt');
        }
    }, []);

    const setCurrentUser = useCallback((user: User | null) => {
        _setCurrentUser(user);
        if (user) {
            localStorage.setItem('methabau_currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('methabau_currentUser');
        }
    }, []);

    // Auth Guard (simulated)
    useEffect(() => {
        if (!loading && !currentUser && pathname !== '/' && pathname !== '/login' && pathname !== '/register') {
            router.push('/login');
        }
    }, [currentUser, loading, pathname, router]);

    return (
        <ProjektContext.Provider value={{
            activeProjekt,
            setActiveProjekt,
            currentUser,
            setCurrentUser,
            loading
        }}>
            {children}
        </ProjektContext.Provider>
    );
}

export function useProjekt() {
    const context = useContext(ProjektContext);
    if (context === undefined) {
        throw new Error('useProjekt must be used within a ProjektProvider');
    }
    return context;
}
