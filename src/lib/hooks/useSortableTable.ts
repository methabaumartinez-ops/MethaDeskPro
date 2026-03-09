import { useState, useMemo, useCallback } from 'react';

export type SortDir = 'asc' | 'desc';

/** Smart comparator: handles ISO dates, numerics, and German strings */
function compareValues(va: any, vb: any, dir: SortDir): number {
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;

    // ISO date strings
    if (typeof va === 'string' && typeof vb === 'string' && /^\d{4}-\d{2}-\d{2}/.test(va) && /^\d{4}-\d{2}-\d{2}/.test(vb)) {
        const diff = new Date(va).getTime() - new Date(vb).getTime();
        return dir === 'asc' ? diff : -diff;
    }

    // Numeric
    const numA = parseFloat(String(va).replace(',', '.'));
    const numB = parseFloat(String(vb).replace(',', '.'));
    if (!isNaN(numA) && !isNaN(numB)) {
        return dir === 'asc' ? numA - numB : numB - numA;
    }

    // String with German locale + numeric collation (TS-2 < TS-10)
    const cmp = String(va).localeCompare(String(vb), 'de', { numeric: true, sensitivity: 'base' });
    return dir === 'asc' ? cmp : -cmp;
}

/**
 * useSortableTable
 *
 * Usage:
 *   const { sortCol, sortDir, handleSort, sortedData, getSortIcon } = useSortableTable(data);
 *
 * In the TableHead:
 *   <TableHead onClick={() => handleSort('columnKey')} className="cursor-pointer select-none">
 *     Spaltenname {getSortIcon('columnKey')}
 *   </TableHead>
 *
 * Render rows with `sortedData` instead of the original array.
 */
export function useSortableTable<T extends Record<string, any>>(data: T[], initialSortCol: string | null = null, initialSortDir: SortDir = 'asc') {
    const [sortCol, setSortCol] = useState<string | null>(initialSortCol);
    const [sortDir, setSortDir] = useState<SortDir>(initialSortDir);

    const handleSort = useCallback((col: string) => {
        setSortCol(prev => {
            if (prev === col) {
                setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                return col;
            }
            setSortDir('asc');
            return col;
        });
    }, []);

    const sortedData = useMemo((): T[] => {
        if (!sortCol) return data;
        return [...data].sort((a, b) => compareValues(a[sortCol], b[sortCol], sortDir));
    }, [data, sortCol, sortDir]);

    /** Returns ▲, ▼ or ⇅ depending on sort state */
    const getSortIcon = useCallback((col: string): string => {
        if (sortCol !== col) return '⇅';
        return sortDir === 'asc' ? '▲' : '▼';
    }, [sortCol, sortDir]);

    const isSortActive = useCallback((col: string) => sortCol === col, [sortCol]);

    return { sortCol, sortDir, handleSort, sortedData, getSortIcon, isSortActive };
}
