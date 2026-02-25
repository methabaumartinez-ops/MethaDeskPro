// src/lib/hooks/usePermissions.ts
'use client';

import { useMemo } from 'react';
import { getPermissions, hasPermission, RolePermissions } from '@/lib/permissions';
import { useProjekt } from '@/lib/context/ProjektContext';

export function usePermissions() {
    const { currentUser } = useProjekt();

    // Obtenemos el rol del usuario conectado
    const role = currentUser?.role;

    // Memorizamos los permisos para evitar cálculos innecesarios
    const permissions = useMemo(() => getPermissions(role), [role]);

    return {
        role,
        permissions,
        can: (permission: keyof RolePermissions) => hasPermission(role, permission),
    };
}
