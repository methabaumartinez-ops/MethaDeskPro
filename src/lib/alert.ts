// Global alert helper — must be initialised at the AlertProvider level.
// Usage anywhere in the app: import { showAlert } from '@/lib/alert'
// then: showAlert('Mensaje') or showAlert({ title: 'Titel', message: '...', variant: 'danger' })

type AlertVariant = 'danger' | 'warning' | 'success' | 'info';

interface AlertOptions {
    title?: string;
    message: string;
    variant?: AlertVariant;
    confirmLabel?: string;
}

type AlertFn = (options: AlertOptions | string) => Promise<void>;

let _alertFn: AlertFn | null = null;

/**
 * Called once by AlertProvider to register the alert function globally.
 */
export function _registerAlertFn(fn: AlertFn) {
    _alertFn = fn;
}

/**
 * Show a branded alert modal. Falls back to window.alert if provider is not mounted.
 */
export function showAlert(options: AlertOptions | string): Promise<void> {
    if (_alertFn) return _alertFn(options);
    // Fallback for SSR or unmounted provider
    const msg = typeof options === 'string' ? options : `${options.title ? options.title + ': ' : ''}${options.message}`;
    if (typeof window !== 'undefined') window.alert(msg);
    return Promise.resolve();
}
