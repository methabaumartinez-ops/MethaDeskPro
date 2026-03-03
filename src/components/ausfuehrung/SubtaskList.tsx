'use client';

import * as React from 'react';
import { Subtask, SubtaskStatus } from '@/types/ausfuehrung';
import { Check, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WorkerTypeahead } from './WorkerTypeahead';

interface SubtaskListProps {
    subtasks: Subtask[];
    workers: { id: string; fullName: string; role?: string }[];
    onToggleStatus: (id: string, currentStatus: SubtaskStatus) => void;
    onReorder: (activeId: string, direction: 'up' | 'down') => void;
    onDelete: (id: string) => void;
    onAssignWorker: (subtaskId: string, workerId: string | undefined) => void;
    readOnly?: boolean;
}

export function SubtaskList({
    subtasks,
    workers,
    onToggleStatus,
    onReorder,
    onDelete,
    onAssignWorker,
    readOnly = false
}: SubtaskListProps) {

    return (
        <div className="flex flex-col gap-2">
            {subtasks.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                    Keine Einträge vorhanden.
                </div>
            )}
            {subtasks.map((st, index) => {
                const isDone = st.status === 'fertig';
                return (
                    <div
                        key={st.id}
                        className={cn(
                            "group flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 shadow-sm rounded-xl transition-all",
                            isDone && "bg-slate-50/50 border-slate-200/60"
                        )}
                    >
                        <div className="flex items-center gap-3 w-full min-w-0">
                            {/* Actions Left */}
                            {!readOnly && (
                                <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => onReorder(st.id, 'up')}
                                        disabled={index === 0}
                                        className="text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-300"
                                    >
                                        <GripVertical className="h-3 w-3" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onReorder(st.id, 'down')}
                                        disabled={index === subtasks.length - 1}
                                        className="text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-300 transform rotate-180"
                                    >
                                        <GripVertical className="h-3 w-3" />
                                    </button>
                                </div>
                            )}

                            {/* Checkbox Emulation */}
                            <button
                                type="button"
                                onClick={() => !readOnly && onToggleStatus(st.id, st.status as SubtaskStatus)}
                                disabled={readOnly}
                                className={cn(
                                    "flex-shrink-0 h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center",
                                    isDone
                                        ? "bg-green-500 border-green-500 text-white"
                                        : "bg-white border-slate-300 text-transparent hover:border-orange-400"
                                )}
                            >
                                <Check className="h-3.5 w-3.5 mt-px" />
                            </button>

                            {/* Title */}
                            <span className={cn(
                                "text-sm font-semibold truncate transition-colors",
                                isDone ? "text-slate-400 line-through" : "text-slate-700"
                            )}>
                                {st.title}
                            </span>
                        </div>

                        {/* Actions Right */}
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="w-[180px] hidden sm:block">
                                <WorkerTypeahead
                                    workers={workers}
                                    selectedIds={st.assignedWorkerId ? [st.assignedWorkerId] : []}
                                    onChange={(ids) => onAssignWorker(st.id, ids.length > 0 ? ids[0] : undefined)}
                                    disabled={readOnly || isDone}
                                    placeholder="Zuweisen..."
                                />
                            </div>

                            {!readOnly && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onDelete(st.id)}
                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all rounded-lg"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
