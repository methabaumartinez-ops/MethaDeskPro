/**
 * src/lib/env.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fail-fast environment validator.
 * Import this at the top of any server entry point that depends on critical env vars.
 * Throws immediately on startup if required variables are missing.
 *
 * NEVER expose these via NEXT_PUBLIC_* — all are server-only secrets.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Required server-side environment variables */
const REQUIRED_SERVER_VARS = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
] as const;

/** Required only when specific features are active */
const CONDITIONAL_VARS: { var: string; condition: string }[] = [
    { var: 'OPENAI_API_KEY', condition: 'AI chat is enabled' },
    { var: 'GOOGLE_REFRESH_TOKEN', condition: 'file upload to Google Drive is enabled' },
    { var: 'QDRANT_URL', condition: 'semantic search is enabled' },
];

type RequiredVar = typeof REQUIRED_SERVER_VARS[number];

/**
 * Validates that all required environment variables are present.
 * Call once at server boot — will throw if any required var is missing.
 */
export function validateEnv(): void {
    // Safety guard: never run mock-mode in production
    if (process.env.NODE_ENV === 'production' && process.env.USE_MOCK === 'true') {
        throw new Error(
            '[ENV] CRITICAL: USE_MOCK=true is set in a production environment. ' +
            'This is forbidden. Remove USE_MOCK or set it to false in production.'
        );
    }

    const missing: string[] = [];

    for (const varName of REQUIRED_SERVER_VARS) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    if (missing.length > 0) {
        throw new Error(
            `[ENV] MISSING required environment variables:\n` +
            missing.map(v => `  → ${v}`).join('\n') + '\n' +
            `These must be set in EasyPanel environment configuration, NOT in .env files.`
        );
    }

    // Warn (don't throw) on conditional vars that are missing
    for (const { var: varName, condition } of CONDITIONAL_VARS) {
        if (!process.env[varName]) {
            console.warn(
                `[ENV] WARNING: ${varName} is not set. ` +
                `Feature unavailable: ${condition}.`
            );
        }
    }
}

/**
 * Type-safe accessor for a required server env var.
 * Throws if the variable is not set — use only in server-side code.
 */
export function requireEnv(name: RequiredVar): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `[ENV] Required environment variable '${name}' is not set. ` +
            `Set it in EasyPanel environment configuration.`
        );
    }
    return value;
}
