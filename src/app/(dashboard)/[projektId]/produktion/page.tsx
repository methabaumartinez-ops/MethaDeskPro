'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// Services
import { SubsystemService } from '@/lib/services/subsystemService';
import { ProjectService } from '@/lib/services/projectService';
import { TeamService } from '@/lib/services/teamService';
import { TaskService } from '@/lib/services/taskService';
import { SubtaskService } from '@/lib/services/subtaskService';
import { WorkerService } from '@/lib/services/workerService';

// Types
import { Teilsystem, Projekt, Team, Task } from '@/types';
import { Worker } from '@/types/ausfuehrung';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TeilsystemTable } from '@/components/shared/TeilsystemTable';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { TaskStatusBadge } from '@/components/ausfuehrung/TaskStatusBadge';
import { TaskForm } from '@/components/ausfuehrung/TaskForm';
import { TeamForm } from '@/components/ausfuehrung/TeamForm';
import { Select } from '@/components/ui/select';

// Icons
import {
    Factory, Layers, Hammer, Users, UsersRound, ClipboardList,
    BarChart3, Plus, X, Filter, ArrowRight, Info,
    CheckCircle2, Clock, AlertTriangle, Calendar, TrendingUp
} from 'lucide-react';

/* ─────────────────────────── MAIN HUB ─────────────────────────── */
export default function ProduktionHubPage() {
    const { projektId } = useParams() as { projektId: string };
    const router = useRouter();

    // ── Shared Data State ──
    const [teilsysteme, setTeilsysteme] = useState<Teilsystem[]>([]);
    const [project, setProject] = useState<Projekt | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [workers, setWorkers] = useState<Record<string, Worker>>({});
    const [taskStats, setTaskStats] = useState<Record<string, { total: number; done: number }>>({});
    const [loading, setLoading] = useState(true);

    // ── Tab State ──
    const [activeWorkspace, setActiveWorkspace] = useState('teilsysteme');
    const [tsSubTab, setTsSubTab] = useState('alle');
    const [search, setSearch] = useState('');

    // ── Modal State ──
    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

    // ── Task Filters ──
    const [filterTeamId, setFilterTeamId] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    // ── Load Data ──
    const loadData = async () => {
        setLoading(true);
        try {
            const [ts, proj, tms, tks, wkrs] = await Promise.all([
                SubsystemService.getTeilsysteme(projektId),
                ProjectService.getProjektById(projektId),
                TeamService.getTeams(projektId),
                TaskService.getTasks({ projektId }),
                WorkerService.getAllWorkers(projektId),
            ]);
            setTeilsysteme(ts);
            setProject(proj);
            setTeams(tms);
            setTasks(tks);

            const wMap: Record<string, Worker> = {};
            (wkrs as Worker[]).forEach(w => { wMap[w.id] = w; });
            setWorkers(wMap);

            // Subtask stats for tasks
            const statsMap: Record<string, { total: number; done: number }> = {};
            for (const task of tks) {
                try {
                    const subs = await SubtaskService.getSubtasksByTaskId(task.id);
                    statsMap[task.id] = {
                        total: subs.length,
                        done: subs.filter((s: any) => s.status === 'fertig').length,
                    };
                } catch { statsMap[task.id] = { total: 0, done: 0 }; }
            }
            setTaskStats(statsMap);
        } catch (error) {
            console.error('Failed to load production data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [projektId]);

    // ── Teilsysteme Filtering ──
    const filteredTS = useMemo(() =>
        teilsysteme.filter(item =>
            (item.teilsystemNummer?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (item.name?.toLowerCase() || '').includes(search.toLowerCase())
        ), [teilsysteme, search]);

    const baumeisterTS = useMemo(() =>
        filteredTS.filter(item => item.ks === '1' || String(item.ks).toLowerCase().includes('baumeister')),
        [filteredTS]);

    const produktionTS = useMemo(() =>
        filteredTS.filter(item => item.ks === '2' || String(item.ks).toLowerCase().includes('produkt')),
        [filteredTS]);

    // ── Task Filtering ──
    const filteredTasks = useMemo(() =>
        tasks.filter(t => {
            if (filterTeamId !== 'all' && t.teamId !== filterTeamId) return false;
            if (filterStatus !== 'all' && t.status !== filterStatus) return false;
            return true;
        }), [tasks, filterTeamId, filterStatus]);

    const teamsMap = useMemo(() => {
        const m: Record<string, Team> = {};
        teams.forEach(t => { m[t.id] = t; });
        return m;
    }, [teams]);

    const tsMap = useMemo(() => {
        const m: Record<string, Teilsystem> = {};
        teilsysteme.forEach(ts => { m[ts.id] = ts; });
        return m;
    }, [teilsysteme]);

    // ── Analyse Metrics ──
    const analyseMetrics = useMemo(() => {
        const statusCounts: Record<string, number> = {};
        teilsysteme.forEach(ts => {
            const s = ts.status || 'offen';
            statusCounts[s] = (statusCounts[s] || 0) + 1;
        });

        const upcomingMontage = teilsysteme
            .filter(ts => ts.montagetermin)
            .sort((a, b) => (a.montagetermin || '').localeCompare(b.montagetermin || ''))
            .slice(0, 5);

        const openTasks = tasks.filter(t => t.status === 'Offen' || t.status === 'In Arbeit').length;
        const doneTasks = tasks.filter(t => t.status === 'Erledigt').length;

        return { statusCounts, upcomingMontage, openTasks, doneTasks };
    }, [teilsysteme, tasks]);

    // ── Dynamic search placeholder ──
    const searchPlaceholder = activeWorkspace === 'teilsysteme'
        ? 'Suche nach Nummer o. Name...'
        : activeWorkspace === 'teams' ? 'Suche nach Team...'
        : activeWorkspace === 'tareas' ? 'Suche nach Aufgabe...'
        : 'Suche...';

    const autocompleteItems = activeWorkspace === 'teilsysteme'
        ? teilsysteme.map(i => ({ id: i.id, label: `${i.teilsystemNummer ?? ''} — ${i.name}`.trim() }))
        : [];

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            <ModuleActionBanner
                icon={Factory}
                title="Produktion"
                items={autocompleteItems}
                onSelect={(id) => router.push(`/${projektId}/teilsysteme/${id}`)}
                onSearch={(q) => setSearch(q)}
                searchPlaceholder={searchPlaceholder}
            />

            {/* ── Workspace Tabs ── */}
            <Tabs className="w-full">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                    <TabsList className="bg-transparent p-0 gap-2 h-auto flex-wrap">
                        {([
                            { key: 'teilsysteme', label: 'Teilsysteme', icon: Layers, count: teilsysteme.length },
                            { key: 'teams', label: 'Teams', icon: Users, count: teams.length },
                            { key: 'tareas', label: 'Aufgaben', icon: ClipboardList, count: tasks.length },
                            { key: 'analyse', label: 'Analyse', icon: BarChart3 },
                        ] as const).map(tab => (
                            <TabsTrigger
                                key={tab.key}
                                active={activeWorkspace === tab.key}
                                onClick={() => setActiveWorkspace(tab.key)}
                                className={cn(
                                    'flex items-center gap-2 font-black text-xs uppercase px-6 h-11 rounded-full border-2 transition-all',
                                    activeWorkspace === tab.key
                                        ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200'
                                        : 'bg-white border-slate-100 text-slate-500 hover:border-orange-200 hover:text-orange-600'
                                )}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                                {'count' in tab && tab.count !== undefined && (
                                    <Badge className={cn(
                                        'ml-1 h-5 px-1.5 font-black text-[10px] border-none',
                                        activeWorkspace === tab.key
                                            ? 'bg-white/30 text-white'
                                            : 'bg-slate-100 text-slate-500'
                                    )}>
                                        {tab.count}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center space-y-4">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                        <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Laden...</p>
                    </div>
                ) : (
                    <>
                        {/* ═══════════ TEILSYSTEME ═══════════ */}
                        <TabsContent active={activeWorkspace === 'teilsysteme'} className="mt-0">
                            <TeilsystemeWorkspace
                                filteredTS={filteredTS}
                                baumeisterTS={baumeisterTS}
                                produktionTS={produktionTS}
                                tsSubTab={tsSubTab}
                                setTsSubTab={setTsSubTab}
                                loading={false}
                                projektId={projektId}
                                project={project}
                                router={router}
                            />
                        </TabsContent>

                        {/* ═══════════ TEAMS ═══════════ */}
                        <TabsContent active={activeWorkspace === 'teams'} className="mt-0">
                            <TeamsWorkspace
                                teams={teams}
                                workers={workers}
                                projektId={projektId}
                                router={router}
                                isDialogOpen={isTeamDialogOpen}
                                setIsDialogOpen={setIsTeamDialogOpen}
                                onRefresh={loadData}
                            />
                        </TabsContent>

                        {/* ═══════════ TAREAS ═══════════ */}
                        <TabsContent active={activeWorkspace === 'tareas'} className="mt-0">
                            <TareasWorkspace
                                tasks={filteredTasks}
                                allTasks={tasks}
                                teamsMap={teamsMap}
                                tsMap={tsMap}
                                taskStats={taskStats}
                                projektId={projektId}
                                router={router}
                                isDialogOpen={isTaskDialogOpen}
                                setIsDialogOpen={setIsTaskDialogOpen}
                                onRefresh={loadData}
                                filterTeamId={filterTeamId}
                                setFilterTeamId={setFilterTeamId}
                                filterStatus={filterStatus}
                                setFilterStatus={setFilterStatus}
                                teams={teams}
                            />
                        </TabsContent>

                        {/* ═══════════ ANALYSE ═══════════ */}
                        <TabsContent active={activeWorkspace === 'analyse'} className="mt-0">
                            <AnalyseWorkspace
                                teilsysteme={teilsysteme}
                                tasks={tasks}
                                teams={teams}
                                metrics={analyseMetrics}
                                projektId={projektId}
                            />
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   TEILSYSTEME WORKSPACE
   ═══════════════════════════════════════════════════════════════════ */
function TeilsystemeWorkspace({
    filteredTS, baumeisterTS, produktionTS,
    tsSubTab, setTsSubTab,
    loading, projektId, project, router,
}: {
    filteredTS: Teilsystem[]; baumeisterTS: Teilsystem[]; produktionTS: Teilsystem[];
    tsSubTab: string; setTsSubTab: (v: string) => void;
    loading: boolean; projektId: string; project: Projekt | null;
    router: ReturnType<typeof useRouter>;
}) {
    return (
        <div className="space-y-4">
            {/* Segmented tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="bg-white shadow-sm border border-slate-100 p-1.5 h-auto rounded-2xl inline-flex">
                    <button
                        onClick={() => setTsSubTab('alle')}
                        className={cn(
                            'px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm font-semibold',
                            tsSubTab === 'alle'
                                ? 'bg-orange-600 text-white shadow-md shadow-orange-200'
                                : 'text-slate-500 hover:bg-slate-50'
                        )}
                    >
                        <Layers className="w-4 h-4" />
                        Alle
                        <Badge className={cn(
                            'ml-1 h-5 px-1.5 font-black text-[10px] border-none',
                            tsSubTab === 'alle'
                                ? 'bg-white/40 text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        )}>
                            {filteredTS.length}
                        </Badge>
                    </button>
                    <button
                        onClick={() => setTsSubTab('baumeister')}
                        className={cn(
                            'px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm font-semibold',
                            tsSubTab === 'baumeister'
                                ? 'bg-orange-600 text-white shadow-md shadow-orange-200'
                                : 'text-slate-500 hover:bg-slate-50'
                        )}
                    >
                        <Hammer className="w-4 h-4" />
                        Baumeister
                        <Badge className={cn(
                            'ml-1 h-5 px-1.5 font-black text-[10px] border-none',
                            tsSubTab === 'baumeister'
                                ? 'bg-white/40 text-white'
                                : 'bg-orange-100 text-orange-600'
                        )}>
                            {baumeisterTS.length}
                        </Badge>
                    </button>
                    <button
                        onClick={() => setTsSubTab('produktion')}
                        className={cn(
                            'px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm font-semibold',
                            tsSubTab === 'produktion'
                                ? 'bg-orange-600 text-white shadow-md shadow-orange-200'
                                : 'text-slate-500 hover:bg-slate-50'
                        )}
                    >
                        <Factory className="w-4 h-4" />
                        Produktion
                        <Badge className={cn(
                            'ml-1 h-5 px-1.5 font-black text-[10px] border-none',
                            tsSubTab === 'produktion'
                                ? 'bg-white/40 text-white'
                                : 'bg-blue-100 text-blue-600'
                        )}>
                            {produktionTS.length}
                        </Badge>
                    </button>
                </div>
                <Button
                    onClick={() => router.push(`/${projektId}/teilsysteme/erfassen`)}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase shadow-md shadow-orange-200 rounded-xl h-10 px-6"
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Neu TS erfassen
                </Button>
            </div>

            {/* Table */}
            <Card className="shadow-xl border-2 border-border overflow-hidden rounded-[2rem]">
                <CardContent className="p-0">
                    {(() => {
                        const displayItems = tsSubTab === 'baumeister' ? baumeisterTS
                            : tsSubTab === 'produktion' ? produktionTS
                            : filteredTS;

                        if (loading) {
                            return (
                                <div className="py-24 flex flex-col items-center justify-center space-y-4">
                                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                                    <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Laden...</p>
                                </div>
                            );
                        }
                        if (displayItems.length > 0) {
                            return (
                                <TeilsystemTable
                                    items={displayItems}
                                    projektId={projektId}
                                    projekt={project}
                                />
                            );
                        }
                        return (
                            <div className="py-32 text-center flex flex-col items-center">
                                <div className="p-6 bg-muted rounded-full mb-6">
                                    <Layers className="h-16 w-16 text-muted-foreground/20" />
                                </div>
                                <h3 className="text-xl font-black text-foreground tracking-tight">Keine Teilsysteme gefunden</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mt-2 font-medium">
                                    Ändern Sie Ihre Suche o. erfassen Sie ein neues Teilsystem in diesem Bereich.
                                </p>
                            </div>
                        );
                    })()}
                </CardContent>
            </Card>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   TEAMS WORKSPACE
   ═══════════════════════════════════════════════════════════════════ */
function TeamsWorkspace({
    teams, workers, projektId, router,
    isDialogOpen, setIsDialogOpen, onRefresh,
}: {
    teams: Team[]; workers: Record<string, Worker>;
    projektId: string; router: ReturnType<typeof useRouter>;
    isDialogOpen: boolean; setIsDialogOpen: (v: boolean) => void;
    onRefresh: () => Promise<void>;
}) {
    const handleSuccess = () => {
        setIsDialogOpen(false);
        onRefresh();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Users className="h-6 w-6 text-orange-500" />
                        Teamverwaltung
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground mt-1">
                        Übersicht aller Einsatztruppen für dieses Projekt
                    </p>
                </div>
                <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 font-bold text-white shadow-md shadow-orange-500/20 whitespace-nowrap"
                >
                    <Plus className="mr-2 h-4 w-4" /> Team erstellen
                </Button>
            </div>

            {/* Team Create Modal */}
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
                            <TeamForm projektId={projektId} onSuccess={handleSuccess} onCancel={() => setIsDialogOpen(false)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Teams Grid */}
            {teams.length === 0 ? (
                <Card className="border border-dashed border-slate-300 shadow-none bg-slate-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
                        <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center border-2 border-slate-200">
                            <UsersRound className="h-8 w-8 text-slate-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-700">Keine Teams gefunden</h3>
                            <p className="text-slate-500 text-sm mt-1 max-w-sm">Es wurden noch keine Teams in diesem Projekt registriert.</p>
                        </div>
                        <Button variant="outline" className="mt-2 font-bold" onClick={() => setIsDialogOpen(true)}>
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
                                    <p className="text-sm font-medium text-slate-500 mt-2 line-clamp-2">{team.description}</p>
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
                                            const w = workers[wId];
                                            if (!w) return null;
                                            return (
                                                <Badge key={wId} variant="secondary" className="bg-slate-100 text-slate-700 border-0 font-semibold px-2">
                                                    {w.fullName.split(' ')[0]}
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

/* ═══════════════════════════════════════════════════════════════════
   TAREAS WORKSPACE
   ═══════════════════════════════════════════════════════════════════ */
function TareasWorkspace({
    tasks, allTasks, teamsMap, tsMap, taskStats,
    projektId, router, isDialogOpen, setIsDialogOpen, onRefresh,
    filterTeamId, setFilterTeamId, filterStatus, setFilterStatus, teams,
}: {
    tasks: Task[]; allTasks: Task[];
    teamsMap: Record<string, Team>; tsMap: Record<string, Teilsystem>;
    taskStats: Record<string, { total: number; done: number }>;
    projektId: string; router: ReturnType<typeof useRouter>;
    isDialogOpen: boolean; setIsDialogOpen: (v: boolean) => void;
    onRefresh: () => Promise<void>;
    filterTeamId: string; setFilterTeamId: (v: string) => void;
    filterStatus: string; setFilterStatus: (v: string) => void;
    teams: Team[];
}) {
    const handleSuccess = () => {
        setIsDialogOpen(false);
        setFilterTeamId('all');
        setFilterStatus('all');
        onRefresh();
    };

    const teamOptions = useMemo(() => {
        const opts = [{ value: 'all', label: 'Alle Teams' }];
        teams.forEach(t => opts.push({ value: t.id, label: t.name }));
        return opts;
    }, [teams]);

    const statusOptions = [
        { value: 'all', label: 'Alle Status' },
        { value: 'Offen', label: 'Offen' },
        { value: 'In Arbeit', label: 'In Arbeit' },
        { value: 'Blockiert', label: 'Blockiert' },
        { value: 'Erledigt', label: 'Erledigt' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <ClipboardList className="h-6 w-6 text-orange-500" />
                        Aufgabenverwaltung
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground mt-1">
                        Zentrale Steuerung aller Produktionsaufgaben
                    </p>
                </div>
                <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700 font-bold text-white shadow-md shadow-orange-500/20 whitespace-nowrap"
                >
                    <Plus className="mr-2 h-4 w-4" /> Aufgabe erstellen
                </Button>
            </div>

            {/* Task Create Modal */}
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
                            <TaskForm projektId={projektId} onSuccess={handleSuccess} onCancel={() => setIsDialogOpen(false)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500 min-w-max mr-2">
                    <Filter className="h-4 w-4" /> Filter:
                </div>
                <Select value={filterTeamId} onChange={(e) => setFilterTeamId(e.target.value)} options={teamOptions} className="w-full sm:w-[200px]" />
                <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} options={statusOptions} className="w-full sm:w-[150px]" />
            </div>

            {/* Task Cards */}
            {tasks.length === 0 ? (
                <Card className="border border-dashed border-slate-300 shadow-none bg-slate-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
                        <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center border-2 border-slate-200 shadow-sm">
                            <ClipboardList className="h-8 w-8 text-slate-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-700">Keine Aufgaben gefunden</h3>
                            <p className="text-slate-500 text-sm mt-1 max-w-sm">
                                {filterTeamId !== 'all' || filterStatus !== 'all'
                                    ? 'Mit diesen Filtern wurden keine Aufgaben gefunden.'
                                    : 'Es wurden noch keine Aufgaben registriert.'}
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
                        const teamName = task.teamId ? (teamsMap[task.teamId]?.name || 'Unbekanntes Team') : 'Kein Team';
                        const stats = taskStats[task.id] || { total: 0, done: 0 };
                        const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

                        return (
                            <Card
                                key={task.id}
                                onClick={() => router.push(`/${projektId}/ausfuehrung/tasks/${task.id}`)}
                                className="group cursor-pointer border border-slate-200 hover:border-orange-500/50 transition-all hover:shadow-lg hover:-translate-y-1 duration-300 flex flex-col"
                            >
                                <CardHeader className="p-5 pb-3">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-semibold truncate gap-1 text-[10px] uppercase py-0.5 max-w-[120px]">
                                            <Users className="h-3 w-3" />
                                            {teamName}
                                        </Badge>
                                        {task.sourceTsId && tsMap[task.sourceTsId] && (
                                            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-100 font-bold gap-1 text-[10px] py-0.5">
                                                <Layers className="h-3 w-3" />
                                                TS {tsMap[task.sourceTsId].teilsystemNummer}
                                            </Badge>
                                        )}
                                        <div className="ml-auto">
                                            <TaskStatusBadge status={task.status as any} />
                                        </div>
                                    </div>
                                    <CardTitle className="text-lg font-bold text-slate-800 line-clamp-2 group-hover:text-orange-600 transition-colors leading-tight">
                                        {task.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 pt-1 mt-auto">
                                    {task.description && (
                                        <p className="text-sm text-slate-500 line-clamp-2 mb-4">{task.description}</p>
                                    )}
                                    <div className="mt-4 border-t border-slate-100 pt-4 flex items-center justify-between">
                                        <div className="flex flex-col gap-1 w-full max-w-[60%]">
                                            <div className="flex justify-between text-xs font-bold text-slate-500">
                                                <span>Fortschritt</span>
                                                <span className={progress === 100 ? 'text-green-600' : ''}>{progress}%</span>
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
                                    {task.priority && task.priority !== 'Mittel' && (
                                        <div className="mt-3 flex items-center gap-1.5 text-xs font-bold">
                                            <Info className={`h-3.5 w-3.5 ${task.priority === 'Hoch' ? 'text-orange-500' : 'text-slate-400'}`} />
                                            <span className={`uppercase tracking-wider ${task.priority === 'Hoch' ? 'text-orange-600' : 'text-slate-500'}`}>
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

/* ═══════════════════════════════════════════════════════════════════
   ANALYSE WORKSPACE
   ═══════════════════════════════════════════════════════════════════ */
function AnalyseWorkspace({
    teilsysteme, tasks, teams, metrics, projektId,
}: {
    teilsysteme: Teilsystem[]; tasks: Task[]; teams: Team[];
    metrics: {
        statusCounts: Record<string, number>;
        upcomingMontage: Teilsystem[];
        openTasks: number;
        doneTasks: number;
    };
    projektId: string;
}) {
    const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
        offen:        { label: 'Offen',           color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Clock },
        in_produktion:{ label: 'In Produktion',   color: 'bg-blue-50 text-blue-700 border-blue-200',       icon: Factory },
        geliefert:    { label: 'Geliefert',       color: 'bg-amber-50 text-amber-700 border-amber-200',     icon: TrendingUp },
        verbaut:      { label: 'Verbaut',         color: 'bg-green-50 text-green-700 border-green-200',     icon: CheckCircle2 },
        geaendert:    { label: 'Nachbearbeitung', color: 'bg-red-50 text-red-700 border-red-200',           icon: AlertTriangle },
    };

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={Layers} label="Total Teilsysteme" value={teilsysteme.length} color="orange" />
                <KpiCard icon={Users} label="Aktive Teams" value={teams.length} color="blue" />
                <KpiCard icon={ClipboardList} label="Offene Aufgaben" value={metrics.openTasks} color="amber" />
                <KpiCard icon={CheckCircle2} label="Erledigte Aufgaben" value={metrics.doneTasks} color="green" />
            </div>

            {/* Status Distribution + Upcoming Montage */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* TS by Status */}
                <Card className="border border-slate-200/60 shadow-sm">
                    <CardHeader className="p-5 pb-3 border-b border-slate-100">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-orange-500" />
                            Teilsysteme nach Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-3">
                        {Object.entries(metrics.statusCounts).length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">Keine Daten vorhanden</p>
                        ) : (
                            Object.entries(metrics.statusCounts).map(([status, count]) => {
                                const cfg = STATUS_LABELS[status] || { label: status, color: 'bg-slate-50 text-slate-500 border-slate-200', icon: Clock };
                                const pct = teilsysteme.length > 0 ? Math.round((count / teilsysteme.length) * 100) : 0;
                                return (
                                    <div key={status} className="flex items-center gap-3">
                                        <Badge variant="outline" className={cn('min-w-[130px] justify-center text-[10px] font-black uppercase py-1', cfg.color)}>
                                            {cfg.label}
                                        </Badge>
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-sm font-black text-slate-700 w-10 text-right">{count}</span>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming Montagetermin */}
                <Card className="border border-slate-200/60 shadow-sm">
                    <CardHeader className="p-5 pb-3 border-b border-slate-100">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-orange-500" />
                            Nächste Montagetermine
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-2">
                        {metrics.upcomingMontage.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">Keine Termine eingetragen</p>
                        ) : (
                            metrics.upcomingMontage.map(ts => (
                                <div key={ts.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 font-bold text-xs py-0.5">
                                            {ts.teilsystemNummer}
                                        </Badge>
                                        <span className="text-sm font-semibold text-slate-700 truncate max-w-[180px]">{ts.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-orange-600">{ts.montagetermin}</span>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Task Progress */}
            <Card className="border border-slate-200/60 shadow-sm">
                <CardHeader className="p-5 pb-3 border-b border-slate-100">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                        Aufgaben-Fortschritt
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                    <div className="flex items-center gap-6">
                        <div className="flex-1">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-bold text-slate-500">Erledigt</span>
                                <span className="text-xs font-black text-slate-700">
                                    {metrics.doneTasks} / {tasks.length}
                                </span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-500 to-green-500 rounded-full transition-all duration-1000"
                                    style={{ width: tasks.length > 0 ? `${Math.round((metrics.doneTasks / tasks.length) * 100)}%` : '0%' }}
                                />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-orange-600">
                            {tasks.length > 0 ? Math.round((metrics.doneTasks / tasks.length) * 100) : 0}%
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/* ─────────────────────────── KPI CARD ─────────────────────────── */
function KpiCard({ icon: Icon, label, value, color }: {
    icon: React.ElementType; label: string; value: number; color: string;
}) {
    const colorMap: Record<string, string> = {
        orange: 'bg-orange-50 text-orange-600 border-orange-200',
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        amber: 'bg-amber-50 text-amber-600 border-amber-200',
        green: 'bg-green-50 text-green-600 border-green-200',
    };

    return (
        <Card className={cn('border shadow-sm transition-all hover:shadow-md', colorMap[color] || colorMap.orange)}>
            <CardContent className="p-5 flex items-center gap-4">
                <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', `bg-${color}-100`)}>
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
                    <p className="text-3xl font-black">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
