import React, { useState, useEffect, forwardRef, useRef } from 'react';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X, Check, Truck } from 'lucide-react';
import { Lagerort, Lieferant } from '@/types';
import { SupplierService } from '@/lib/services/supplierService';
import { LagerortService } from '@/lib/services/lagerortService';
import { v4 as uuidv4 } from 'uuid';

export interface LagerortSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
    projektId: string;
    lagerorte: Lagerort[];
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    error?: string;
    onLagerortAdded?: (newLagerort: Lagerort) => void;
}

export const LagerortSelect = forwardRef<HTMLSelectElement, LagerortSelectProps>(
    ({ projektId, lagerorte, value, onChange, error, onLagerortAdded, ...props }, ref) => {
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [searchTerm, setSearchTerm] = useState('');
        const [lieferanten, setLieferanten] = useState<Lieferant[]>([]);
        const [isLoading, setIsLoading] = useState(false);
        const selectRef = useRef<HTMLSelectElement | null>(null);

        // Merge refs to allow internal manipulation
        const handleRef = (el: HTMLSelectElement | null) => {
            selectRef.current = el;
            if (typeof ref === 'function') {
                ref(el);
            } else if (ref) {
                (ref as React.MutableRefObject<HTMLSelectElement | null>).current = el;
            }
        };

        const options = [
            { value: '', label: 'Kein Lagerort' },
            ...(Array.isArray(lagerorte) ? lagerorte : []).map(l => ({
                value: l.id,
                label: `${l.bezeichnung}${l.bereich ? ` (${l.bereich})` : ''} `
            })),
            { value: 'NEW_LIEFERANT', label: '➕ Neuer Lagerort (Lieferant)' }
        ];

        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            const val = e.target.value;
            if (val === 'NEW_LIEFERANT') {
                setIsModalOpen(true);
                // We do not propagate the 'NEW_LIEFERANT' value to react-hook-form immediately because it's not a real ID
                if (selectRef.current) {
                    selectRef.current.value = value || ''; // revert back
                }
            } else {
                if (onChange) onChange(e);
            }
        };

        useEffect(() => {
            if (isModalOpen && lieferanten.length === 0) {
                setIsLoading(true);
                SupplierService.getLieferanten()
                    .then(setLieferanten)
                    .catch(console.error)
                    .finally(() => setIsLoading(false));
            }
        }, [isModalOpen]);

        const handleCreateLagerort = async (lieferant: Lieferant) => {
            setIsLoading(true);
            try {
                const newLagerort: Lagerort = {
                    id: uuidv4(),
                    projektId,
                    bezeichnung: lieferant.name,
                    bereich: 'Lieferant',
                    beschreibung: 'Generiert via Lieferant-Auswahl'
                };

                await LagerortService.createLagerort(newLagerort);

                if (onLagerortAdded) {
                    onLagerortAdded(newLagerort);
                }

                setIsModalOpen(false);

                // Call onChange with a mock event
                if (onChange) {
                    const event = {
                        target: { value: newLagerort.id, name: props.name || '' }
                    } as unknown as React.ChangeEvent<HTMLSelectElement>;
                    onChange(event);
                }

            } catch (err) {
                console.error('Failed to create lagerort from lieferant', err);
                alert('Fehler beim Erstellen des Lagerorts');
            } finally {
                setIsLoading(false);
            }
        };

        const filteredSupplier = lieferanten.filter(l =>
            l.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <>
                <Select
                    ref={handleRef}
                    label="Lagerort"
                    options={options}
                    value={value}
                    onChange={handleChange}
                    error={error}
                    {...props}
                />

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in flex items-center justify-center p-4">
                        <div className="bg-card shadow-2xl rounded-2xl border-2 border-border w-full max-w-lg overflow-hidden animate-in zoom-in-95 fill-mode-forwards">
                            <div className="p-6 border-b border-border space-y-2">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                                        <Truck className="h-5 w-5 text-primary" />
                                        Lieferant als Lagerort
                                    </h2>
                                    <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="rounded-full">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">
                                    Wählen Sie einen Lieferanten, um automatisch einen Lagerort dafür zu erstellen.
                                </p>
                            </div>

                            <div className="p-4 bg-muted/20 border-b border-border">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Lieferant suchen..."
                                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold placeholder:font-normal shadow-sm"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto p-2">
                                {isLoading && lieferanten.length === 0 ? (
                                    <div className="text-center p-8 text-muted-foreground font-bold animate-pulse">
                                        Lade Lieferanten...
                                    </div>
                                ) : filteredSupplier.length === 0 ? (
                                    <div className="text-center p-8 text-muted-foreground font-bold">
                                        Keine Lieferanten gefunden
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {filteredSupplier.map(l => (
                                            <button
                                                key={l.id}
                                                type="button"
                                                onClick={() => handleCreateLagerort(l)}
                                                disabled={isLoading}
                                                className="w-full text-left px-4 py-3 rounded-xl hover:bg-muted font-bold flex flex-col transition-colors disabled:opacity-50"
                                            >
                                                <span className="text-foreground">{l.name}</span>
                                                {l.kontakt && <span className="text-xs text-muted-foreground">{l.kontakt}</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }
);
LagerortSelect.displayName = 'LagerortSelect';
