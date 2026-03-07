'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { TeamService } from '@/lib/services/teamService';
import { WorkerService } from '@/lib/services/workerService';
import { Team, Worker } from '@/types/ausfuehrung';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkerTypeahead } from './WorkerTypeahead';
import { Loader2 } from 'lucide-react';

const toast = {
    success: (msg: string) => window.alert('Erfolg: ' + msg),
    error: (msg: string) => window.alert('Fehler: ' + msg)
};

interface TeamFormProps {
    projektId: string;
    teamToEdit?: Team;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function TeamForm({ projektId, teamToEdit, onSuccess, onCancel }: TeamFormProps) {
    const [workers, setWorkers] = React.useState<Worker[]>([]);
    const [selectedWorkerIds, setSelectedWorkerIds] = React.useState<string[]>(
        teamToEdit?.members || []
    );
    const [isLoading, setIsLoading] = React.useState(false);

    const router = useRouter();
    const isEdit = !!teamToEdit;

    const { register, handleSubmit, formState: { errors } } = useForm<{ name: string; description?: string }>({
        defaultValues: {
            name: teamToEdit?.name || '',
            description: teamToEdit?.description || ''
        }
    });

    React.useEffect(() => {
        const fetchWorkers = async () => {
            try {
                // Sólo traemos a los activos
                const data = await WorkerService.getActiveWorkers(projektId);
                setWorkers(data);
            } catch (err) {
                toast.error('Gefundene Fehler beim Laden der Mitarbeiter.');
            }
        };
        fetchWorkers();
    }, [projektId]);

    const onSubmit = async (data: { name: string; description?: string }) => {
        setIsLoading(true);
        try {
            if (isEdit) {
                await TeamService.updateTeam(teamToEdit.id, {
                    name: data.name,
                    description: data.description,
                    members: selectedWorkerIds
                });
                toast.success('Team erfolgreich aktualisiert.');
            } else {
                await TeamService.createTeam({
                    projektId,
                    name: data.name,
                    description: data.description,
                    members: selectedWorkerIds
                });
                toast.success('Neues Team wurde erfolgreich erstellt.');
            }
            if (onSuccess) onSuccess();
            router.refresh();
        } catch (error) {
            toast.error('Fehler beim Speichern des Teams.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
                <label htmlFor="name" className="text-slate-800 font-bold block text-sm">Teamname <span className="text-red-500">*</span></label>
                <Input
                    id="name"
                    placeholder="E.g. Montage Team Alpha"
                    disabled={isLoading}
                    className="focus-visible:ring-orange-500 font-medium"
                    {...register('name', { required: 'Bitte geben Sie einen Namen ein.' })}
                />
                {errors.name && <p className="text-xs text-red-500 font-semibold">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
                <label className="text-slate-800 font-bold block text-sm">Zugewiesene Mitglieder</label>
                <WorkerTypeahead
                    workers={workers}
                    selectedIds={selectedWorkerIds}
                    onChange={setSelectedWorkerIds}
                    disabled={isLoading}
                    placeholder="Mitarbeiter suchen und hinzufügen..."
                />
                <p className="text-[10px] text-muted-foreground italic font-medium">Nur aktive Mitarbeiter werden in der Liste angezeigt.</p>
            </div>

            <div className="space-y-2">
                <label htmlFor="description" className="text-slate-800 font-bold block text-sm">Beschreibung</label>
                <textarea
                    id="description"
                    rows={3}
                    placeholder="Zusätzliche Notizen über das Team..."
                    disabled={isLoading}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-medium text-slate-700"
                    {...register('description')}
                />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
                    {isEdit ? 'Aktualisieren' : 'Team Speichern'}
                </Button>
            </div>
        </form>
    );
}
