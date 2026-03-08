import * as React from 'react';
import { cn } from '@/lib/utils';

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
    ({ className, ...props }, ref) => (
        <div className="relative w-full overflow-x-auto overflow-y-visible rounded-xl border border-border bg-card dark:bg-slate-900">
            <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
        </div>
    )
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
    ({ className, ...props }, ref) => <thead ref={ref} className={cn('[&_tr]:border-y-2 [&_tr]:border-orange-500 bg-orange-50 dark:bg-orange-500/20 sticky top-0 z-20', className)} {...props} />
);
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
    ({ className, ...props }, ref) => <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
);
TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
    ({ className, ...props }, ref) => (
        <tr
            ref={ref}
            className={cn('border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)}
            {...props}
        />
    )
);
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
    ({ className, ...props }, ref) => (
        <th
            ref={ref}
            className={cn('h-12 px-4 text-left align-middle font-black text-orange-600 dark:text-orange-400 [&:has([role=checkbox])]:pr-0 uppercase text-[11px] tracking-wider bg-inherit', className)}
            {...props}
        />
    )
);
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
    ({ className, ...props }, ref) => (
        <td ref={ref} className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0 text-foreground dark:text-slate-200', className)} {...props} />
    )
);
TableCell.displayName = 'TableCell';

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
