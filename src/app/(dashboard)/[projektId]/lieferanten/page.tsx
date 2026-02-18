'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SupplierService } from '@/lib/services/supplierService';
import { Lieferant } from '@/types';
import { Plus, Mail, Phone, Truck, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function LieferantenListPage() {
    const { projektId } = useParams() as { projektId: string };
    const [items, setItems] = useState<Lieferant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await SupplierService.getLieferanten();
                setItems(data);
            } catch (err) {
                console.error('Failed to load suppliers:', err);
                setError('Fehler beim Laden der Lieferanten.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Lieferanten</h1>
                    <p className="text-muted-foreground font-medium mt-1">Kontaktliste der Partner und Lieferanten.</p>
                </div>
                <Link href={`/${projektId}/lieferanten/erfassen`}>
                    <Button className="font-bold shadow-lg shadow-primary/20">
                        <Plus className="h-5 w-5 mr-2" />
                        Lieferant hinzufügen
                    </Button>
                </Link>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <Card key={i} className="animate-pulse bg-muted h-48" />
                    ))
                ) : items.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-muted-foreground">
                        Keine Lieferanten gefunden.
                    </div>
                ) : items.map((item) => (
                    <Card key={item.id} className="hover:shadow-lg transition-all group">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="p-2 rounded-xl bg-orange-50 text-primary dark:bg-orange-950/30">
                                    <Truck className="h-6 w-6" />
                                </div>
                            </div>
                            <CardTitle className="mt-4 text-xl font-bold text-foreground">{item.name}</CardTitle>
                            <p className="text-sm font-bold text-muted-foreground">{item.kontakt}</p>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-4">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                <Mail className="h-4 w-4 text-muted-foreground/70" />
                                <a href={`mailto:${item.email}`} className="hover:text-primary transition-colors">{item.email}</a>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                <Phone className="h-4 w-4 text-muted-foreground/70" />
                                <a href={`tel:${item.telefon}`} className="hover:text-primary transition-colors">{item.telefon}</a>
                            </div>
                            {item.adresse && (
                                <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                    <MapPin className="h-4 w-4 text-muted-foreground/70" />
                                    <span>{item.adresse}</span>
                                </div>
                            )}
                        </CardContent>
                        <div className="p-4 bg-muted/30 border-t border-border mt-2">
                            {/* TODO: Implement Detail View or Edit */}
                            <Button variant="ghost" className="w-full font-bold text-primary h-8">Profil ansehen</Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
