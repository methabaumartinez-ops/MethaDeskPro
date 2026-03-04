---
description: Archive-first delete + Gelöscht grayscale + Restore + Hard-delete advanced gating
---

# /metha-archive Workflow

## Context

Repo: MethaDeskPro
Goal: Replace primary delete with archive-first (ZIP to Drive), show deleted projects in grayscale with Restore, keep hard delete as admin-only advanced with double confirm.

## Inputs

- Entry strings to search (exact):
  `["Gelöscht", "viewMode", "getDeletedProjekte", "/api/projekte/deleted", "export-delete", "archive/route.ts", "restore", "archivedZipUrl", "deletedAt", "ConfirmDialog", "window.showAlert"]`
- Known files:
  - `src/app/(projekt-selection)/projekte/page.tsx`
  - `src/app/(projekt-selection)/projekte/bearbeiten/[id]/page.tsx`
  - `src/app/api/projekte/[id]/archive/route.ts`
  - `src/app/api/projekte/[id]/export-delete/route.ts`
  - `src/app/api/projekte/deleted/route.ts`
  - `src/lib/services/projectService.ts`

## Scope Rules

- DO NOT scan the whole repo.
- Phase 1 (Locate): search ONLY the entry strings listed above.
- Open ONLY the top 8 most relevant files (prefer the Known files list).
- If more than 12 files are needed, STOP and ask for approval listing additional paths.

---

## PASS 1 — Locate & Trace (no code changes)

1. Search for each entry string using grep_search across the repo.
2. Open only files from the Known files list + any newly discovered relevant files (max 8 total).
3. Confirm:
   - Where the Gelöscht list is rendered and filtered (UI + API).
   - Where delete is triggered in the UI (button, handler, fetch call).
   - Which endpoints implement archive / export-delete / deleted listing.
   - How `deletedAt` is stored and filtered (truthy / exists / `!= null`).
4. Output:
   - Exact file paths (no guessing — if not found, write "MISSING").
   - Call graph: `UI button → handler → fetch → API route → DatabaseService`.
   - Minimal patch list.

---

## PASS 2 — Apply Patch (only after PASS 1 is confirmed)

### Hard Constraints (never violate these)

- Do NOT delete the ZIP from Google Drive on restore.
- `deletedAt` must be set ONLY after the ZIP upload to Drive succeeds.
- All API routes must return JSON errors (no HTML redirects).
- Hard delete must be admin-only + require two sequential ConfirmDialog confirmations.
- Gelöscht card layout and image sizing must stay identical — only add `grayscale` CSS filter and the Restore button.

### Steps

1. **Replace native `confirm()`** in `bearbeiten/[id]/page.tsx` with the existing `ConfirmDialog` component.
2. **Primary action = Archive**: button "Archivieren" → calls `ProjectService.archiveProjekt(id)` → `POST /api/projekte/[id]/archive`. Show loading state. On success redirect to `/projekte`.
3. **Harden archive route atomicity**: confirm `deletedAt` is written to DB only after `uploadFileToDrive` resolves. If upload throws, return `{error}` JSON, do not touch DB.
4. **Create restore endpoint** `src/app/api/projekte/[id]/restore/route.ts`:
   - Auth: `admin` or `projektleiter`.
   - Clean removal of `deletedAt`: use `const r = { ...project }; delete r.deletedAt;` before upsert — do NOT use `undefined` or `null` (Qdrant stores the key).
   - Store `restoredAt`, `restoredBy` for audit.
   - Return `{ success: true, restoredAt }`.
   - Never delete the ZIP from Drive.
5. **Add `ProjectService.restoreProjekt(id)`** calling `POST /api/projekte/[id]/restore`.
6. **Update Gelöscht cards** in `projekte/page.tsx`:
    - Apply `grayscale opacity-60` to the card image.
    - Add "Wiederherstellen" button per card:
      - Calls `ProjectService.restoreProjekt(p.id)`.
      - On success: optimistically removes card from `deletedProjekte` state + calls `loadProjekte()`.
      - On error: `showAlert(...)` (never `window.showAlert`).
    - Keep "Backup öffnen" button below.
7. **Gate hard delete** under a collapsible `<details>` / `<button>` section labeled "Erweiterte Admin-Optionen":
    - Visible ONLY when `currentUser?.role === 'admin'`.
    - Clicking triggers **first** ConfirmDialog (variant=danger).
    - Only after confirming the first, a **second** ConfirmDialog appears with final irreversibility warning.
    - Only on second confirm: call `POST /api/projekte/[id]/export-delete`, download the JSON blob, then redirect to `/projekte`.

---

## Output Format (strict)

1. **Findings** — max 12 bullets, each with exact file path.
2. **Patch List** — file-by-file summary.
3. **Code Changes** — unified diffs only (no full file dumps unless file does not exist yet).
4. **Validation Checklist** — max 10 steps.

---

## Stop Conditions

- No alternatives unless asked.
- If missing info blocks correctness (e.g. `deletedAt` filter semantics unclear), ask ONE question and stop.
- If more than 12 files are needed, list them and stop for approval.
