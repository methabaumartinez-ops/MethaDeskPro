'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface WorkerTypeaheadProps {
    workers: { id: string; fullName: string; role?: string }[];
    selectedIds: string[];
    onChange: (selectedIds: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function WorkerTypeahead({
    workers,
    selectedIds,
    onChange,
    placeholder = 'Mitarbeiter auswählen...',
    disabled = false
}: WorkerTypeaheadProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleWorker = (id: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((selId) => selId !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const removeWorker = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selectedIds.filter((selId) => selId !== id));
    };

    const selectedWorkers = workers.filter((w) => selectedIds.includes(w.id));
    const filteredWorkers = React.useMemo(() => {
        return workers
            .filter(w =>
                w.fullName.toLowerCase().includes(search.toLowerCase()) ||
                w.role?.toLowerCase().includes(search.toLowerCase())
            )
            .sort((a, b) => a.fullName.localeCompare(b.fullName));
    }, [workers, search]);

    return (
        <div className="flex flex-col gap-2 relative" ref={containerRef}>
            <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                disabled={disabled}
                className="w-full justify-between h-auto min-h-[2.5rem] py-2 px-3 focus:ring-1 focus:ring-orange-500 hover:text-foreground"
            >
                <div className="flex flex-wrap gap-1.5 items-center max-w-[90%] font-normal text-sm">
                    {selectedWorkers.length > 0 ? (
                        selectedWorkers.map((worker) => (
                            <Badge
                                key={worker.id}
                                variant="secondary"
                                className="bg-slate-100 hover:bg-slate-200 text-slate-800 border-transparent rounded-sm pl-2 pr-1 py-0.5 text-xs inline-flex items-center gap-1 font-medium z-10"
                            >
                                <span className="truncate max-w-[120px]">{worker.fullName}</span>
                                <div
                                    role="button"
                                    className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-slate-300/50 cursor-pointer ml-1"
                                    onClick={(e) => removeWorker(worker.id, e)}
                                >
                                    <X className="h-2.5 w-2.5" />
                                </div>
                            </Badge>
                        ))
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-slate-400 group-hover:text-slate-600" />
            </Button>

            {open && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-slate-100">
                        <Input
                            autoFocus
                            placeholder="Suchen..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-8 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors shadow-inner"
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                        {filteredWorkers.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-500">Keine Mitarbeiter gefunden.</div>
                        ) : (
                            filteredWorkers.map((worker) => {
                                const isSelected = selectedIds.includes(worker.id);
                                return (
                                    <div
                                        key={worker.id}
                                        onClick={(e) => toggleWorker(worker.id, e)}
                                        className="cursor-pointer flex items-center gap-2 px-2 py-2 hover:bg-slate-50 rounded-md transition-colors"
                                    >
                                        <div className={cn(
                                            "flex h-4 w-4 items-center justify-center rounded-sm border shadow-sm transition-all",
                                            isSelected
                                                ? "border-orange-500 bg-orange-500 text-white"
                                                : "border-slate-200 bg-white"
                                        )}>
                                            <Check className={cn(
                                                "h-3 w-3",
                                                isSelected ? "opacity-100" : "opacity-0"
                                            )} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium line-clamp-1">
                                                {worker.fullName}
                                            </span>
                                            {worker.role && (
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                                    {worker.role}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
