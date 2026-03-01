import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
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
