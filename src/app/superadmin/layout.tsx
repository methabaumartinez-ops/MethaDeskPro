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
        <div className="flex min-h-screen bg-white">
            <SuperadminSidebar />
            <main
                className="flex-1 overflow-auto"
                style={{
                    backgroundImage: "url('/construction_bg.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            >
                {children}
            </main>
        </div>
    );
}
