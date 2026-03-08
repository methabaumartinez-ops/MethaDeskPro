import { z } from 'zod';

// Dominios corporativos permitidos
export const ALLOWED_DOMAINS = ['methabau.ch', 'mansergroup.ch', 'agentia-automate.ch'] as const;

export function getEmailDomain(email: string): string {
    return email.split('@')[1]?.toLowerCase() ?? '';
}

export function isAllowedDomain(email: string): boolean {
    return ALLOWED_DOMAINS.includes(getEmailDomain(email) as typeof ALLOWED_DOMAINS[number]);
}

// Política de contraseñas
export const PASSWORD_RULES = [
    { id: 'length',    label: 'Mindestens 8 Zeichen',              regex: /.{8,}/ },
    { id: 'upper',     label: 'Mindestens ein Grossbuchstabe',      regex: /[A-Z]/ },
    { id: 'number',    label: 'Mindestens eine Zahl',               regex: /[0-9]/ },
    { id: 'special',   label: 'Mindestens ein Sonderzeichen (@!#$%&*)',  regex: /[^a-zA-Z0-9]/ },
] as const;

export type RuleId = typeof PASSWORD_RULES[number]['id'];

export function checkPasswordRules(password: string): Record<RuleId, boolean> {
    const result = {} as Record<RuleId, boolean>;
    for (const rule of PASSWORD_RULES) {
        result[rule.id] = rule.regex.test(password);
    }
    return result;
}

export function isPasswordValid(password: string): boolean {
    return Object.values(checkPasswordRules(password)).every(Boolean);
}

// Zod schema reutilizable
export const passwordSchema = z
    .string()
    .min(8, 'Mindestens 8 Zeichen erforderlich')
    .regex(/[A-Z]/, 'Mindestens ein Grossbuchstabe erforderlich')
    .regex(/[0-9]/, 'Mindestens eine Zahl erforderlich')
    .regex(/[^a-zA-Z0-9]/, 'Mindestens ein Sonderzeichen erforderlich');

export const emailDomainSchema = z
    .string()
    .email('Ungültige E-Mail-Adresse')
    .refine(
        (email) => isAllowedDomain(email),
        { message: 'Nur E-Mail-Adressen von @methabau.ch oder @mansergroup.ch sind erlaubt.' }
    );
