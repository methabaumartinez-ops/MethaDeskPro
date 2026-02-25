// src/lib/hooks/usePermissions.ts
'use client';

import { useEffect, useState } from 'react';
import { getPermissions, hasPermission, RolePermissions } from '@/lib/permissions';
import type { UserRole } from '@/types';

function getUserRoleFromCookie(): UserRole | undefined {
    if (typeof document === 'undefined') return undefined;
    // El token JWT es HttpOnly, pero guardamos el rol en localStorage al hacer login
    try {
        const userData = localStorage.getItem('methabau_user');
        if (userData) {
            const user = JSON.parse(userData);
            return user.role as UserRole;
        }
    } catch {
        return undefined;
    }
    return undefined;
}

export function usePermissions() {
    const [role, setRole] = useState<UserRole | undefined>(undefined);
    const [permissions, setPermissions] = useState<RolePermissions>(getPermissions(undefined));

    useEffect(() => {
        const r = getUserRoleFromCookie();
        setRole(r);
        setPermissions(getPermissions(r));
    }, []);

    return {
        role,
        permissions,
        can: (permission: keyof RolePermissions) => hasPermission(role, permission),
    };
}
