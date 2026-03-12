'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function AnalyseRedirect() {
    const router = useRouter();
    const { projektId } = useParams() as { projektId: string };

    useEffect(() => {
        // Redirect to the default analysis dashboard (Projekt) to prevent 404
        router.replace(`/${projektId}/analyse/projekt`);
    }, [projektId, router]);

    return (
        <div className="p-12 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">
            Weiterleitung...
        </div>
    );
}
