'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { TaskService } from '@/lib/services/taskService';
import { TeamService } from '@/lib/services/teamService';
import { SubtaskService } from '@/lib/services/subtaskService';
import { Team, Task, TaskStatus, Priority } from '@/types/ausfuehrung';
import { Teilsystem } from '@/types';
import { SubsystemService } from '@/lib/services/subsystemService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from "@/components/ui/select";
import { Loader2, Plus, Trash2, GripVertical, Layers } from 'lucide-react';

const toast = {
    success: (msg: string) => window.alert('Erfolg: ' + msg),
    error: (msg: string) => window.alert('Fehler: ' + msg)
};

interface TaskFormProps {
    projektId: string;
    taskToEdit?: Task;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function TaskForm({ projektId, taskToEdit, onSuccess, onCancel }: TaskFormProps) {
    const [teams, setTeams] = React.useState<Team[]>([]);
    const [teilsysteme, setTeilsysteme] = React.useState<Teilsystem[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    // Subtask Drafts during Creation/Editing
    const [subtasksDraft, setSubtasksDraft] = React.useState<{ title: string; id?: string }[]>([]);
    const [newSubtaskTitle, setNewSubtaskTitle] = React.useState('');

    const router = useRouter();
    const isEdit = !!taskToEdit;

    const { register, handleSubmit, control, formState: { errors } } = useForm<{
        title: string;
        description?: string;
        teamId: string;
        teilsystemId: string;
        status: TaskStatus;
        priority: Priority;
    }>({
        defaultValues: {
            title: taskToEdit?.title || '',
            description: taskToEdit?.description || '',
            teamId: taskToEdit?.teamId || '',
            teilsystemId: taskToEdit?.teilsystemId || '',
            status: taskToEdit?.status || 'Offen',
            priority: taskToEdit?.priority || 'Mittel'
        }
    });

    React.useEffect(() => {
        const loadInitial = async () => {
            try {
                const [fetchedTeams, fetchedTS] = await Promise.all([
                    TeamService.getTeams(projektId),
                    SubsystemService.getTeilsysteme(projektId)
                ]);

                // Alphabetical sorting
                setTeams(fetchedTeams.sort((a, b) => a.name.localeCompare(b.name)));
                setTeilsysteme(fetchedTS.sort((a, b) => (a.teilsystemNummer || '').localeCompare(b.teilsystemNummer || '')));

                if (isEdit && taskToEdit) {
                    const existingSt = await SubtaskService.getSubtasksByTaskId(taskToEdit.id);
                    setSubtasksDraft(existingSt.map(st => ({ title: st.title, id: st.id })));
                } else {
                    setSubtasksDraft([
                        { title: 'Vorbereitung' },
                        { title: 'Ausführung' },
                        { title: 'Kontrolle' }
                    ]);
                }
            } catch (err) {
                toast.error('Fehler beim Laden der Formulardaten.');
            }
        };
        loadInitial();
    }, [projektId, isEdit, taskToEdit]);

    const handleAddSubtaskDraft = () => {
        if (!newSubtaskTitle.trim()) return;
        setSubtasksDraft(prev => [...prev, { title: newSubtaskTitle.trim() }]);
        setNewSubtaskTitle('');
    };

    const handleRemoveSubtaskDraft = (index: number) => {
        setSubtasksDraft(prev => prev.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            if (!data.teamId) {
                toast.error('Bitte wählen Sie ein Team aus.');
                setIsLoading(false);
                return;
            }

            let savedTaskId = taskToEdit?.id;

            if (isEdit && savedTaskId) {
                await TaskService.updateTask(savedTaskId, {
                    title: data.title,
                    description: data.description,
                    teamId: data.teamId,
                    teilsystemId: data.teilsystemId || undefined,
                    status: data.status,
                    priority: data.priority
                });
                toast.success('Aufgabe aktualisiert.');
                // Note: Complex Sync for subtasks is often done in details view, 
                // but if we overwrite drafts here, we need diffing. For brevity, 
                // we'll advise user to manage subtasks in task detail.
            } else {
                const newTask = await TaskService.createTask({
                    projektId,
                    title: data.title,
                    description: data.description,
                    teamId: data.teamId,
                    teilsystemId: data.teilsystemId || undefined,
                    status: data.status,
                    priority: data.priority
                });
                savedTaskId = newTask.id;

                // Create draft subtasks
                for (let i = 0; i < subtasksDraft.length; i++) {
                    await SubtaskService.createSubtask({
                        taskId: savedTaskId,
                        title: subtasksDraft[i].title,
                        orderIndex: i,
                        status: 'Offen'
                    });
                }
                toast.success('Neue Aufgabe wurde erfolgreich erstellt.');
            }
            if (onSuccess) onSuccess();
            router.refresh();
        } catch (error) {
            toast.error('Fehler beim Speichern der Aufgabe.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-1 md:col-span-2">
                    <label htmlFor="title" className="text-slate-800 font-bold block text-sm">Aufgabentitel <span className="text-red-500">*</span></label>
                    <Input
                        id="title"
                        placeholder="Kurze und prägnante Beschreibung..."
                        disabled={isLoading}
                        className="focus-visible:ring-orange-500 font-medium text-lg"
                        {...register('title', { required: 'Bitte geben Sie einen Titel ein.' })}
                    />
                    {errors.title && <p className="text-xs text-red-500 font-semibold">{errors.title.message as string}</p>}
                </div>

                <div className="space-y-2">
                    <label className="text-slate-800 font-bold block text-sm italic opacity-70">Verknüpftes Teilsystem (Optional)</label>
                    <Controller
                        name="teilsystemId"
                        control={control}
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                disabled={isLoading}
                                options={[
                                    { label: 'Kein Teilsystem...', value: '' },
                                    ...teilsysteme.map(ts => ({
                                        label: `${ts.teilsystemNummer || ''} - ${ts.name}`.trim(),
                                        value: ts.id
                                    }))
                                ]}
                            />
                        )}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-slate-800 font-bold block text-sm">Zugewiesenes Team <span className="text-red-500">*</span></label>
                    <Controller
                        name="teamId"
                        control={control}
                        rules={{ required: 'Team ist erforderlich' }}
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                disabled={isLoading}
                                options={[
                                    { label: 'Team auswählen...', value: '' },
                                    ...teams.map(t => ({ label: t.name, value: t.id }))
                                ]}
                            />
                        )}
                    />
                    {errors.teamId && <p className="text-xs text-red-500 font-semibold">{errors.teamId.message as string}</p>}
                </div>

                <div className="space-y-2">
                    <label className="text-slate-800 font-bold block text-sm">Priorität</label>
                    <Controller
                        name="priority"
                        control={control}
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                disabled={isLoading}
                                options={[
                                    { label: 'Waehlen...', value: '' },
                                    { label: 'Niedrig', value: 'Niedrig' },
                                    { label: 'Mittel', value: 'Mittel' },
                                    { label: 'Hoch', value: 'Hoch' },
                                    { label: 'Kritisch', value: 'Kritisch' }
                                ]}
                            />
                        )}
                    />
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                    <label htmlFor="description" className="text-slate-800 font-bold block text-sm">Beschreibung</label>
                    <textarea
                        id="description"
                        rows={3}
                        placeholder="Details zur Aufgabe..."
                        disabled={isLoading}
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-medium text-slate-700"
                        {...register('description')}
                    />
                </div>
            </div>

            {!isEdit && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                    <label className="text-slate-800 font-bold block text-sm">Standard-Unteraufgaben (Checkliste)</label>
                    <div className="space-y-2">
                        {subtasksDraft.map((st, i) => (
                            <div key={i} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <GripVertical className="h-4 w-4 text-slate-400" />
                                <span className="flex-1 text-sm font-medium text-slate-700">{st.title}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-slate-400 hover:text-red-500"
                                    onClick={() => handleRemoveSubtaskDraft(i)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 items-center mt-2">
                        <Input
                            placeholder="Neue Unteraufgabe..."
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtaskDraft(); } }}
                            className="h-9 focus-visible:ring-orange-500"
                        />
                        <Button type="button" size="sm" variant="secondary" onClick={handleAddSubtaskDraft} className="font-bold shrink-0">
                            <Plus className="h-4 w-4 mr-1" /> Hinzufügen
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        className="font-bold border-slate-200"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Abbrechen
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-orange-500 hover:bg-orange-600 font-bold text-white shadow-md shadow-orange-500/20"
                >
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isEdit ? 'Aktualisieren' : 'Aufgabe Erstellen'}
                </Button>
            </div>
        </form>
    );
}
