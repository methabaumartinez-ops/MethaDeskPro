'use client';
import { toast } from '@/lib/toast';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import {
    CalendarClock, Users, UserCircle, ChevronLeft, ChevronRight,
    Clock, CheckCircle2, AlertTriangle, Layers,
    CalendarDays, CalendarRange, Calendar as CalendarIcon
} from 'lucide-react';
import { TaskService } from '@/lib/services/taskService';
import { TeamService } from '@/lib/services/teamService';
import { WorkerService } from '@/lib/services/workerService';
import { WorkforcePlanningService, type DailySchedule, type WorkloadSummary } from '@/lib/services/workforcePlanningService';
import { Task, Team } from '@/types';
import { Worker } from '@/types/ausfuehrung';
import { cn } from '@/lib/utils';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import Link from 'next/link';

type ViewMode = 'tag' | 'woche' | 'monat';
type PerspectiveMode = 'mitarbeiter' | 'team';

const WEEKDAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTH_NAMES = ['Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function toISODate(d: Date): string {
    return d.toISOString().split('T')[0];
}

function getWeekStart(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

function formatDateDE(d: string): string {
    const date = new Date(d);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getPlanStatusColor(status: string | undefined | null): string {
    switch (status) {
        case 'Geplant': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'In Ausfuehrung': return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'Abgeschlossen': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
}

function getTaskStatusColor(status: string): string {
    switch (status) {
        case 'Offen': return 'border-l-amber-400 bg-amber-50/50';
        case 'In Arbeit': return 'border-l-blue-400 bg-blue-50/50';
        case 'Erledigt': return 'border-l-emerald-400 bg-emerald-50/50';
        case 'Blockiert': return 'border-l-red-400 bg-red-50/50';
        default: return 'border-l-slate-300 bg-slate-50/50';
    }
}

export default function ArbeitsplanPage() {
    const { projektId } = useParams() as { projektId: string };

    // Data state
    const [tasks, setTasks] = useState<Task[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);

    // View state
    const [viewMode, setViewMode] = useState<ViewMode>('woche');
    const [perspective, setPerspective] = useState<PerspectiveMode>('mitarbeiter');
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Load data
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [t, w, te] = await Promise.all([
                    TaskService.getTasks({ projektId }),
                    WorkerService.getActiveWorkers(projektId),
                    TeamService.getTeams(projektId),
                ]);
                setTasks(t);
                setWorkers(w);
                setTeams(te);
                if (w.length > 0) setSelectedWorkerId(w[0].id);
                if (te.length > 0) setSelectedTeamId(te[0].id);
            } catch (err) {
                console.error('Failed to load arbeitsplan data', err);
                toast.error('Fehler beim Laden der Daten');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [projektId]);

    // Navigation
    const navigateDate = (dir: -1 | 1) => {
        setCurrentDate(prev => {
            const d = new Date(prev);
            if (viewMode === 'tag') d.setDate(d.getDate() + dir);
            else if (viewMode === 'woche') d.setDate(d.getDate() + dir * 7);
            else d.setMonth(d.getMonth() + dir);
            return d;
        });
    };

    const goToToday = () => setCurrentDate(new Date());

    // Date range computation
    const dateRange = useMemo(() => {
        if (viewMode === 'tag') {
            const start = toISODate(currentDate);
            return { start, end: start };
        } else if (viewMode === 'woche') {
            const ws = getWeekStart(currentDate);
            const we = new Date(ws);
            we.setDate(we.getDate() + 6);
            return { start: toISODate(ws), end: toISODate(we) };
        } else {
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            return { start: toISODate(start), end: toISODate(end) };
        }
    }, [currentDate, viewMode]);

    // Filter tasks for current view
    const filteredTasks = useMemo(() => {
        if (perspective === 'mitarbeiter' && selectedWorkerId) {
            return WorkforcePlanningService.getWorkerTasks(tasks, selectedWorkerId, dateRange.start, dateRange.end);
        }
        if (perspective === 'team' && selectedTeamId) {
            const teamWorkerIds = workers.filter(w => w.teamId === selectedTeamId).map(w => w.id);
            return WorkforcePlanningService.getTeamTasks(tasks, selectedTeamId, teamWorkerIds, dateRange.start, dateRange.end);
        }
        return [];
    }, [tasks, workers, perspective, selectedWorkerId, selectedTeamId, dateRange]);

    // Daily schedules
    const dailySchedules = useMemo(() => {
        return WorkforcePlanningService.buildDailySchedules(filteredTasks, dateRange.start, dateRange.end);
    }, [filteredTasks, dateRange]);

    // Workload summary
    const summary = useMemo(() => {
        return WorkforcePlanningService.getWorkloadSummary(filteredTasks);
    }, [filteredTasks]);

    // All scheduled tasks (for the summary)
    const allProjectSummary = useMemo(() => {
        return WorkforcePlanningService.getWorkloadSummary(tasks);
    }, [tasks]);

    // Date label
    const dateLabel = useMemo(() => {
        if (viewMode === 'tag') return formatDateDE(dateRange.start);
        if (viewMode === 'woche') return `${formatDateDE(dateRange.start)} – ${formatDateDE(dateRange.end)}`;
        return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }, [currentDate, viewMode, dateRange]);

    const selectedWorker = workers.find(w => w.id === selectedWorkerId);
    const selectedTeam = teams.find(t => t.id === selectedTeamId);

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col animate-in fade-in duration-500 pb-4 overflow-hidden">
            <ModuleActionBanner
                icon={CalendarClock}
                title="Arbeitsplan"
                ctaLabel="Heute"
                ctaOnClick={goToToday}
                ctaIcon={CalendarIcon}
            />

            <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
                {/* Left panel: Filters & Summary */}
                <div className="w-1/4 flex flex-col gap-4 h-full overflow-y-auto pr-1">
                    {/* Perspective toggle */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="py-2.5 px-4 bg-slate-50 border-b">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-600">Ansicht</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 space-y-3">
                            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setPerspective('mitarbeiter')}
                                    className={cn(
                                        "flex-1 py-2 px-3 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                                        perspective === 'mitarbeiter'
                                            ? "bg-white text-orange-600 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <UserCircle className="h-3.5 w-3.5" />
                                    Mitarbeiter
                                </button>
                                <button
                                    onClick={() => setPerspective('team')}
                                    className={cn(
                                        "flex-1 py-2 px-3 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                                        perspective === 'team'
                                            ? "bg-white text-orange-600 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <Users className="h-3.5 w-3.5" />
                                    Team
                                </button>
                            </div>

                            {perspective === 'mitarbeiter' ? (
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Mitarbeiter waehlen</label>
                                    <select
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                                        value={selectedWorkerId}
                                        onChange={e => setSelectedWorkerId(e.target.value)}
                                    >
                                        {workers.length === 0 && <option value="">Keine Mitarbeiter</option>}
                                        {workers.map(w => (
                                            <option key={w.id} value={w.id}>{w.fullName}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Team waehlen</label>
                                    <select
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                                        value={selectedTeamId}
                                        onChange={e => setSelectedTeamId(e.target.value)}
                                    >
                                        {teams.length === 0 && <option value="">Keine Teams</option>}
                                        {teams.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* View mode toggle */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="py-2.5 px-4 bg-slate-50 border-b">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-600">Zeitraum</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                                {([
                                    { key: 'tag', label: 'Tag', icon: CalendarDays },
                                    { key: 'woche', label: 'Woche', icon: CalendarRange },
                                    { key: 'monat', label: 'Monat', icon: CalendarIcon },
                                ] as const).map(v => (
                                    <button
                                        key={v.key}
                                        onClick={() => setViewMode(v.key)}
                                        className={cn(
                                            "flex-1 py-2 px-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1",
                                            viewMode === v.key
                                                ? "bg-white text-orange-600 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        <v.icon className="h-3 w-3" />
                                        {v.label}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary card */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="py-2.5 px-4 bg-slate-50 border-b">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-600">Zusammenfassung</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                                    <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wide">Aufgaben</div>
                                    <div className="text-2xl font-black text-orange-700">{summary.totalTasks}</div>
                                </div>
                                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Stunden</div>
                                    <div className="text-2xl font-black text-blue-700">{summary.totalHours.toFixed(1)}</div>
                                </div>
                                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Geplant</div>
                                    <div className="text-2xl font-black text-emerald-700">{summary.plannedTasks}</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ungeplant</div>
                                    <div className="text-2xl font-black text-slate-600">{summary.unplannedTasks}</div>
                                </div>
                            </div>

                            {/* Project-wide overview */}
                            <div className="pt-2 border-t border-slate-100">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Projekt gesamt</div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 font-medium">{allProjectSummary.totalTasks} Aufgaben</span>
                                    <span className="text-slate-700 font-bold">{allProjectSummary.totalHours.toFixed(1)} Std.</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main calendar area */}
                <Card className="flex-1 border-none shadow-md bg-white h-full flex flex-col min-w-0">
                    {/* Calendar header with navigation */}
                    <CardHeader className="border-b bg-slate-50 py-3 px-6 shrink-0">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigateDate(-1)}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigateDate(1)}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                                <h3 className="text-lg font-black text-slate-800">{dateLabel}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {perspective === 'mitarbeiter' && selectedWorker && (
                                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200 flex items-center gap-1.5">
                                        <UserCircle className="h-3.5 w-3.5" />
                                        {selectedWorker.fullName}
                                    </span>
                                )}
                                {perspective === 'team' && selectedTeam && (
                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5" />
                                        {selectedTeam.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardHeader>

                    {/* Calendar body */}
                    <CardContent className="flex-1 overflow-y-auto p-0">
                        {loading ? (
                            <div className="p-6 space-y-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={`skel-${i}`} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : dailySchedules.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                                <CalendarClock className="h-12 w-12 opacity-30" />
                                <div className="text-center">
                                    <p className="font-bold text-slate-600">Keine geplanten Aufgaben</p>
                                    <p className="text-xs mt-1">Waehle einen Mitarbeiter oder ein Team um den Arbeitsplan zu sehen.</p>
                                </div>
                            </div>
                        ) : viewMode === 'monat' ? (
                            /* Monthly grid view */
                            <div className="p-4">
                                {/* Weekday headers */}
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {WEEKDAY_NAMES.map(d => (
                                        <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 py-1">{d}</div>
                                    ))}
                                </div>
                                {/* Month grid */}
                                <MonthGrid dailySchedules={dailySchedules} currentDate={currentDate} projektId={projektId} />
                            </div>
                        ) : (
                            /* Day / Week list view */
                            <div className="divide-y divide-slate-100">
                                {dailySchedules.map(day => (
                                    <DayRow key={day.date} day={day} projektId={projektId} isCompact={viewMode === 'woche'} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ── Day Row Component ────────────────────────────────────────────

function DayRow({ day, projektId, isCompact }: { day: DailySchedule; projektId: string; isCompact: boolean }) {
    const date = new Date(day.date);
    const isToday = toISODate(new Date()) === day.date;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    return (
        <div className={cn(
            "flex gap-4 p-4 transition-colors",
            isToday && "bg-orange-50/30",
            isWeekend && "bg-slate-50/50"
        )}>
            {/* Date column */}
            <div className={cn(
                "shrink-0 w-20 flex flex-col items-center pt-1",
                isToday && "text-orange-600"
            )}>
                <div className={cn(
                    "text-xs font-black uppercase",
                    isToday ? "text-orange-600" : "text-slate-400"
                )}>
                    {WEEKDAY_NAMES[(date.getDay() + 6) % 7]}
                </div>
                <div className={cn(
                    "text-2xl font-black",
                    isToday ? "text-orange-600" : "text-slate-700"
                )}>
                    {date.getDate()}
                </div>
                <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                    {day.totalHours > 0 ? `${day.totalHours.toFixed(1)} Std.` : ''}
                </div>
            </div>

            {/* Tasks column */}
            <div className="flex-1 space-y-2 min-w-0">
                {day.tasks.length === 0 ? (
                    <div className="py-2 text-xs text-slate-400 italic">Keine Aufgaben geplant</div>
                ) : (
                    day.tasks.map(task => (
                        <TaskCard key={task.id} task={task} projektId={projektId} compact={isCompact} />
                    ))
                )}
            </div>
        </div>
    );
}

// ── Task Card Component ──────────────────────────────────────────

function TaskCard({ task, projektId, compact }: { task: Task; projektId: string; compact?: boolean }) {
    return (
        <div className={cn(
            "border-l-4 rounded-lg px-3 py-2 bg-white shadow-sm border border-slate-100 hover:shadow-md transition-shadow",
            getTaskStatusColor(task.status)
        )}>
            <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                    <Link href={`/${projektId}/aufgaben/${task.id}`}>
                        <h4 className="text-sm font-bold text-slate-800 truncate hover:text-orange-600 transition-colors cursor-pointer">
                            {task.title}
                        </h4>
                    </Link>
                    {!compact && task.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {task.estimatedHours != null && task.estimatedHours > 0 && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.estimatedHours}h
                        </span>
                    )}
                    {task.startTime && task.endTime && (
                        <span className="text-[10px] font-medium text-slate-500">
                            {task.startTime}–{task.endTime}
                        </span>
                    )}
                    <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                        getPlanStatusColor(task.planStatus)
                    )}>
                        {task.planStatus || 'Ungeplant'}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ── Month Grid Component ─────────────────────────────────────────

function MonthGrid({ dailySchedules, currentDate, projektId }: { dailySchedules: DailySchedule[]; currentDate: Date; projektId: string }) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // 0 = Monday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const scheduleMap = new Map<string, DailySchedule>();
    for (const ds of dailySchedules) {
        scheduleMap.set(ds.date, ds);
    }

    const today = toISODate(new Date());

    // Build month cells
    const cells: (DailySchedule | null)[] = [];
    // Padding before month starts
    for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
    // Days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push(scheduleMap.get(dateStr) || { date: dateStr, tasks: [], totalHours: 0 });
    }

    return (
        <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
                if (!cell) return <div key={`empty-${idx}`} className="min-h-[80px]" />;
                const isToday = cell.date === today;
                const dayNum = new Date(cell.date).getDate();

                return (
                    <div
                        key={cell.date}
                        className={cn(
                            "min-h-[80px] rounded-lg border p-1.5 transition-all hover:border-orange-300",
                            isToday ? "border-orange-400 bg-orange-50/50" : "border-slate-100 bg-white",
                            cell.tasks.length > 0 ? "shadow-sm" : ""
                        )}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className={cn(
                                "text-xs font-black",
                                isToday ? "text-orange-600" : "text-slate-600"
                            )}>
                                {dayNum}
                            </span>
                            {cell.totalHours > 0 && (
                                <span className="text-[9px] font-bold text-blue-500">
                                    {cell.totalHours.toFixed(1)}h
                                </span>
                            )}
                        </div>
                        <div className="space-y-0.5">
                            {cell.tasks.slice(0, 3).map(task => (
                                <div
                                    key={task.id}
                                    className={cn(
                                        "text-[9px] font-medium px-1.5 py-0.5 rounded truncate border-l-2",
                                        getTaskStatusColor(task.status)
                                    )}
                                    title={task.title}
                                >
                                    {task.title}
                                </div>
                            ))}
                            {cell.tasks.length > 3 && (
                                <div className="text-[9px] text-slate-400 font-bold text-center">
                                    +{cell.tasks.length - 3} mehr
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
