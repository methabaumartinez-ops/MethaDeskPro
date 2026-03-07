'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { TeamService } from '@/lib/services/teamService';
import { WorkerService } from '@/lib/services/workerService';
import { Team, Worker } from '@/types/ausfuehrung';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UsersRound, Plus, Pencil, ArrowRight, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TeamForm } from '@/components/ausfuehrung/TeamForm';

export default function TeamsPage({ params }: { params: Promise<{ projektId: string }> }) {
    const { projektId } = React.use(params);
    const router = useRouter();

    const [teams, setTeams] = React.useState<Team[]>([]);
    const [workersData, setWorkersData] = React.useState<Record<string, Worker>>({});
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    const loadData = React.useCallback(async () => {
        try {
            const fetchedTeams = await TeamService.getTeams(projektId);
            setTeams(fetchedTeams);

            // To display avatar/names in cards, we need the mapping.
            const allWorkers = await WorkerService.getAllWorkers(projektId);
            const wMap: Record<string, Worker> = {};
            allWorkers.forEach(w => {
                wMap[w.id] = w;
            });
            setWorkersData(wMap);
        } catch (error) {
            console.error("Fehler beim Abrufen der Teams.", error);
        }
    }, [projektId]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSuccess = () => {
        setIsDialogOpen(false);
        loadData();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Users className="h-7 w-7 text-orange-500" />
                        Teamverwaltung
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground mt-1">
                        Übersicht aller Einsatztruppen für dieses Projekt
                    </p>
                </div>

                <div>
                    <Button
                        onClick={() => setIsDialogOpen(true)}
                        className="bg-orange-500 hover:bg-orange-600 font-bold text-white shadow-md shadow-orange-500/20 whitespace-nowrap"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Team erstellen
                    </Button>

                    {isDialogOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
                                <div className="bg-orange-50/50 p-6 border-b border-orange-100 flex justify-between items-center">
                                    <h2 className="text-xl font-black text-slate-800">Neues Team anlegen</h2>
                                    <button onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-orange-100/50 transition-colors">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="p-6">
                                    <TeamForm
                                        projektId={projektId}
                                        onSuccess={handleSuccess}
                                        onCancel={() => setIsDialogOpen(false)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {teams.length === 0 ? (
                <Card className="border border-dashed border-slate-300 shadow-none bg-slate-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
                        <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center border-2 border-slate-200">
                            <UsersRound className="h-8 w-8 text-slate-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-700">Keine Teams gefunden</h3>
                            <p className="text-slate-500 text-sm mt-1 max-w-sm">Es wurden noch keine Teams in diesem Projekt registriert. Erstellen Sie eines, um loszulegen.</p>
                        </div>
                        <Button
                            variant="outline"
                            className="mt-2 font-bold"
                            onClick={() => setIsDialogOpen(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Erstes Team erstellen
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {teams.map(team => (
                        <Card
                            key={team.id}
                            onClick={() => router.push(`/${projektId}/ausfuehrung/teams/${team.id}`)}
                            className="group cursor-pointer border border-slate-200 hover:border-orange-500/50 transition-all hover:shadow-xl hover:-translate-y-1 duration-300 overflow-hidden relative"
                        >
                            <CardHeader className="p-5 pb-3 bg-gradient-to-b from-slate-50 to-white">
                                <CardTitle className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-orange-600 transition-colors">
                                    {team.name}
                                </CardTitle>
                                {team.description && (
                                    <p className="text-sm font-medium text-slate-500 mt-2 line-clamp-2">
                                        {team.description}
                                    </p>
                                )}
                            </CardHeader>
                            <CardContent className="p-5 pt-3">
                                <div className="mt-2 flex flex-col gap-3">
                                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                                        <span>Mitglieder ({(team.members || []).length})</span>
                                        <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-orange-500 transition-all duration-300" />
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(team.members || []).slice(0, 4).map(wId => {
                                            const w = workersData[wId];
                                            if (!w) return null;
                                            return (
                                                <Badge key={wId} variant="secondary" className="bg-slate-100 text-slate-700 border-0 font-semibold px-2">
                                                    {w.fullName.split(' ')[0]} {/* Show first name for brevity */}
                                                </Badge>
                                            );
                                        })}
                                        {(team.members || []).length > 4 && (
                                            <Badge variant="outline" className="border-dashed border-slate-300 text-slate-400 font-bold px-2">
                                                +{(team.members || []).length - 4} weitere
                                            </Badge>
                                        )}
                                        {(!team.members || team.members.length === 0) && (
                                            <span className="text-[11px] text-muted-foreground italic">Keine Mitglieder</span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
