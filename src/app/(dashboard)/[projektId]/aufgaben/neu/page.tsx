'use client';
import { toast } from '@/lib/toast';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckSquare, Save, ArrowLeft, Plus, MessageSquare, Trash2, CalendarClock, Clock, UserCircle } from 'lucide-react';
import { TaskService } from '@/lib/services/taskService';
import { TeamService } from '@/lib/services/teamService';
import { WorkerService } from '@/lib/services/workerService';
import { validateScheduleFields } from '@/lib/services/workforcePlanningService';
import { Team, TaskPriority, TaskStatus, TaskPlanStatus } from '@/types';
import { Worker } from '@/types/ausfuehrung';
import Link from 'next/link';
import { useSmartBack } from '@/lib/navigation/useSmartBack';

export default function TaskCreatePage() {
    const { projektId } = useParams() as { projektId: string };
    const router = useRouter();
    const goBack = useSmartBack(`/${projektId}/ausfuehrung?tab=teams_aufgaben`);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [teamId, setTeamId] = useState<string>('');
    const [priority, setPriority] = useState<TaskPriority>('Mittel');
    const [dueDate, setDueDate] = useState('');
    // Scheduling fields
    const [workerId, setWorkerId] = useState<string>('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [estimatedHours, setEstimatedHours] = useState<string>('');
    const [planStatus, setPlanStatus] = useState<TaskPlanStatus>('Ungeplant');

    const [teams, setTeams] = useState<Team[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [subtasks, setSubtasks] = useState<{ title: string, sortOrder: number }[]>([
        { title: '', sortOrder: 0 }
    ]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [fetchedTeams, fetchedWorkers] = await Promise.all([
                    TeamService.getTeams(projektId),
                    WorkerService.getActiveWorkers(projektId),
                ]);
                setTeams(fetchedTeams);
                setWorkers(fetchedWorkers);
            } catch (err) {
                console.error("Failed to load data", err);
            }
        };
        loadData();
    }, [projektId]);

    const handleAddSubtask = () => {
        setSubtasks([...subtasks, { title: '', sortOrder: subtasks.length }]);
    };

    const handleSubtaskChange = (index: number, val: string) => {
        const newSubtasks = [...subtasks];
        newSubtasks[index].title = val;
        setSubtasks(newSubtasks);
    };

    const handleRemoveSubtask = (index: number) => {
        const newSubtasks = subtasks.filter((_, i) => i !== index);
        setSubtasks(newSubtasks);
    };

    const handleSave = async () => {
        if (!title.trim()) return toast.error('Bitte Aufgabentitel eingeben');

        // Validate scheduling fields before save
        const scheduleErrors = validateScheduleFields({
            scheduledDate: scheduledDate || undefined,
            startTime: startTime || undefined,
            endTime: endTime || undefined,
            estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        });
        if (scheduleErrors.length > 0) {
            scheduleErrors.forEach(e => toast.error(e.message));
            return;
        }

        setLoading(true);
        try {
            const newTask = await TaskService.createTask({
                projektId,
                title: title.trim(),
                description: description.trim(),
                teamId: teamId || null,
                workerId: workerId || null,
                status: 'Offen' as TaskStatus,
                priority,
                dueDate: dueDate || null,
                scheduledDate: scheduledDate || null,
                startTime: startTime || null,
                endTime: endTime || null,
                estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
                planStatus: scheduledDate ? planStatus : 'Ungeplant',
                sourceType: 'manual'
            });

            // Create valid subtasks
            const validSubtasks = subtasks.filter(s => s.title.trim());
            for (const st of validSubtasks) {
                await TaskService.createSubtask({
                    taskId: newTask.id,
                    title: st.title.trim(),
                    status: 'Offen',
                    sortOrder: st.sortOrder
                });
            }

            toast.success("Aufgabe erstellt");
            router.push(`/${projektId}/ausfuehrung?tab=teams_aufgaben`);
        } catch (error) {
            console.error(error);
            toast.error('Fehler beim Erstellen der Aufgabe');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] space-y-6 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-2xl font-black text-primary tracking-tight flex items-center gap-2">
                        <CheckSquare className="h-6 w-6 text-orange-500" /> Neue Aufgabe erstellen
                    </h2>
                    <p className="text-slate-500 font-medium text-xs">Aufgabe definieren, Team zuweisen und Subtasks planen.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
                <Card className="shadow-sm border-2 border-primary/20 bg-orange-50/10 overflow-hidden flex flex-col">
                    <CardHeader className="py-2.5 px-4 bg-primary/5 border-b border-primary/10">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">Stammdaten</h3>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 block">Titel der Aufgabe</label>
                            <Input
                                placeholder="z.B. Fundament gießen..."
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="font-bold border-input bg-background text-lg h-12"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 block">Team Zuordnung</label>
                                <select
                                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-all"
                                    value={teamId}
                                    onChange={e => setTeamId(e.target.value)}
                                >
                                    <option value="">-- Nicht zugewiesen --</option>
                                    {teams.map(team => (
                                        <option key={team.id} value={team.id}>{team.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 block">Priorität</label>
                                <select
                                    className="w-full bg-background border border-input rounded-xl px-3 py-2 leading-none font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-all uppercase tracking-widest text-xs"
                                    value={priority}
                                    onChange={e => setPriority(e.target.value as TaskPriority)}
                                >
                                    <option value="Niedrig" className="text-emerald-600 font-bold">Niedrig</option>
                                    <option value="Mittel" className="text-amber-500 font-bold">Mittel</option>
                                    <option value="Hoch" className="text-red-500 font-bold">Hoch</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 block">Faelligkeitsdatum (optional)</label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="border-input bg-background text-sm w-full md:w-1/2"
                            />
                        </div>

                        {/* Scheduling section */}
                        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-1.5">
                                <CalendarClock className="h-3.5 w-3.5" />
                                Arbeitsplanung
                            </h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 block">
                                        <UserCircle className="h-3 w-3 inline mr-1" />
                                        Zugewiesener Mitarbeiter
                                    </label>
                                    <select
                                        className="w-full bg-white border border-input rounded-xl px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-all"
                                        value={workerId}
                                        onChange={e => setWorkerId(e.target.value)}
                                    >
                                        <option value="">-- Nicht zugewiesen --</option>
                                        {workers.map(w => (
                                            <option key={w.id} value={w.id}>{w.fullName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 block">Geplantes Datum</label>
                                    <Input
                                        type="date"
                                        value={scheduledDate}
                                        onChange={e => setScheduledDate(e.target.value)}
                                        className="border-input bg-white text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 block">
                                        <Clock className="h-3 w-3 inline mr-1" />
                                        Startzeit
                                    </label>
                                    <Input
                                        type="time"
                                        value={startTime}
                                        onChange={e => setStartTime(e.target.value)}
                                        className="border-input bg-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 block">Endzeit</label>
                                    <Input
                                        type="time"
                                        value={endTime}
                                        onChange={e => setEndTime(e.target.value)}
                                        className="border-input bg-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 block">Geschaetzte Stunden</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="24"
                                        step="0.5"
                                        value={estimatedHours}
                                        onChange={e => setEstimatedHours(e.target.value)}
                                        className="border-input bg-white text-sm"
                                        placeholder="z.B. 4"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 block">Planstatus</label>
                                <select
                                    className="w-full bg-white border border-input rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-all"
                                    value={planStatus}
                                    onChange={e => setPlanStatus(e.target.value as TaskPlanStatus)}
                                >
                                    <option value="Ungeplant">Ungeplant</option>
                                    <option value="Geplant">Geplant</option>
                                    <option value="In Ausfuehrung">In Ausfuehrung</option>
                                    <option value="Abgeschlossen">Abgeschlossen</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Details u. Kommentare</label>
                            <textarea
                                className="w-full text-sm p-3 rounded-xl border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-all resize-none min-h-[120px]"
                                placeholder="Detaillierte Beschreibungen..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-2 border-border overflow-hidden flex flex-col bg-white">
                    <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border shrink-0 flex flex-row justify-between items-center">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ablauf / Subtasks</h3>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddSubtask}
                            className="h-8 text-[10px] uppercase font-bold text-orange-600 border-orange-200 bg-white shadow-sm hover:bg-orange-50 hover:text-orange-700"
                        >
                            <Plus className="h-3 w-3 mr-1" /> Schritt
                        </Button>
                    </CardHeader>
                    <CardContent className="p-6 flex-1 overflow-y-auto space-y-4">
                        {subtasks.length === 0 && (
                            <div className="text-center text-slate-400 text-xs italic">
                                Keine Subtasks definiert.
                            </div>
                        )}
                        {subtasks.map((st, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="h-6 w-6 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-black">
                                    {i + 1}
                                </div>
                                <Input
                                    placeholder="Subtask Bezeichnung..."
                                    className="flex-1 text-sm bg-background border-input rounded-xl focus-visible:ring-1"
                                    value={st.title}
                                    onChange={e => handleSubtaskChange(i, e.target.value)}
                                />
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => handleRemoveSubtask(i)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>

                    <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                        <Button
                            className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200 rounded-full px-8 h-11 font-black uppercase text-xs tracking-widest gap-2 flex items-center transition-all hover:scale-105 active:scale-95"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            <Save className="h-4 w-4" />
                            {loading ? 'Speichern...' : 'Aufgabe Erstellen'}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
