// Client-side dummy stub for DatabaseService
// This file replaces db.ts in client bundles (via package.json "browser" field).
// It ensures that Qdrant is never bundled into the browser, while allowing the 
// "universal service" pattern to continue working safely.

export const DatabaseService = new Proxy({} as any, {
    get: function (target, prop) {
        return function () {
            throw new Error(`[Security] DatabaseService.${String(prop)} cannot be executed on the client. It must only run on the server.`);
        };
    }
});
