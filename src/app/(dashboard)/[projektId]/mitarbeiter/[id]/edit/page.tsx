'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus } from 'lucide-react';
import { EmployeeService } from '@/lib/services/employeeService';

export default function MitarbeiterEditPage() {
    const { projektId, id } = useParams() as { projektId: string; id: string };
    const router = useRouter();
    const [formData, setFormData] = React.useState({
        vorname: '',
        nachname: '',
        email: '',
        rolle: '',
        image: ''
    });

    React.useEffect(() => {
        const load = async () => {
            const found = await EmployeeService.getMitarbeiterById(id);
            if (found) {
                setFormData({
                    vorname: found.vorname,
                    nachname: found.nachname,
                    email: found.email,
                    rolle: found.rolle,
                    image: found.image || ''
                });
            }
        };
        load();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await EmployeeService.updateMitarbeiter(id, formData);
            router.push(`/${projektId}/mitarbeiter/${id}`);
        } catch (error) {
            console.error("Failed to update employee", error);
            alert("Fehler beim Speichern");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Mitarbeiter bearbeiten</h1>
                    <p className="text-slate-500 font-medium mt-1">Daten aktualisieren</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Persönliche Informationen</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="h-24 w-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 group cursor-pointer hover:border-primary hover:bg-orange-50/30 transition-all overflow-hidden">
                                {formData.image ? (
                                    <img src={formData.image} className="h-full w-full object-cover" />
                                ) : (
                                    <Plus className="h-8 w-8 group-hover:text-primary transition-colors" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700">Profilbild ändern</p>
                                <p className="text-xs text-slate-400 font-medium">Klicken zum Hochladen</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 block">Vorname</label>
                                <Input
                                    value={formData.vorname}
                                    onChange={(e) => setFormData({ ...formData, vorname: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 block">Nachname</label>
                                <Input
                                    value={formData.nachname}
                                    onChange={(e) => setFormData({ ...formData, nachname: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700 mb-2 block">E-Mail</label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700 mb-2 block">Rolle</label>
                            <Input
                                value={formData.rolle}
                                onChange={(e) => setFormData({ ...formData, rolle: e.target.value })}
                                required
                            />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button type="submit" className="font-bold">Speichern</Button>
                            <Button type="button" variant="outline" onClick={() => router.back()}>Abbrechen</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
