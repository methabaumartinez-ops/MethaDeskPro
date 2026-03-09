import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/services/authService';
import { SuperadminSidebar } from './SuperadminSidebar';

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get('methabau_token')?.value;

    if (!token) redirect('/login');

    try {
        const user = await getUserFromToken(token);
        if (!user || user.role !== 'superadmin') redirect('/projekte');
    } catch {
        redirect('/login');
    }

    return (
        <div 
            className="flex min-h-screen relative overflow-hidden"
            style={{
                backgroundImage: "url('/construction_bg.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            {/* Overlay oscuro para legibilidad */}
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-0" />
            
            <div className="flex w-full z-10">
                <SuperadminSidebar />
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

