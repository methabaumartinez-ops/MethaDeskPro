'use client';

import React from 'react';

export function Signature() {
    return (
        <a
            href="https://www.agentia-automate.ch/de"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 group hover:opacity-80 transition-all py-1.5 px-3 rounded-xl bg-white border border-slate-200 shadow-sm w-fit"
        >
            <span className="text-[10px] font-black uppercase tracking-wider text-primary/80 whitespace-nowrap">
                Powered by
            </span>
            <div className="relative w-6 h-6 rounded-md overflow-hidden border border-slate-200 shadow-sm bg-white shrink-0">
                <img
                    src="/images/agentia-logo.png"
                    alt="AgentiA-Automate Logo"
                    className="object-cover w-full h-full"
                />
            </div>
        </a>
    );
}
