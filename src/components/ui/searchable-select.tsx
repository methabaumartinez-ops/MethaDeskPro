'use client';

import React from 'react';
import { ChevronDown, X } from 'lucide-react';

interface Option {
    label: string;
    value: string;
}

interface SearchableSelectProps {
    label: string;
    options: Option[];
    value?: string;
    onChange: (value: string) => void;
    error?: string;
    placeholder?: string;
}

export const SearchableSelect = ({ label, options, value, onChange, error, placeholder = 'Suchen...' }: SearchableSelectProps) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Find the currently selected option
    const selectedOption = options.find(o => o.value === value);

    // Filter and sort options
    const filteredOptions = React.useMemo(() => {
        const filtered = search
            ? options.filter(o => o.value !== '' && o.label.toLowerCase().includes(search.toLowerCase()))
            : options.filter(o => o.value !== '');

        return filtered.sort((a, b) => a.label.localeCompare(b.label, 'de'));
    }, [options, search]);

    // Close dropdown on outside click
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (opt: Option) => {
        onChange(opt.value);
        setIsOpen(false);
        setSearch('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearch('');
    };

    return (
        <div className="space-y-2" ref={containerRef}>
            <label className="text-sm font-medium leading-none">{label}</label>
            <div className="relative">
                <div
                    className={`flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm cursor-pointer transition-colors
                        ${isOpen ? 'border-primary ring-2 ring-ring ring-offset-2' : 'border-input'}
                        ${error ? 'border-red-500' : ''}`}
                    onClick={() => {
                        setIsOpen(!isOpen);
                        if (!isOpen) {
                            setTimeout(() => inputRef.current?.focus(), 50);
                        }
                    }}
                >
                    <span className={selectedOption ? 'text-foreground' : 'text-muted-foreground'}>
                        {selectedOption ? selectedOption.label : 'Bitte wählen...'}
                    </span>
                    <div className="flex items-center gap-1">
                        {selectedOption && selectedOption.value !== '' && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="rounded-full p-0.5 hover:bg-slate-200 transition-colors"
                            >
                                <X className="h-3.5 w-3.5 text-slate-400" />
                            </button>
                        )}
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </div>

                {isOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg animate-in fade-in-0 zoom-in-95">
                        <div className="p-2 border-b border-slate-100">
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={placeholder}
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                        <div className="max-h-48 overflow-y-auto py-1">
                            {filteredOptions.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                                    Keine Ergebnisse
                                </div>
                            ) : (
                                filteredOptions.map(opt => (
                                    <div
                                        key={opt.value}
                                        className={`px-3 py-2 text-sm cursor-pointer transition-colors
                                            ${opt.value === value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-slate-50'}`}
                                        onClick={() => handleSelect(opt)}
                                    >
                                        {opt.label}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
    );
};
