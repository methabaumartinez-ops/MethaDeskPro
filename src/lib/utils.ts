import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getAppUrl() {
    if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_APP_URL || '';
    return process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
}

export function cleanBemerkung(text?: string): string {
    if (!text) return '';
    return text
        .split('\n')
        .filter(line => {
            const l = line.trim();
            return !l.startsWith('IFC:') && !l.startsWith('Source file:');
        })
        .join('\n')
        .trim();
}

/** Returns true when the Montagetermin is still the Bauleiter-provided provisional value (shows red in tables). */
export function isMontageterminProvisional(item: { montageterminProvisional?: boolean }): boolean {
    return item.montageterminProvisional === true;
}
