'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface AutocompleteItem {
    id: string;
    label: string;
    sublabel?: string;
}

interface ModuleActionBannerProps {
    /** Lucide icon component */
    icon: React.ElementType;
    /** Module title, e.g. "Teilsysteme u. BKP" */
    title: string;
    /** Items for the autocomplete dropdown */
    items?: AutocompleteItem[];
    /** Called when an autocomplete suggestion is selected */
    onSelect?: (id: string) => void;
    /** Called on every keystroke (debounced 200ms) to filter page content */
    onSearch?: (query: string) => void;
    /** Placeholder text for the search input */
    searchPlaceholder?: string;
    /** CTA button label */
    ctaLabel?: string;
    /** CTA href (renders as <Link>), takes priority over ctaOnClick */
    ctaHref?: string;
    /** CTA onClick handler (used when no ctaHref) */
    ctaOnClick?: () => void;
    /** CTA icon, defaults to Plus */
    ctaIcon?: React.ElementType;
}

export function ModuleActionBanner({
    icon: Icon,
    title,
    items = [],
    onSelect,
    onSearch,
    searchPlaceholder = 'Suchen...',
    ctaLabel,
    ctaHref,
    ctaOnClick,
    ctaIcon: CtaIcon = Plus,
}: ModuleActionBannerProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Detect reduced motion preference
    const prefersReducedMotion =
        typeof window !== 'undefined'
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false;

    // Debounce query -> propagate to parent for list filtering
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
            onSearch?.(query);
        }, 200);
        return () => clearTimeout(timer);
    }, [query, onSearch]);

    // Compute autocomplete suggestions
    const suggestions = useMemo(() => {
        if (!debouncedQuery.trim()) return [];
        const q = debouncedQuery.toLowerCase();
        return items
            .filter(
                (item) =>
                    item.label.toLowerCase().includes(q) ||
                    (item.sublabel?.toLowerCase() || '').includes(q)
            )
            .slice(0, 8);
    }, [debouncedQuery, items]);

    // Open/close dropdown based on suggestions
    useEffect(() => {
        setOpen(suggestions.length > 0);
        setActiveIndex(-1);
    }, [suggestions]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (!open) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeIndex >= 0 && suggestions[activeIndex]) {
                    onSelect?.(suggestions[activeIndex].id);
                    setQuery('');
                    setOpen(false);
                }
            } else if (e.key === 'Escape') {
                setOpen(false);
                inputRef.current?.blur();
            }
        },
        [open, suggestions, activeIndex, onSelect]
    );

    const handleSelectItem = (item: AutocompleteItem) => {
        onSelect?.(item.id);
        setQuery('');
        setOpen(false);
        inputRef.current?.focus();
    };

    const hasCta = ctaLabel && (ctaHref || ctaOnClick);

    return (
        <div className="bg-slate-950 text-white rounded-lg px-0 py-0 flex flex-col md:flex-row items-stretch shadow-md gap-0 mb-6 overflow-visible min-h-[72px]">
            {/* Left: icon + title */}
            <div className="flex items-center gap-4 px-5 py-3 shrink-0">
                <div className="p-2 bg-white/10 rounded-lg shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <div className="text-[9px] font-bold text-primary uppercase tracking-wider">
                        Modul
                    </div>
                    <div className="text-base font-black text-white leading-tight">{title}</div>
                </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px bg-white/10 my-3" />

            {/* Center: autocomplete search */}
            <div className="flex-1 flex items-center px-5 py-3 relative" ref={containerRef}>
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                    <input
                        ref={inputRef}
                        type="text"
                        role="combobox"
                        aria-expanded={open}
                        aria-autocomplete="list"
                        aria-label={searchPlaceholder}
                        aria-haspopup="listbox"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => suggestions.length > 0 && setOpen(true)}
                        placeholder={searchPlaceholder}
                        className="w-full h-9 bg-white/10 border border-white/10 rounded-lg pl-9 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors"
                        autoComplete="off"
                    />

                    {/* Autocomplete Dropdown */}
                    {open && suggestions.length > 0 && (
                        <ul
                            ref={listRef}
                            role="listbox"
                            className={cn(
                                'absolute left-0 right-0 top-full mt-1 z-50 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden',
                                !prefersReducedMotion && 'animate-in fade-in slide-in-from-top-1 duration-150'
                            )}
                        >
                            {suggestions.map((item, idx) => (
                                <li
                                    key={item.id}
                                    role="option"
                                    aria-selected={idx === activeIndex}
                                    className={cn(
                                        'flex flex-col px-4 py-2.5 cursor-pointer transition-colors text-sm',
                                        idx === activeIndex
                                            ? 'bg-primary/20 text-white'
                                            : 'text-white/80 hover:bg-white/10'
                                    )}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // prevent input blur
                                        handleSelectItem(item);
                                    }}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                >
                                    <span className="font-bold leading-tight">{item.label}</span>
                                    {item.sublabel && (
                                        <span className="text-[11px] text-white/40 mt-0.5 leading-none">
                                            {item.sublabel}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Right: CTA */}
            {hasCta && (
                <>
                    <div className="hidden md:block w-px bg-white/10 my-3" />
                    <div className="flex items-center px-5 py-3 shrink-0">
                        {ctaHref ? (
                            <Link href={ctaHref}>
                                <Button
                                    size="sm"
                                    className="h-9 px-5 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-lg gap-2 shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95"
                                >
                                    <CtaIcon className="h-4 w-4" />
                                    {ctaLabel}
                                </Button>
                            </Link>
                        ) : (
                            <Button
                                size="sm"
                                onClick={ctaOnClick}
                                className="h-9 px-5 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-lg gap-2 shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95"
                            >
                                <CtaIcon className="h-4 w-4" />
                                {ctaLabel}
                            </Button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
