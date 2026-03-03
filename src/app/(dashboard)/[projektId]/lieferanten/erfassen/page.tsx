'use client';
import { showAlert } from '@/lib/alert';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    ArrowLeft,
    Save,
    Truck,
    UserPlus,
    Trash2,
    Mail,
    Phone,
    MapPin,
    PlusCircle,
    Building2,
    Users
} from 'lucide-react';
import { SupplierService } from '@/lib/services/supplierService';
import Link from 'next/link';
import { Lieferant, KontaktPerson } from '@/types';
import { cn } from '@/lib/utils';

export default function CreateLieferantPage() {
    const { projektId } = useParams() as { projektId: string };
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState<Partial<Lieferant>>({
        name: '',
        kontakt: '',
        email: '',
        telefon: '',
        adresse: '',
        notizen: '',
        ansprechpartner: []
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addContact = () => {
        setFormData(prev => ({
            ...prev,
            ansprechpartner: [
                ...(prev.ansprechpartner || []),
                { name: '', funktion: '', telefon: '', email: '' }
            ]
        }));
    };

    const removeContact = (index: number) => {
        setFormData(prev => ({
            ...prev,
            ansprechpartner: (prev.ansprechpartner || []).filter((_, i) => i !== index)
        }));
    };

    const handleContactChange = (index: number, field: keyof KontaktPerson, value: string) => {
        setFormData(prev => {
            const newList = [...(prev.ansprechpartner || [])];
            newList[index] = { ...newList[index], [field]: value };
            return { ...prev, ansprechpartner: newList };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            showAlert('Bitte Firmenname eingeben');
            return;
        }

        setLoading(true);
        try {
            await SupplierService.createLieferant({
                ...formData,
                kategorie: 'Unternehmer'
            });
            router.push(`/${projektId}/produktion/lieferanten`);
        } catch (error) {
            console.error('Error creating supplier:', error);
            showAlert('Fehler beim Speichern');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] space-y-6 max-w-5xl mx-auto pb-10 overflow-y-auto pr-2">
            {/* Header */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                    <Link href={`/${projektId}/produktion/lieferanten`} className="h-10 w-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/10 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">WERTVERZEICHNIS</span>
                        <h1 className="text-3xl font-extrabold tracking-tight">Neuer Eintrag</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="h-11 px-8 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                        {loading ? '...' : <Save className="h-5 w-5" />}
                        <span>Speichern</span>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-2">
                {/* Company Details */}
                <Card className="border-none shadow-xl bg-card h-fit">
                    <CardHeader className="border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between py-4 min-h-[5.5rem]">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold">Unternehmensdaten</CardTitle>
                                <p className="text-xs text-muted-foreground font-medium">Primäre Informationen der Firma</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <Input
                            label="Firmenname *"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Unternehmen AG"
                            required
                        />

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground ml-1">Adresse</label>
                            <div className="relative">
                                <Input
                                    name="adresse"
                                    value={formData.adresse}
                                    onChange={handleChange}
                                    placeholder="Strasse 123, 8000 Zürich"
                                    className="pl-10"
                                />
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground ml-1">Zentrale Telefon</label>
                                <div className="relative">
                                    <Input
                                        name="telefon"
                                        value={formData.telefon}
                                        onChange={handleChange}
                                        placeholder="+41 00 000 00 00"
                                        className="pl-10"
                                    />
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground ml-1">Zentrale Email</label>
                                <div className="relative">
                                    <Input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="info@firma.ch"
                                        className="pl-10"
                                    />
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground ml-1">Interne Notizen</label>
                            <textarea
                                name="notizen"
                                value={formData.notizen}
                                onChange={handleChange}
                                className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-accent-foreground/30"
                                placeholder="..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Persons */}
                <div className="space-y-6 flex flex-col pt-0">
                    <Card className="border-none shadow-xl bg-card flex flex-col h-fit">
                        <CardHeader className="border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between py-4 min-h-[5.5rem]">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shrink-0">
                                    <Users className="h-5 w-5 text-orange-500" />
                                </div>
                                <div className="min-w-0">
                                    <CardTitle className="text-lg font-bold text-foreground truncate">Ansprechpartner</CardTitle>
                                    <p className="text-xs text-muted-foreground font-medium truncate">Direkte Kontaktpersonen</p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addContact}
                                className="font-bold gap-2 text-xs h-9 rounded-lg border-primary/20 hover:bg-primary/5 hover:text-primary transition-all shrink-0"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Hinzufügen
                            </Button>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin">
                            {formData.ansprechpartner?.length === 0 ? (
                                <div className="py-10 text-center space-y-3">
                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto opacity-50">
                                        <UserPlus className="h-6 w-6" />
                                    </div>
                                    <p className="text-sm text-muted-foreground font-medium">Noch keine Kontaktpersonen erfasst.</p>
                                </div>
                            ) : (
                                formData.ansprechpartner?.map((person, index) => (
                                    <div key={index} className="p-4 rounded-xl border border-border/50 bg-muted/5 space-y-4 group relative">
                                        <button
                                            type="button"
                                            onClick={() => removeContact(index)}
                                            className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="col-span-1 space-y-1">
                                                <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Name</label>
                                                <Input
                                                    value={person.name}
                                                    onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                                                    placeholder="Name"
                                                    className="h-9 text-xs"
                                                />
                                            </div>
                                            <div className="col-span-1 space-y-1">
                                                <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Funktion</label>
                                                <Input
                                                    value={person.funktion}
                                                    onChange={(e) => handleContactChange(index, 'funktion', e.target.value)}
                                                    placeholder="z.B. Projektleitung"
                                                    className="h-9 text-xs"
                                                />
                                            </div>
                                            <div className="col-span-1 space-y-1">
                                                <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Telefon</label>
                                                <div className="relative">
                                                    <Input
                                                        value={person.telefon}
                                                        onChange={(e) => handleContactChange(index, 'telefon', e.target.value)}
                                                        placeholder="Direkt-Nr."
                                                        className="h-9 text-xs pl-8"
                                                    />
                                                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40" />
                                                </div>
                                            </div>
                                            <div className="col-span-1 space-y-1">
                                                <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Email</label>
                                                <div className="relative">
                                                    <Input
                                                        value={person.email}
                                                        onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                                                        placeholder="Direkt-Email"
                                                        className="h-9 text-xs pl-8"
                                                    />
                                                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Preview Information */}
                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-4">
                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/20 shrink-0">
                            <Truck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm">System Hinweis</h4>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                Einträge in diesem Verzeichnis sind projektübergreifend verfügbar. Bitte stellen Sie sicher, dass alle Daten korrekt sind, bevor Sie speichern.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
