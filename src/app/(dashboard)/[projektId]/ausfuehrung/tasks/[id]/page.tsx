'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { TaskService } from '@/lib/services/taskService';
import { TeamService } from '@/lib/services/teamService';
import { SubtaskService } from '@/lib/services/subtaskService';
import { WorkerService } from '@/lib/services/workerService';
import { Task, Team, Subtask, SubtaskStatus, TaskStatus, Worker } from '@/types/ausfuehrung';
import { Teilsystem } from '@/types';
import { SubsystemService } from '@/lib/services/subsystemService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, Trash2, ListChecks, ArrowRightCircle, X, Layers } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TaskForm } from '@/components/ausfuehrung/TaskForm';
import { TaskStatusBadge } from '@/components/ausfuehrung/TaskStatusBadge';
import { SubtaskList } from '@/components/ausfuehrung/SubtaskList';

const toast = Object.assign(
    (msg: string, options?: any) => window.alert(msg),
    {
        success: (msg: string) => window.alert('Erfolg: ' + msg),
        error: (msg: string) => window.alert('Fehler: ' + msg)
    }
);

export default function TaskDetailPage({ params }: { params: Promise<{ projektId: string, id: string }> }) {
    const { projektId, id } = React.use(params);
    const router = useRouter();

    const [task, setTask] = React.useState<Task | null>(null);
    const [team, setTeam] = React.useState<Team | null>(null);
    const [teilsystem, setTeilsystem] = React.useState<Teilsystem | null>(null);
    const [subtasks, setSubtasks] = React.useState<Subtask[]>([]);
    const [workers, setWorkers] = React.useState<Worker[]>([]);

    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [subtaskToDelete, setSubtaskToDelete] = React.useState<string | null>(null);

    const loadData = React.useCallback(async () => {
        try {
            const fetchedTask = await TaskService.getTaskById(id);
            if (!fetchedTask) {
                toast.error('Aufgabe nicht gefunden.');
                router.push(`/${projektId}/ausfuehrung/tasks`);
                return;
            }
            setTask(fetchedTask);

            // Concurrent loading of team and TS
            const [fetchedTeam, fetchedTS] = await Promise.all([
                TeamService.getTeamById(fetchedTask.teamId),
                fetchedTask.teilsystemId ? SubsystemService.getTeilsystemById(fetchedTask.teilsystemId) : Promise.resolve(null)
            ]);

            setTeam(fetchedTeam);
            setTeilsystem(fetchedTS);

            const st = await SubtaskService.getSubtasksByTaskId(id);
            setSubtasks(st);

            if (fetchedTeam) {
                const allWorkers = await WorkerService.getAllWorkers();
                // Only show workers from the team
                setWorkers(allWorkers.filter(w => fetchedTeam.members.includes(w.id)));
            }
        } catch (error) {
            console.error("Fehler beim Laden von Aufgabendetails.", error);
        }
    }, [id, projektId, router]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDelete = async () => {
        try {
            await TaskService.deleteTask(id);
            toast.success('Aufgabe und alle assoziierten Daten gelöscht.');
            router.push(`/${projektId}/ausfuehrung/tasks`);
        } catch (e) {
            toast.error('Konnte Aufgabe nicht löschen.');
        }
    };

    const handleTaskStatusWorkflow = async () => {
        if (!task) return;
        const nextStatus: Partial<Record<TaskStatus, TaskStatus>> = {
            'Offen': 'In Arbeit',
            'offen': 'In Arbeit', // legacy fallback
            'In Arbeit': 'Erledigt',
            'in_arbeit': 'Erledigt', // legacy fallback
            'Blockiert': 'Offen',
            'blockiert': 'Offen', // legacy fallback
            'Erledigt': 'Offen',
            'fertig': 'Offen', // legacy fallback
        };
        const resolved = nextStatus[task.status] ?? 'Offen';
        const updated = await TaskService.updateTaskStatus(task.id, resolved);
        setTask(updated);
        toast.success(`Task-Status geaendert: ${resolved}`);
    };

    const handleSubtaskStatus = async (stId: string, currentStatus: SubtaskStatus) => {
        const nextStatus = currentStatus === 'fertig' ? 'offen' : 'fertig';
        await SubtaskService.updateSubtaskStatus(stId, nextStatus);

        // Auto-update task? Simple logic: if all subtasks are finished, suggest Task finished (or do it automatically)
        const updatedSts = subtasks.map(s => s.id === stId ? { ...s, status: nextStatus as SubtaskStatus } : s);
        setSubtasks(updatedSts);

        if (nextStatus === 'fertig' && task?.status !== 'fertig' && updatedSts.every(s => s.status === 'fertig')) {
            toast('Alle Unteraufgaben fertig! Möchten Sie die Hauptaufgabe abschliessen?', {
                id: 'all-st-done',
                icon: '🚀',
                duration: 5000,
            });
            // We could call handleTaskStatusWorkflow() automatically, or leave it to user
        }
    };

    const handleReorder = async (activeId: string, direction: 'up' | 'down') => {
        const index = subtasks.findIndex(s => s.id === activeId);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === subtasks.length - 1) return;

        const newSts = [...subtasks];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap items visually
        const temp = newSts[index];
        newSts[index] = newSts[swapIndex];
        newSts[swapIndex] = temp;
        setSubtasks(newSts);

        // Push reorder to DB
        await SubtaskService.reorderSubtasks(id, newSts.map(s => s.id));
    };

    const handleSubtaskDeleteClick = (stId: string) => {
        setSubtaskToDelete(stId);
    };

    const handleConfirmSubtaskDelete = async () => {
        if (!subtaskToDelete) return;
        try {
            await SubtaskService.deleteSubtask(subtaskToDelete);
            setSubtasks(prev => prev.filter(s => s.id !== subtaskToDelete));
            toast.success('Unteraufgabe gelöscht');
        } catch (error) {
            toast.error('Konnte Unteraufgabe it löschen');
        } finally {
            setSubtaskToDelete(null);
        }
    };

    const handleAssignWorker = async (subtaskId: string, workerId: string | undefined) => {
        await SubtaskService.updateSubtask(subtaskId, { assignedWorkerId: workerId });
        setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, assignedWorkerId: workerId } : s));
    };

    if (!task) return <div className="p-8 text-center text-slate-500 font-medium">Lade Daten...</div>;

    const progress = subtasks.length > 0
        ? Math.round((subtasks.filter(s => s.status === 'fertig').length / subtasks.length) * 100)
        : 0;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header / Nav */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <Button
                    variant="metha-orange"
                    className="font-bold pl-3 h-8 gap-2 rounded-lg"
                    onClick={() => router.push(`/${projektId}/ausfuehrung/tasks`)}
                >
                    <ArrowLeft className="h-4 w-4" /> Zurück zur Liste
                </Button>

                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="font-bold border border-slate-200"
                        onClick={handleTaskStatusWorkflow}
                    >
                        <ArrowRightCircle className="mr-2 h-4 w-4" /> Next Status
                    </Button>
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
                        <Trash2 className="mr-2 h-4 w-4" /> Aufgabe löschen
                    </Button>
                </div>
            </div>

            {/* Content Top row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="col-span-1 md:col-span-2 shadow-sm border-slate-200 relative overflow-hidden bg-white">
                    <div className="absolute top-0 left-0 w-2 h-full bg-orange-500" />
                    <CardHeader className="pl-8 p-6">
                        <div className="flex justify-between items-start mb-4">
                            <TaskStatusBadge status={task.status} size="lg" />
                            {task.priority !== 'mittel' && (
                                <span className="text-xs uppercase font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                    Priorität {task.priority}
                                </span>
                            )}
                        </div>
                        <CardTitle className="text-3xl font-black text-slate-800 leading-tight">
                            {task.title}
                        </CardTitle>
                        {task.description && (
                            <p className="text-base text-slate-600 font-medium mt-4 whitespace-pre-wrap">
                                {task.description}
                            </p>
                        )}
                    </CardHeader>

                </Card>

                <Card className="col-span-1 shadow-sm border-slate-200 bg-white">
                    <CardHeader className="bg-slate-50/50 p-5 border-b border-slate-100">
                        <CardTitle className="text-sm uppercase font-bold text-slate-400 tracking-wider">
                            Team & Kontext
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4 text-sm font-medium">
                        <div>
                            <span className="block text-xs uppercase text-slate-400 font-bold mb-1">Ausführendes Team</span>
                            {team ? (
                                <Button
                                    variant="ghost"
                                    className="p-0 h-auto font-bold text-orange-600 hover:text-orange-700 justify-start"
                                    onClick={() => router.push(`/${projektId}/ausfuehrung/teams/${team.id}`)}
                                >
                                    {team.name}
                                </Button>
                            ) : (
                                <span className="text-muted-foreground italic">Kein Team zugewiesen</span>
                            )}
                        </div>
                        {teilsystem && (
                            <div className="pt-3 border-t border-slate-100">
                                <span className="block text-xs uppercase text-slate-400 font-bold mb-1">Teilsystem Nummer</span>
                                <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-orange-500" />
                                    <span className="font-bold text-slate-700">TS {teilsystem.teilsystemNummer}</span>
                                </div>
                            </div>
                        )}
                        <div className="pt-3 border-t border-slate-100">
                            <span className="block text-xs uppercase text-slate-400 font-bold mb-1">Fortschritt ({progress}%)</span>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-orange-500'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Subtasks Block */}
            <Card className="shadow-sm border-slate-200 border-t-4 border-t-orange-500">
                <CardHeader className="flex flex-row items-center justify-between p-6 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm">
                            <ListChecks className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black text-slate-800">Ablauf & Unteraufgaben</CardTitle>
                            <p className="font-medium text-slate-500 text-sm mt-1">
                                Checkliste für das Team {team?.name}.
                            </p>
                        </div>
                    </div>
                    {/* Add quick subtask could go here */}
                </CardHeader>
                <CardContent className="p-6 bg-white min-h-[300px]">
                    <SubtaskList
                        subtasks={subtasks}
                        workers={workers}
                        onToggleStatus={handleSubtaskStatus}
                        onReorder={handleReorder}
                        onDelete={handleSubtaskDeleteClick}
                        onAssignWorker={handleAssignWorker}
                        readOnly={task.status === 'fertig'}
                    />
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            {isEditDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden relative animate-in fade-in zoom-in duration-200">
                        <div className="bg-orange-50/50 p-6 border-b border-orange-100 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-800">Aufgabe bearbeiten</h2>
                            <button onClick={() => setIsEditDialogOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-orange-100/50 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <TaskForm
                                projektId={projektId}
                                taskToEdit={task}
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
                description={`Sind Sie sicher, dass Sie diese komplette Aufgabe unwiderruflich löschen möchten?`}
                variant="danger"
                cancelLabel="Abbrechen"
                confirmLabel="Aufgabe löschen"
            />

            {/* Subtask Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!subtaskToDelete}
                onClose={() => setSubtaskToDelete(null)}
                onConfirm={handleConfirmSubtaskDelete}
                title="Unteraufgabe löschen?"
                description="Möchten Sie diese Unteraufgabe wirklich löschen?"
                variant="danger"
                cancelLabel="Abbrechen"
                confirmLabel="Löschen"
            />
        </div>
    );
}
