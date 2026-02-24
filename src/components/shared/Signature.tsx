'use client';

import React from 'react';

export function Signature() {
    return (
        <a
            href="https://www.agentia-automate.ch/de"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 group hover:opacity-80 transition-all py-4 px-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-sm w-fit mx-auto my-4"
        >
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white">
                <img
                    src="/images/agentia-logo.png"
                    alt="AgentiA-Automate Logo"
                    className="object-cover w-full h-full"
                />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF6B35]/80">
                    Powered by
                </span>
                <span className="text-sm font-black text-slate-900 tracking-tight">
                    AgentiA<span className="text-[#FF6B35]">-</span>Automate
                </span>
            </div>
        </a>
    );
}
