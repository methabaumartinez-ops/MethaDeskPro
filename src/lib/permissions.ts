// src/lib/permissions.ts
// RBAC — Mapa de permisos por rol

import type { UserRole } from '@/types';

export interface RolePermissions {
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    statusChange: boolean;
    qrMove: boolean;
    viewKosten: boolean;
    editKosten: boolean;
    viewDokumente: boolean;
    uploadDokumente: boolean;
    manageUsers: boolean;
    manageLagerorte: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
    superadmin: {
        read: true, create: true, update: true, delete: true,
        statusChange: true, qrMove: true, viewKosten: true, editKosten: true,
        viewDokumente: true, uploadDokumente: true, manageUsers: true, manageLagerorte: true,
    },
    admin: {
        read: true, create: true, update: true, delete: true,
        statusChange: true, qrMove: true, viewKosten: true, editKosten: true,
        viewDokumente: true, uploadDokumente: true, manageUsers: true, manageLagerorte: true,
    },
    projektleiter: {
        read: true, create: true, update: true, delete: false,
        statusChange: true, qrMove: true, viewKosten: true, editKosten: true,
        viewDokumente: true, uploadDokumente: true, manageUsers: false, manageLagerorte: true,
    },
    bauprojektleiter: {
        read: true, create: true, update: true, delete: false,
        statusChange: true, qrMove: true, viewKosten: true, editKosten: true,
        viewDokumente: true, uploadDokumente: true, manageUsers: false, manageLagerorte: true,
    },
    baufuhrer: {
        read: true, create: false, update: true, delete: false,
        statusChange: true, qrMove: true, viewKosten: true, editKosten: false,
        viewDokumente: true, uploadDokumente: false, manageUsers: false, manageLagerorte: false,
    },
    planer: {
        read: true, create: true, update: true, delete: false,
        statusChange: true, qrMove: false, viewKosten: false, editKosten: false,
        viewDokumente: true, uploadDokumente: true, manageUsers: false, manageLagerorte: false,
    },
    polier: {
        read: true, create: false, update: false, delete: false,
        statusChange: true, qrMove: true, viewKosten: false, editKosten: false,
        viewDokumente: true, uploadDokumente: false, manageUsers: false, manageLagerorte: false,
    },
    monteur: {
        read: true, create: false, update: false, delete: false,
        statusChange: false, qrMove: true, viewKosten: false, editKosten: false,
        viewDokumente: true, uploadDokumente: false, manageUsers: false, manageLagerorte: false,
    },
    werkhof: {
        read: true, create: false, update: true, delete: false,
        statusChange: true, qrMove: true, viewKosten: false, editKosten: true,
        viewDokumente: true, uploadDokumente: false, manageUsers: false, manageLagerorte: true,
    },
    produktion: {
        read: true, create: false, update: true, delete: false,
        statusChange: true, qrMove: false, viewKosten: false, editKosten: false,
        viewDokumente: true, uploadDokumente: false, manageUsers: false, manageLagerorte: false,
    },
    mitarbeiter: {
        read: true, create: false, update: false, delete: false,
        statusChange: false, qrMove: false, viewKosten: false, editKosten: false,
        viewDokumente: false, uploadDokumente: false, manageUsers: false, manageLagerorte: false,
    },
};

export function getPermissions(role: UserRole | string | undefined): RolePermissions {
    if (!role) return ROLE_PERMISSIONS.mitarbeiter;
    return ROLE_PERMISSIONS[role as UserRole] ?? ROLE_PERMISSIONS.mitarbeiter;
}

export function hasPermission(
    role: UserRole | string | undefined,
    permission: keyof RolePermissions
): boolean {
    if (role === 'superadmin') return true; // Superadmin has all permissions
    return getPermissions(role)[permission] === true;
}

export const ROLE_LABELS: Record<UserRole, string> = {
    superadmin: 'Super Admin',
    admin: 'Administrator',
    projektleiter: 'Projektleiter',
    bauprojektleiter: 'Bau-Projektleiter',
    baufuhrer: 'Bauführer',
    planer: 'Planer',
    polier: 'Polier',
    monteur: 'Monteur',
    werkhof: 'Werkhof',
    produktion: 'Produktion',
    mitarbeiter: 'Mitarbeiter',
};

// Rollen-Gruppen aus dem Dokument
export const ROLE_GROUPS = {
    PLANER_GROUP: ['planer', 'baufuhrer', 'bauprojektleiter', 'projektleiter', 'admin'] as UserRole[],
    POLIER_GROUP: ['polier', 'monteur', 'werkhof'] as UserRole[],
    PRODUKTION_GROUP: ['produktion'] as UserRole[],
};
