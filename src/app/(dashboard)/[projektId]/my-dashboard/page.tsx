'use client';

import React from 'react';
import { useParams } from 'next/navigation';

export default function MyDashboardPage() {
    const { projektId } = useParams() as { projektId: string };

    return (
        <div className="w-full h-full min-h-[500px] flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/20">
            <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-slate-400">Mein Dashboard</h2>
                <p className="text-sm text-slate-500">Dein Widget-Canvas ist noch leer.</p>
            </div>
        </div>
    );
}
