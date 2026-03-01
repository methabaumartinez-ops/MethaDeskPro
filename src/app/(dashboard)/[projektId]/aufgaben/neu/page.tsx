'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckSquare, Save, ArrowLeft, Plus, MessageSquare, Trash2, CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskService } from '@/lib/services/taskService';
import { TeamService } from '@/lib/services/teamService';
import { Team, TaskPriority, TaskStatus, Subtask } from '@/types';
import Link from 'next/link';

export default function TaskCreatePage() {
    const { projektId } = useParams() as { projektId: string };
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [teamId, setTeamId] = useState<string>('');
    const [priority, setPriority] = useState<TaskPriority>('Mittel');
    const [dueDate, setDueDate] = useState('');

    const [teams, setTeams] = useState<Team[]>([]);
    const [subtasks, setSubtasks] = useState<{ title: string, sortOrder: number }[]>([
        { title: '', sortOrder: 0 }
    ]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadTeams = async () => {
            try {
                const fetchedTeams = await TeamService.getTeams(projektId);
                setTeams(fetchedTeams);
            } catch (err) {
                console.error("Failed to load teams", err);
            }
        };
        loadTeams();
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
        if (!title.trim()) return alert('Bitte Aufgabentitel eingeben');

        setLoading(true);
        try {
            const newTask = await TaskService.createTask({
                projektId,
                title: title.trim(),
                description: description.trim(),
                teamId: teamId || null,
                status: 'Offen' as TaskStatus,
                priority,
                dueDate: dueDate || null,
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

            router.push(`/${projektId}/ausfuehrung?tab=teams_aufgaben`);
        } catch (error) {
            console.error(error);
            alert('Fehler beim Erstellen der Aufgabe');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] space-y-6 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors">
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
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 block">Fälligkeitsdatum (optional)</label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="border-input bg-background text-sm w-full md:w-1/2"
                            />
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
