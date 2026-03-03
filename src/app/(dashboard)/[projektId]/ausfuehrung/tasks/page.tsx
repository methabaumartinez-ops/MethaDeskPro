'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TaskService } from '@/lib/services/taskService';
import { TeamService } from '@/lib/services/teamService';
import { SubtaskService } from '@/lib/services/subtaskService';
import { Task, Team, TaskStatus } from '@/types/ausfuehrung';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ClipboardList, Plus, FileQuestion, Filter, Info, Users, X } from 'lucide-react';
import { TaskForm } from '@/components/ausfuehrung/TaskForm';
import { TaskStatusBadge } from '@/components/ausfuehrung/TaskStatusBadge';
import { Badge } from '@/components/ui/badge';

export default function TasksPage({ params }: { params: { projektId: string } }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { projektId } = params;

    const [tasks, setTasks] = React.useState<Task[]>([]);
    const [teams, setTeams] = React.useState<Record<string, Team>>({});
    const [taskStats, setTaskStats] = React.useState<Record<string, { total: number, done: number }>>({});
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    // Filters
    const urlTeamId = searchParams.get('teamId') || 'all';
    const [filterTeamId, setFilterTeamId] = React.useState<string>(urlTeamId);
    const [filterStatus, setFilterStatus] = React.useState<string>('all');

    const loadData = React.useCallback(async () => {
        try {
            // Load filters
            const tId = filterTeamId === 'all' ? undefined : filterTeamId;
            const status = filterStatus === 'all' ? undefined : filterStatus as TaskStatus;

            const fetchedTasks = await TaskService.getTasks({ projektId, teamId: tId, status });
            setTasks(fetchedTasks);

            // Load Teams
            const allTeams = await TeamService.getTeams(projektId);
            const tMap: Record<string, Team> = {};
            allTeams.forEach(t => { tMap[t.id] = t; });
            setTeams(tMap);

            // Compute subtask stats to show progress
            const statsMap: Record<string, { total: number, done: number }> = {};
            for (const task of fetchedTasks) {
                const subT = await SubtaskService.getSubtasksByTaskId(task.id);
                statsMap[task.id] = {
                    total: subT.length,
                    done: subT.filter(s => s.status === 'fertig').length
                };
            }
            setTaskStats(statsMap);
        } catch (error) {
            console.error("Fehler beim Abrufen der Aufgaben.", error);
        }
    }, [projektId, filterTeamId, filterStatus]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSuccess = () => {
        setIsDialogOpen(false);
        setFilterTeamId('all'); // Reset filter to see new task
        setFilterStatus('all');
        loadData();
    };

    const teamOptions = React.useMemo(() => {
        const options = [{ value: 'all', label: 'Alle Teams' }];
        Object.values(teams).forEach(t => options.push({ value: t.id, label: t.name }));
        return options;
    }, [teams]);

    const statusOptions = [
        { value: 'all', label: 'Alle Status' },
        { value: 'offen', label: 'Offen' },
        { value: 'in_arbeit', label: 'In Arbeit' },
        { value: 'blockiert', label: 'Blockiert' },
        { value: 'fertig', label: 'Fertig' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <ClipboardList className="h-7 w-7 text-orange-500" />
                        Aufgabenverwaltung
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground mt-1">
                        Zentrale Steuerung aller Aufgaben und Teams
                    </p>
                </div>

                <div>
                    <Button
                        onClick={() => setIsDialogOpen(true)}
                        className="bg-orange-600 hover:bg-orange-700 font-bold text-white shadow-md shadow-orange-500/20 whitespace-nowrap"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Aufgabe erstellen
                    </Button>
                    {isDialogOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden relative animate-in fade-in zoom-in duration-200">
                                <div className="bg-orange-50/50 p-6 border-b border-orange-100 flex justify-between items-center">
                                    <h2 className="text-xl font-black text-slate-800">Neue Aufgabe</h2>
                                    <button onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-orange-100/50 transition-colors">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="p-6 max-h-[85vh] overflow-y-auto">
                                    <TaskForm
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

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500 min-w-max mr-2">
                    <Filter className="h-4 w-4" /> Filter:
                </div>
                <Select
                    value={filterTeamId}
                    onChange={(e) => setFilterTeamId(e.target.value)}
                    options={teamOptions}
                    className="w-full sm:w-[200px]"
                />
                <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    options={statusOptions}
                    className="w-full sm:w-[150px]"
                />
            </div>

            {tasks.length === 0 ? (
                <Card className="border border-dashed border-slate-300 shadow-none bg-slate-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
                        <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center border-2 border-slate-200 shadow-sm">
                            <FileQuestion className="h-8 w-8 text-slate-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-700">Keine Aufgaben gefunden</h3>
                            <p className="text-slate-500 text-sm mt-1 max-w-sm">
                                {filterTeamId !== 'all' || filterStatus !== 'all'
                                    ? "Mit diesen Filtern wurden keine Aufgaben gefunden. Bitte passen Sie die Suche an."
                                    : "Es wurden noch keine Aufgaben registriert. Erstellen Sie die erste, um anzufangen."}
                            </p>
                        </div>
                        {filterTeamId === 'all' && filterStatus === 'all' ? (
                            <Button variant="outline" className="mt-2 font-bold" onClick={() => setIsDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> Erste Aufgabe erstellen
                            </Button>
                        ) : (
                            <Button variant="ghost" className="mt-2 text-orange-600" onClick={() => { setFilterTeamId('all'); setFilterStatus('all'); }}>
                                Filter zurücksetzen
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {tasks.map(task => {
                        const teamName = teams[task.teamId]?.name || 'Unbekanntes Team';
                        const stats = taskStats[task.id] || { total: 0, done: 0 };
                        const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

                        return (
                            <Card
                                key={task.id}
                                onClick={() => router.push(`/${projektId}/ausfuehrung/tasks/${task.id}`)}
                                className="group cursor-pointer border border-slate-200 hover:border-orange-500/50 transition-all hover:shadow-lg hover:-translate-y-1 duration-300 flex flex-col"
                            >
                                <CardHeader className="p-5 pb-3">
                                    <div className="flex justify-between items-start mb-2 gap-2">
                                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-semibold truncate gap-1 text-[10px] uppercase py-0.5">
                                            <Users className="h-3 w-3" />
                                            {teamName}
                                        </Badge>
                                        <TaskStatusBadge status={task.status} />
                                    </div>
                                    <CardTitle className="text-lg font-bold text-slate-800 line-clamp-2 group-hover:text-orange-600 transition-colors leading-tight">
                                        {task.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 pt-1 mt-auto">
                                    {task.description && (
                                        <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                                            {task.description}
                                        </p>
                                    )}
                                    <div className="mt-4 border-t border-slate-100 pt-4 flex items-center justify-between">
                                        <div className="flex flex-col gap-1 w-full max-w-[60%]">
                                            <div className="flex justify-between text-xs font-bold text-slate-500">
                                                <span>Fortschritt</span>
                                                <span className={progress === 100 ? "text-green-600" : ""}>{progress}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-orange-500'}`}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-right text-xs font-semibold text-slate-400 ml-4">
                                            {stats.done} / {stats.total} Unteraufgaben
                                        </div>
                                    </div>
                                    {task.priority !== 'mittel' && (
                                        <div className="mt-3 flex items-center gap-1.5 text-xs font-bold">
                                            <Info className={`h-3.5 w-3.5 ${task.priority === 'kritisch' ? 'text-red-500' : task.priority === 'hoch' ? 'text-orange-500' : 'text-slate-400'}`} />
                                            <span className={`uppercase tracking-wider ${task.priority === 'kritisch' ? 'text-red-500' : task.priority === 'hoch' ? 'text-orange-600' : 'text-slate-500'}`}>
                                                Priorität {task.priority}
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
