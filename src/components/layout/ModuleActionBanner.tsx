'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/shared/BackButton';
import { useParams, useRouter } from 'next/navigation';

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
    /** Optional subtitle */
    subtitle?: string;
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
    /** Whether to show the back button. Defaults to true. */
    showBackButton?: boolean;
    /** Custom back navigation href. If not provided, it will go to the previous page. */
    backHref?: string;
    /** Children slot for extra content (optional) */
    children?: React.ReactNode;
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
    showBackButton = true,
    backHref,
    children,
    subtitle,
}: ModuleActionBannerProps) {
    const { projektId } = useParams() as { projektId: string };
    const router = useRouter();
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
        <div 
            className={cn(
                "bg-slate-950 text-white flex flex-col md:flex-row items-stretch shadow-md gap-0 mb-6 overflow-visible md:h-[54px] min-h-[54px] relative",
                "w-full rounded-2xl border border-white/10"
            )}
        >
            {/* Left section prefix: Back Button + Vertical Divider */}
            {showBackButton && (
                <div className="flex items-center pl-4 lg:pl-6">
                    <BackButton href={backHref} />
                    <div className="hidden md:block w-px bg-white/10 h-8 ml-4 mr-0" />
                </div>
            )}

            {/* Content Left: icon + title */}
            <div className={cn(
                "flex items-center gap-4 px-5 py-2 md:py-0 shrink-0 h-full",
                !showBackButton && "lg:pl-6"
            )}>
                <div className="p-2 bg-white/10 rounded-lg shrink-0">
                    <Icon className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex flex-col justify-center h-full">
                    <span className="text-xl font-black text-white leading-none tracking-tight">{title}</span>
                    {subtitle && (
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none mt-1">{subtitle}</span>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px bg-white/10 my-3" />

            {/* Center: Content Slot (Search or Custom Children) */}
            <div className="flex-1 flex items-center px-5 py-2 md:py-0 relative h-full" ref={containerRef}>
                {onSearch ? (
                    <div className="relative w-full max-w-[260px] mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
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
                            className="w-full h-9 bg-white border border-slate-200 rounded-lg pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors shadow-inner"
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
                                                ? 'bg-orange-500/20 text-white'
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
                ) : children}
            </div>

            {/* Right Slot: CTA Actions */}
            <div className="flex items-center px-5 py-2 md:py-0 gap-3 md:gap-5 lg:pr-6 h-full">
                {onSearch && children}
                {hasCta && (
                    <>
                        <div className="hidden md:block w-px bg-white/10 h-8" />
                        {ctaHref ? (
                            <Link href={ctaHref}>
                                <Button
                                    size="sm"
                                    className="h-9 px-5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-lg gap-2 shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                                >
                                    <CtaIcon className="h-4 w-4" />
                                    {ctaLabel}
                                </Button>
                            </Link>
                        ) : (
                            <Button
                                size="sm"
                                onClick={ctaOnClick}
                                className="h-9 px-5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-lg gap-2 shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                            >
                                <CtaIcon className="h-4 w-4" />
                                {ctaLabel}
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
