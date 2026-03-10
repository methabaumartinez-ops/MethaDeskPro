'use client';
import { toast } from '@/lib/toast';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, ArrowLeft, Save, Briefcase, Clock, Calendar, AlertCircle, CalendarClock, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskService } from '@/lib/services/taskService';
import { TeamService } from '@/lib/services/teamService';
import { WorkerService } from '@/lib/services/workerService';
import { validateScheduleFields } from '@/lib/services/workforcePlanningService';
import { Task, Subtask, Team, TeamMember, Mitarbeiter, TaskPlanStatus } from '@/types';
import { Worker } from '@/types/ausfuehrung';
import Link from 'next/link';
import { useSmartBack } from '@/lib/navigation/useSmartBack';

export default function TaskDetailPage() {
    const { projektId, id } = useParams() as { projektId: string, id: string };
    const router = useRouter();
    const goBack = useSmartBack(`/${projektId}/ausfuehrung?tab=teams_aufgaben`);

    const [task, setTask] = useState<Task | null>(null);
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [team, setTeam] = useState<Team | null>(null);
    const [teamMembers, setTeamMembers] = useState<{ member: TeamMember, detail: Mitarbeiter }[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);

    // Scheduling edit state
    const [schedWorkerId, setSchedWorkerId] = useState<string>('');
    const [schedDate, setSchedDate] = useState<string>('');
    const [schedStartTime, setSchedStartTime] = useState<string>('');
    const [schedEndTime, setSchedEndTime] = useState<string>('');
    const [schedEstHours, setSchedEstHours] = useState<string>('');
    const [schedPlanStatus, setSchedPlanStatus] = useState<TaskPlanStatus>('Ungeplant');
    const [schedSaving, setSchedSaving] = useState(false);

    // Abrechnung States
    const [showAbrechnung, setShowAbrechnung] = useState(false);
    const [loggedHours, setLoggedHours] = useState<Record<string, number>>({});
    const [abrechnungsDatum, setAbrechnungsDatum] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const loadTaskData = async () => {
            try {
                const fetchedTasks = await TaskService.getTasks({ projektId });
                const currentTask = fetchedTasks.find(t => t.id === id);
                if (!currentTask) {
                    toast.error('Aufgabe nicht gefunden');
                    return router.push(`/${projektId}/ausfuehrung?tab=teams_aufgaben`);
                }
                setTask(currentTask);

                // Initialize scheduling state from task data
                setSchedWorkerId(currentTask.workerId || '');
                setSchedDate(currentTask.scheduledDate || '');
                setSchedStartTime(currentTask.startTime || '');
                setSchedEndTime(currentTask.endTime || '');
                setSchedEstHours(currentTask.estimatedHours != null ? String(currentTask.estimatedHours) : '');
                setSchedPlanStatus((currentTask.planStatus as TaskPlanStatus) || 'Ungeplant');

                const fetchedSubtasks = await TaskService.getSubtasks(id);
                setSubtasks(fetchedSubtasks);

                // Load workers for assignment dropdown
                const fetchedWorkers = await WorkerService.getActiveWorkers(projektId);
                setWorkers(fetchedWorkers);

                if (currentTask.teamId) {
                    const fetchedTeams = await TeamService.getTeams(projektId);
                    const currentTeam = fetchedTeams.find(t => t.id === currentTask.teamId) || null;
                    setTeam(currentTeam);

                    if (currentTeam) {
                        const members = await TeamService.getTeamMembers(currentTeam.id);

                        // Fetch Mitarbeiter Details
                        const res = await fetch(`/api/data/mitarbeiter`);
                        const allMitarbeiter: Mitarbeiter[] = res.ok ? await res.json() : [];

                        const populatedMembers = members.map(m => {
                            return {
                                member: m,
                                detail: allMitarbeiter.find(ma => ma.id === m.mitarbeiterId) || { id: m.mitarbeiterId, vorname: 'Unbekannt', nachname: '', email: '', rolle: '' }
                            };
                        });
                        setTeamMembers(populatedMembers);

                        // Initialize loggedHours
                        const initialHours: Record<string, number> = {};
                        populatedMembers.forEach(m => {
                            initialHours[m.detail.id] = 8; // Default 8h for fast logging
                        });
                        setLoggedHours(initialHours);
                    }
                }
            } catch (err) {
                console.error("Failed to load task details", err);
            } finally {
                setLoading(false);
            }
        };
        loadTaskData();
    }, [projektId, id, router]);

    const handleSaveScheduling = async () => {
        if (!task) return;

        const errors = validateScheduleFields({
            scheduledDate: schedDate || undefined,
            startTime: schedStartTime || undefined,
            endTime: schedEndTime || undefined,
            estimatedHours: schedEstHours ? parseFloat(schedEstHours) : undefined,
        });
        if (errors.length > 0) {
            errors.forEach(e => toast.error(e.message));
            return;
        }

        setSchedSaving(true);
        try {
            const updates: Partial<Task> = {
                projektId,
                workerId: schedWorkerId || null,
                scheduledDate: schedDate || null,
                startTime: schedStartTime || null,
                endTime: schedEndTime || null,
                estimatedHours: schedEstHours ? parseFloat(schedEstHours) : null,
                planStatus: schedDate ? schedPlanStatus : 'Ungeplant',
            };
            await TaskService.updateTask(task.id, updates);
            setTask({ ...task, ...updates });
            toast.success('Arbeitsplanung gespeichert');
        } catch (err) {
            console.error(err);
            toast.error('Fehler beim Speichern der Planung');
        } finally {
            setSchedSaving(false);
        }
    };

    const handleSubtaskToggle = async (subtask: Subtask) => {
        const newStatus = subtask.status === 'Erledigt' ? 'Offen' : 'Erledigt';
        try {
            await TaskService.updateSubtask(subtask.id, { status: newStatus });
            setSubtasks(prev => prev.map(s => s.id === subtask.id ? { ...s, status: newStatus } : s));
        } catch (error) {
            console.error(error);
        }
    };

    const handleTaskStatusChange = async (newStatus: "Offen" | "In Arbeit" | "Blockiert" | "Erledigt" | "Abgerechnet") => {
        if (!task) return;
        try {
            await TaskService.updateTask(task.id, { projektId, status: newStatus });
            setTask({ ...task, status: newStatus });

            if (newStatus === 'Erledigt' && !task.costLogged && team) {
                setShowAbrechnung(true);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveAbrechnung = async () => {
        if (!task || !team) return;
        setLoading(true);
        try {
            // Write to TsStunden
            const requests = teamMembers.map(tm => {
                const stunden = loggedHours[tm.detail.id] || 0;
                if (stunden <= 0) return null;

                const stundenRecord = {
                    id: crypto.randomUUID(),
                    teilsystemId: task.sourceTsId || 'MANUAL-TASK',
                    projektId,
                    mitarbeiterId: tm.detail.id,
                    mitarbeiterName: `${tm.detail.vorname} ${tm.detail.nachname}`,
                    datum: abrechnungsDatum,
                    stunden,
                    abteilung: team.abteilung || tm.detail.abteilung || 'Bau',
                    taetigkeit: `Aufgabe: ${task.title}`
                };

                return fetch('/api/data/ts_stunden', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(stundenRecord)
                });
            }).filter(Boolean);

            await Promise.all(requests as Promise<Response>[]);

            // Mark task as costLogged and Abgerechnet
            await TaskService.updateTask(task.id, { projektId, costLogged: true, status: 'Abgerechnet' });
            setTask({ ...task, costLogged: true, status: 'Abgerechnet' });
            setShowAbrechnung(false);

            toast.success('Stunden erfolgreich erfasst.');

        } catch (err) {
            console.error(err);
            toast.error('Fehler bei der Kostenerfassung');
        } finally {
            setLoading(false);
        }
    };


    if (loading || !task) return <div className="p-8 text-center text-slate-500">Lade Aufgabe...</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] space-y-6 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <Badge variant={
                            task.status === 'Offen' ? 'warning' :
                                task.status === 'In Arbeit' ? 'info' :
                                    task.status === 'Erledigt' ? 'success' :
                                        task.status === 'Abgerechnet' ? 'default' : 'error'
                        } className="text-[10px] uppercase font-bold">{task.status}</Badge>
                        <Badge variant="outline" className={cn("text-[10px] uppercase font-bold",
                            task.priority === 'Hoch' ? "border-red-200 text-red-600" :
                                task.priority === 'Mittel' ? "border-amber-200 text-amber-600" : "border-emerald-200 text-emerald-600"
                        )}>{task.priority}</Badge>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none break-all">
                        {task.title}
                    </h2>
                </div>
                <div className="shrink-0">
                    <select
                        className={cn(
                            "bg-white border rounded-lg px-3 py-2 text-sm font-black uppercase tracking-tight focus:ring-2 focus:ring-orange-500 cursor-pointer shadow-sm outline-none transition-all",
                            task.status === 'Offen' ? "border-amber-300 text-amber-700 bg-amber-50" :
                                task.status === 'In Arbeit' ? "border-blue-300 text-blue-700 bg-blue-50" :
                                    task.status === 'Erledigt' ? "border-emerald-300 text-emerald-700 bg-emerald-50" :
                                        task.status === 'Abgerechnet' ? "border-slate-300 text-slate-600 bg-slate-50 opacity-70" :
                                            "border-red-300 text-red-700 bg-red-50"
                        )}
                        value={task.status}
                        onChange={(e) => handleTaskStatusChange(e.target.value as any)}
                        disabled={task.costLogged}
                    >
                        <option value="Offen">Offen</option>
                        <option value="In Arbeit">In Arbeit</option>
                        <option value="Blockiert">Blockiert</option>
                        <option value="Erledigt">Erledigt</option>
                        {task.costLogged && <option value="Abgerechnet">Abgerechnet</option>}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
                <div className="md:col-span-2 flex flex-col gap-6 overflow-y-auto pr-2 pb-8">
                    {/* Subtasks */}
                    <Card className="border-none shadow-sm overflow-hidden border border-slate-200">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
                            <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <CheckSquare className="h-4 w-4 text-orange-500" /> Checkliste
                            </h3>
                        </CardHeader>
                        <CardContent className="p-0">
                            {subtasks.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm italic">
                                    Keine Subtasks vorhanden.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {subtasks.map((st) => (
                                        <div key={st.id}
                                            className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                                            onClick={() => handleSubtaskToggle(st)}
                                        >
                                            <div className={cn(
                                                "h-6 w-6 rounded border-2 flex items-center justify-center transition-all shrink-0",
                                                st.status === 'Erledigt' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white group-hover:border-emerald-400"
                                            )}>
                                                {st.status === 'Erledigt' && <CheckSquare className="h-4 w-4" />}
                                            </div>
                                            <span className={cn("text-sm font-bold flex-1", st.status === 'Erledigt' ? "text-slate-400 line-through" : "text-slate-700")}>
                                                {st.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Abrechnung Card (Shows when Status = Erledigt and not yet logged) */}
                    {showAbrechnung && team && !task.costLogged && (
                        <Card className="border border-orange-200 shadow-md shadow-orange-100/50 bg-orange-50/30">
                            <CardHeader className="bg-white border-b border-orange-100 py-4 px-6 flex flex-row items-center justify-between">
                                <h3 className="font-black text-sm text-orange-800 uppercase tracking-widest flex items-center gap-2">
                                    <Briefcase className="h-4 w-4" /> Aufwand erfassen (Abrechnung)
                                </h3>
                                <AlertCircle className="h-4 w-4 text-orange-400" />
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="mb-6 flex items-center gap-4">
                                    <div className="flex-1">
                                        <p className="text-xs text-orange-800 font-medium mb-2">Die Aufgabe wurde als erledigt markiert. Erfassen Sie jetzt die Stunden für das Team.</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Datum</label>
                                        <Input type="date" className="h-9 text-xs" value={abrechnungsDatum} onChange={e => setAbrechnungsDatum(e.target.value)} />
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6 bg-white p-4 rounded-xl border border-orange-100">
                                    {teamMembers.map(tm => (
                                        <div key={tm.member.id} className="flex items-center justify-between gap-4">
                                            <div className="font-bold text-sm text-slate-800">
                                                {tm.detail.vorname} {tm.detail.nachname}
                                                <span className="text-[10px] uppercase text-slate-400 ml-2 font-medium">({tm.member.role})</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min="0" step="0.5"
                                                    value={loggedHours[tm.detail.id] || ''}
                                                    onChange={e => setLoggedHours({ ...loggedHours, [tm.detail.id]: parseFloat(e.target.value) || 0 })}
                                                    className="w-20 text-right h-8 font-mono text-sm"
                                                />
                                                <span className="text-xs font-bold text-slate-400">h</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-3">
                                    <Button variant="outline" onClick={() => setShowAbrechnung(false)} className="h-9">Später erfassen</Button>
                                    <Button onClick={handleSaveAbrechnung} className="h-9 bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2">
                                        <Save className="h-4 w-4" /> Abrechnen & Abschliessen
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {task.costLogged && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex flex-col items-center justify-center text-emerald-800 space-y-2">
                            <CheckSquare className="h-8 w-8 text-emerald-500" />
                            <h4 className="font-black">Aufgabe Abgeschlossen & Abgerechnet</h4>
                            <p className="text-xs font-medium text-emerald-600 text-center">Die Stunden wurden erfolgreich in die Projektkosten übernommen.</p>
                        </div>
                    )}
                </div>

                <div className="md:col-span-1 space-y-6">
                    {/* Team Info */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
                            <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-orange-500" /> Zuständiges Team
                            </h3>
                        </CardHeader>
                        <CardContent className="p-6">
                            {team ? (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black" style={{ backgroundColor: team.color || '#f97316' }}>
                                            {team.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">{team.name}</h4>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{team.abteilung || 'Allgemein'}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 bg-slate-50 rounded-lg p-3">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">Teammitglieder</div>
                                        {teamMembers.map(tm => (
                                            <div key={tm.member.id} className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-slate-700">{tm.detail.vorname} {tm.detail.nachname}</span>
                                                <span className="text-slate-500">{tm.member.role}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-slate-500 italic">Kein Team zugewiesen.</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Meta Data */}
                    <Card className="border-none shadow-sm pb-2">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
                            <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="h-4 w-4 text-orange-500" /> Details
                            </h3>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {task.dueDate && (
                                    <div className="p-4 flex items-center gap-3">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fällig am</div>
                                            <div className="text-sm font-bold text-slate-800">{new Date(task.dueDate).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                )}
                                {task.description && (
                                    <div className="p-4">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Beschreibung</div>
                                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{task.description}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Scheduling Card */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="bg-blue-50/50 border-b border-blue-100 py-4 px-6">
                            <h3 className="font-black text-sm text-blue-800 uppercase tracking-widest flex items-center gap-2">
                                <CalendarClock className="h-4 w-4 text-blue-500" /> Arbeitsplanung
                            </h3>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1 block">
                                    <UserCircle className="h-3 w-3 inline mr-1" />Zugewiesener Mitarbeiter
                                </label>
                                <select
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={schedWorkerId}
                                    onChange={e => setSchedWorkerId(e.target.value)}
                                >
                                    <option value="">-- Nicht zugewiesen --</option>
                                    {workers.map(w => (
                                        <option key={w.id} value={w.id}>{w.fullName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1 block">Geplantes Datum</label>
                                <Input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} className="h-8 text-xs border-slate-200" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1 block">Start</label>
                                    <Input type="time" value={schedStartTime} onChange={e => setSchedStartTime(e.target.value)} className="h-8 text-xs border-slate-200" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1 block">Ende</label>
                                    <Input type="time" value={schedEndTime} onChange={e => setSchedEndTime(e.target.value)} className="h-8 text-xs border-slate-200" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1 block">Geschaetzte Stunden</label>
                                <Input type="number" min="0" max="24" step="0.5" value={schedEstHours} onChange={e => setSchedEstHours(e.target.value)} className="h-8 text-xs border-slate-200" placeholder="z.B. 4" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1 block">Planstatus</label>
                                <select
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={schedPlanStatus}
                                    onChange={e => setSchedPlanStatus(e.target.value as TaskPlanStatus)}
                                >
                                    <option value="Ungeplant">Ungeplant</option>
                                    <option value="Geplant">Geplant</option>
                                    <option value="In Ausfuehrung">In Ausfuehrung</option>
                                    <option value="Abgeschlossen">Abgeschlossen</option>
                                </select>
                            </div>
                            <Button
                                onClick={handleSaveScheduling}
                                disabled={schedSaving}
                                className="w-full h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                            >
                                <Save className="h-3 w-3" />
                                {schedSaving ? 'Speichern...' : 'Planung speichern'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
