'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { TeamService } from '@/lib/services/teamService';
import { WorkerService } from '@/lib/services/workerService';
import { Team, Worker } from '@/types/ausfuehrung';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ArrowLeft, Pencil, Trash2, ShieldAlert, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TeamForm } from '@/components/ausfuehrung/TeamForm';

const toast = {
    success: (msg: string) => window.alert('Erfolg: ' + msg),
    error: (msg: string) => window.alert('Fehler: ' + msg)
};

export default function TeamDetailPage({ params }: { params: { projektId: string, id: string } }) {
    const router = useRouter();
    const { projektId, id } = params;

    const [team, setTeam] = React.useState<Team | null>(null);
    const [workers, setWorkers] = React.useState<Worker[]>([]);
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('members');

    const loadData = React.useCallback(async () => {
        try {
            const fetchedTeam = await TeamService.getTeamById(id);
            if (!fetchedTeam) {
                toast.error('Gefundene Fehler: Das Team wurde nicht gefunden.');
                router.push(`/${projektId}/ausfuehrung/teams`);
                return;
            }
            setTeam(fetchedTeam);

            const allWorkers = await WorkerService.getAllWorkers();
            const teamWorkers = allWorkers.filter(w => fetchedTeam.members.includes(w.id));
            setWorkers(teamWorkers);
        } catch (error) {
            console.error("Fehler beim Abrufen der Teamdetails.", error);
        }
    }, [id, projektId, router]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDelete = async () => {
        try {
            await TeamService.deleteTeam(id);
            toast.success('Team erfolgreich gelöscht.');
            router.push(`/${projektId}/ausfuehrung/teams`);
        } catch (e) {
            toast.error('Konnte Team nicht löschen.');
        }
    };

    if (!team) return <div className="p-8 text-center text-slate-500 font-medium">Lade Team-Daten...</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header / Nav */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <Button
                    variant="ghost"
                    className="text-slate-500 hover:text-orange-600 pl-0 -ml-2"
                    onClick={() => router.push(`/${projektId}/ausfuehrung/teams`)}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Zurück zur Übersicht
                </Button>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="font-bold border-slate-200"
                        onClick={() => setIsEditDialogOpen(true)}
                    >
                        <Pencil className="mr-2 h-4 w-4" /> Bearbeiten
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
                        className="font-bold border border-red-200"
                        onClick={() => setIsDeleteDialogOpen(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Löschen
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Col - Team Info */}
                <Card className="col-span-1 border border-slate-200 shadow-sm overflow-hidden bg-white">
                    <CardHeader className="bg-orange-50/50 p-6 border-b border-slate-100">
                        <div className="h-12 w-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4 border border-orange-200 shadow-inner">
                            <Users className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
                            {team.name}
                        </CardTitle>
                        {team.description && (
                            <p className="text-sm font-medium mt-2 leading-relaxed">
                                {team.description}
                            </p>
                        )}
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 pb-2 border-b border-slate-100">
                            Zusammenfassung
                        </div>
                        <div className="space-y-4">
                            <div>
                                <span className="block text-xs uppercase text-slate-400 font-bold mb-1 tracking-wider">Erstellt am</span>
                                <span className="text-sm font-semibold text-slate-700">{new Date(team.createdAt).toLocaleDateString('de-CH')}</span>
                            </div>
                            <div>
                                <span className="block text-xs uppercase text-slate-400 font-bold mb-1 tracking-wider">Mitgliederzahl</span>
                                <span className="text-sm font-semibold text-slate-700">{team.members.length} Personen</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Col - Tabs */}
                <div className="col-span-1 md:col-span-2">
                    <Tabs className="w-full">
                        <TabsList className="grid w-full grid-cols-2 max-w-sm mb-6">
                            <TabsTrigger active={activeTab === 'members'} onClick={() => setActiveTab('members')} className="font-bold">Mitglieder ({workers.length})</TabsTrigger>
                            <TabsTrigger active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} className="font-bold">Aktuelle Aufgaben</TabsTrigger>
                        </TabsList>

                        <TabsContent active={activeTab === 'members'} className="mt-0">
                            <Card className="border border-slate-200 shadow-sm border-t-4 border-t-orange-500">
                                <CardContent className="p-0">
                                    {workers.length === 0 ? (
                                        <div className="p-10 text-center">
                                            <p className="text-sm font-medium text-muted-foreground italic">Dieses Team hat noch keine zugewiesenen Mitglieder.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {workers.map(w => (
                                                <div key={w.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/80 transition-colors">
                                                    <div className="h-10 w-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center bg-orange-100 text-orange-700 font-bold text-xs uppercase">
                                                        {w.fullName.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{w.fullName}</p>
                                                        <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">{w.role || 'Mitarbeiter'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent active={activeTab === 'tasks'} className="mt-0">
                            <Card className="border border-slate-200 shadow-sm border-t-4 border-t-orange-500 bg-slate-50/50">
                                <CardContent className="p-10 text-center">
                                    <h3 className="font-black text-slate-800 text-lg mb-2">Beschreibung</h3>
                                    <p className="text-slate-600 font-medium whitespace-pre-wrap">{team.description}</p>
                                    <p className="text-sm font-medium text-muted-foreground italic mb-6">
                                        Die Verwaltung der Aufgaben dieses Teams befindet sich derzeit in Bearbeitung. (Kommendes Feature)
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="font-bold tracking-tight text-orange-600 border-orange-200 hover:bg-orange-50"
                                        onClick={() => router.push(`/${projektId}/ausfuehrung/tasks?teamId=${team.id}`)}
                                    >
                                        Zu den Aufgaben wechseln
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Edit Dialog - Inline Modal */}
            {isEditDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
                        <div className="bg-orange-50/50 p-6 border-b border-orange-100 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-800">Team bearbeiten</h2>
                            <button onClick={() => setIsEditDialogOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-orange-100/50 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <TeamForm
                                projektId={projektId}
                                teamToEdit={team}
                                onSuccess={() => { setIsEditDialogOpen(false); loadData(); }}
                                onCancel={() => setIsEditDialogOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Dialog */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                title="Aktion bestätigen"
                description={`Möchten Sie das Team "${team.name}" wirklich entfernen? Mitglieder werden vom Team getrennt, aber nicht aus dem System gelöscht. Achtung: Verbundene Aufgaben werden ihre Zuweisung verlieren!`}
                variant="danger"
                cancelLabel="Abbrechen"
                confirmLabel="Team löschen"
            />
        </div>
    );
}
