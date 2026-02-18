'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Projekt, User } from '@/types';
import { useRouter, usePathname } from 'next/navigation';

interface ProjektContextType {
    activeProjekt: Projekt | null;
    setActiveProjekt: (projekt: Projekt | null) => void;
    currentUser: User | null;
    setCurrentUser: (user: User | null) => void;
    loading: boolean;
    logout: () => Promise<void>;
}

const ProjektContext = createContext<ProjektContextType | undefined>(undefined);

export function ProjektProvider({ children }: { children: React.ReactNode }) {
    const [activeProjekt, _setActiveProjekt] = useState<Projekt | null>(null);
    const [currentUser, _setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Load user from session cookie on mount
    useEffect(() => {
        async function loadUser() {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) {
                        _setCurrentUser(data.user);
                    }
                }
            } catch (error) {
                console.error('Failed to load user session:', error);
            }

            // Load project from localStorage
            const storedProjekt = localStorage.getItem('methabau_activeProjekt');
            if (storedProjekt) {
                try {
                    _setActiveProjekt(JSON.parse(storedProjekt));
                } catch (e) {
                    console.error("Failed to parse project", e);
                }
            }

            setLoading(false);
        }

        loadUser();
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
    }, []);

    const logout = useCallback(async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        }
        _setCurrentUser(null);
        _setActiveProjekt(null);
        localStorage.removeItem('methabau_activeProjekt');
        router.push('/login');
    }, [router]);

    return (
        <ProjektContext.Provider value={{
            activeProjekt,
            setActiveProjekt,
            currentUser,
            setCurrentUser,
            loading,
            logout,
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
