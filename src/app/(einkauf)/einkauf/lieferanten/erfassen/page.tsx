'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Truck } from 'lucide-react';
import { SupplierService } from '@/lib/services/supplierService';
import Link from 'next/link';
import { Lieferant } from '@/types';

export default function CreateLieferantPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Lieferant>>({
        name: '',
        kontakt: '',
        email: '',
        telefon: '',
        adresse: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!formData.name) {
                alert('Bitte geben Sie einen Namen ein.');
                return;
            }

            await SupplierService.createLieferant(formData);
            router.push('/einkauf?tab=lieferanten');
        } catch (error) {
            console.error('Failed to create supplier:', error);
            alert('Fehler beim Erstellen des Lieferanten.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/einkauf">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Neuen Lieferanten erfassen</h1>
                    <p className="text-muted-foreground">Fügen Sie einen neuen Lieferanten zur Datenbank hinzu.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Truck className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Lieferantendaten</CardTitle>
                            <p className="text-sm text-muted-foreground">Basisinformationen zum Unternehmen</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Firmenname *</label>
                            <Input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="z.B. Baustoffe Müller GmbH"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Kontaktperson</label>
                                <Input
                                    name="kontakt"
                                    value={formData.kontakt}
                                    onChange={handleChange}
                                    placeholder="Max Mustermann"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Telefon</label>
                                <Input
                                    name="telefon"
                                    value={formData.telefon}
                                    onChange={handleChange}
                                    placeholder="+41 44 123 45 67"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">E-Mail</label>
                            <Input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="info@firma.ch"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Adresse</label>
                            <Input
                                name="adresse"
                                value={formData.adresse}
                                onChange={handleChange}
                                placeholder="Musterstrasse 1, 8000 Zürich"
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-2">
                            <Link href="/einkauf">
                                <Button type="button" variant="outline">Abbrechen</Button>
                            </Link>
                            <Button type="submit" disabled={loading} className="font-bold">
                                {loading ? 'Speichere...' : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Lieferant erstellen
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
