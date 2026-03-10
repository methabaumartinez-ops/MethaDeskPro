/**
 * WorkforcePlanningService — Client-side aggregation for calendar/workload views.
 * Computes daily/weekly/monthly schedules per worker or per team from task data.
 */
import { Task, TeamMembershipHistory } from '@/types';
import { Worker } from '@/types/ausfuehrung';

// ── Date helpers ─────────────────────────────────────────────────

/** Parse a date string (ISO or DD.MM.YYYY) into Date object */
function parseDate(d: string): Date {
    // Try DD.MM.YYYY
    const deParts = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (deParts) return new Date(+deParts[3], +deParts[2] - 1, +deParts[1]);
    return new Date(d);
}

/** Format a Date to ISO date string YYYY-MM-DD */
function toISODate(d: Date): string {
    return d.toISOString().split('T')[0];
}

/** Get all dates in a range (inclusive) */
function getDatesInRange(start: Date, end: Date): string[] {
    const dates: string[] = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    while (current <= endDate) {
        dates.push(toISODate(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

/** Get week start (Monday) for a date */
function getWeekStart(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

/** Get month key YYYY-MM from a date */
function getMonthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Validation ───────────────────────────────────────────────────

export interface ScheduleValidationError {
    field: string;
    message: string;
}

export function validateScheduleFields(task: Partial<Task>): ScheduleValidationError[] {
    const errors: ScheduleValidationError[] = [];

    if (task.estimatedHours !== undefined && task.estimatedHours !== null) {
        if (task.estimatedHours < 0) {
            errors.push({ field: 'estimatedHours', message: 'Geschaetzte Stunden duerfen nicht negativ sein.' });
        }
        if (task.estimatedHours > 24) {
            errors.push({ field: 'estimatedHours', message: 'Geschaetzte Stunden duerfen nicht ueber 24 liegen.' });
        }
    }

    if (task.startTime && task.endTime) {
        if (task.startTime >= task.endTime) {
            errors.push({ field: 'endTime', message: 'Endzeit muss nach der Startzeit liegen.' });
        }
    }

    if (task.scheduledDate) {
        const parsed = parseDate(task.scheduledDate);
        if (isNaN(parsed.getTime())) {
            errors.push({ field: 'scheduledDate', message: 'Ungültiges Datum.' });
        }
    }

    if (task.startTime && !/^\d{2}:\d{2}$/.test(task.startTime)) {
        errors.push({ field: 'startTime', message: 'Startzeit muss im Format HH:MM sein.' });
    }
    if (task.endTime && !/^\d{2}:\d{2}$/.test(task.endTime)) {
        errors.push({ field: 'endTime', message: 'Endzeit muss im Format HH:MM sein.' });
    }

    return errors;
}

// ── Aggregation types ────────────────────────────────────────────

export interface DailySchedule {
    date: string; // YYYY-MM-DD
    tasks: Task[];
    totalHours: number;
}

export interface WeeklySchedule {
    weekStart: string; // YYYY-MM-DD (Monday)
    days: DailySchedule[];
    totalHours: number;
}

export interface MonthlySchedule {
    month: string; // YYYY-MM
    days: DailySchedule[];
    totalHours: number;
}

export interface WorkloadSummary {
    totalTasks: number;
    totalHours: number;
    plannedTasks: number;
    unplannedTasks: number;
}

// ── Core service ─────────────────────────────────────────────────

export const WorkforcePlanningService = {

    /** Get tasks for a specific worker in a date range */
    getWorkerTasks(allTasks: Task[], workerId: string, startDate: string, endDate: string): Task[] {
        const start = parseDate(startDate);
        const end = parseDate(endDate);
        return allTasks.filter(t => {
            if (t.workerId !== workerId) return false;
            if (!t.scheduledDate) return false;
            const tDate = parseDate(t.scheduledDate);
            return tDate >= start && tDate <= end;
        });
    },

    /** Get tasks for a specific team in a date range (all members' tasks + unassigned team tasks) */
    getTeamTasks(allTasks: Task[], teamId: string, teamWorkerIds: string[], startDate: string, endDate: string): Task[] {
        const start = parseDate(startDate);
        const end = parseDate(endDate);
        const workerSet = new Set(teamWorkerIds);
        const seen = new Set<string>();

        return allTasks.filter(t => {
            if (!t.scheduledDate) return false;
            const tDate = parseDate(t.scheduledDate);
            if (tDate < start || tDate > end) return false;

            // Task directly assigned to this team
            if (t.teamId === teamId) {
                if (!seen.has(t.id)) {
                    seen.add(t.id);
                    return true;
                }
                return false;
            }

            // Task assigned to a worker who is in this team
            if (t.workerId && workerSet.has(t.workerId) && !t.teamId) {
                if (!seen.has(t.id)) {
                    seen.add(t.id);
                    return true;
                }
            }

            return false;
        });
    },

    /** Build daily schedule from tasks */
    buildDailySchedules(tasks: Task[], startDate: string, endDate: string): DailySchedule[] {
        const dates = getDatesInRange(parseDate(startDate), parseDate(endDate));
        const tasksByDate = new Map<string, Task[]>();

        for (const t of tasks) {
            if (!t.scheduledDate) continue;
            const key = toISODate(parseDate(t.scheduledDate));
            const existing = tasksByDate.get(key) || [];
            existing.push(t);
            tasksByDate.set(key, existing);
        }

        return dates.map(date => {
            const dayTasks = tasksByDate.get(date) || [];
            return {
                date,
                tasks: dayTasks,
                totalHours: dayTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
            };
        });
    },

    /** Build weekly schedule */
    buildWeeklySchedule(tasks: Task[], referenceDate: string): WeeklySchedule {
        const weekStart = getWeekStart(parseDate(referenceDate));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const startStr = toISODate(weekStart);
        const endStr = toISODate(weekEnd);
        const days = this.buildDailySchedules(tasks, startStr, endStr);

        return {
            weekStart: startStr,
            days,
            totalHours: days.reduce((sum, d) => sum + d.totalHours, 0),
        };
    },

    /** Build monthly schedule */
    buildMonthlySchedule(tasks: Task[], year: number, month: number): MonthlySchedule {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // last day of month

        const startStr = toISODate(startDate);
        const endStr = toISODate(endDate);
        const days = this.buildDailySchedules(tasks, startStr, endStr);

        return {
            month: getMonthKey(startDate),
            days,
            totalHours: days.reduce((sum, d) => sum + d.totalHours, 0),
        };
    },

    /** Compute workload summary for a set of tasks */
    getWorkloadSummary(tasks: Task[]): WorkloadSummary {
        return {
            totalTasks: tasks.length,
            totalHours: tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
            plannedTasks: tasks.filter(t => t.scheduledDate).length,
            unplannedTasks: tasks.filter(t => !t.scheduledDate).length,
        };
    },
};
