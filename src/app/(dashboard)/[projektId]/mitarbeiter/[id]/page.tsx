'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Mail, Shield, Phone, Calendar } from 'lucide-react';
import Link from 'next/link';
import { EmployeeService } from '@/lib/services/employeeService';

export default function MitarbeiterDetailPage() {
    const { projektId, id } = useParams() as { projektId: string; id: string };
    const router = useRouter();
    const [mitarbeiter, setMitarbeiter] = React.useState<any>(null);

    React.useEffect(() => {
        const loadMitarbeiter = async () => {
            const found = await EmployeeService.getMitarbeiterById(id);
            setMitarbeiter(found);
        };
        loadMitarbeiter();
    }, [id]);

    if (!mitarbeiter) {
        return (
            <div className="h-96 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {mitarbeiter.vorname} {mitarbeiter.nachname}
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Mitarbeiter Details</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Persönliche Informationen
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-6 pb-4 border-b border-slate-100">
                            <div className="h-20 w-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shadow-soft">
                                {mitarbeiter.image ? (
                                    <img src={mitarbeiter.image} alt={mitarbeiter.vorname} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                                        <User className="h-10 w-10" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-xl font-extrabold text-slate-900 leading-tight">
                                    {mitarbeiter.vorname} {mitarbeiter.nachname}
                                </p>
                                <p className="text-sm font-bold text-primary mt-1 uppercase tracking-wider">{mitarbeiter.rolle}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 pt-2">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">E-Mail Adresse</label>
                                <p className="text-sm font-semibold text-slate-700 mt-1 flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                                    {mitarbeiter.email}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Aktionen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Link href={`/${projektId}/mitarbeiter/${id}/edit`}>
                            <Button className="w-full font-bold">Bearbeiten</Button>
                        </Link>
                        <Button
                            variant="outline"
                            className="w-full font-bold text-red-600 hover:bg-red-50"
                            onClick={async () => {
                                if (confirm(`Sind Sie sicher, dass Sie "${mitarbeiter.vorname} ${mitarbeiter.nachname}" löschen möchten?`)) {
                                    try {
                                        await EmployeeService.deleteMitarbeiter(id);
                                        router.push(`/${projektId}/mitarbeiter`);
                                    } catch (error) {
                                        console.error("Failed to delete", error);
                                        alert("Fehler beim Löschen");
                                    }
                                }
                            }}
                        >
                            Löschen
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
