---
description: Universal Archive-First Delete Workflow (Repo-Agnostic) — Locate → Patch → Validate
---

# Universal Archive-First Delete Workflow (Repo-Agnostic) — Locate → Patch → Validate

### Inputs

- **Target Item(s):** [INSERT TARGET(S) HERE]
- **Target Context/Type:** [e.g., UI Button, API Route, Database Field]

### Scope Rules

- Enforce: Open max 8 files, ask before >12
- Enforce: Search only entry strings
- Enforce: Diff-only output
- Enforce: No alternatives unless asked
- Enforce: Stop after PASS 1 if semantics unclear

### PASS 1 Locate & Trace

1. **Identify Entry Points:** Search for EXACT strings related to the Target Item(s).
2. **Trace Dependencies:** Map out where these items are used, imported, or exported.
3. **Stop & Review:** If there is any ambiguity or if the scope seems larger than expected, STOP and ask the user for clarification before proceeding to Pass 2.

### PASS 2 Apply Patch

1. **Archive/Soft-Delete Priority:** If deleting records or removing functionality, prefer soft-deletes (e.g., adding `isArchived`, `deletedAt`) over hard SQL/DB deletes.
2. **Remove UI/Code Traces:** Remove the target item from UI components, API payloads, or processing logic.
3. **Diff-Only Output:** Apply changes using tools (like `replace_file_content` or `multi_replace_file_content`) efficiently.

### Output Format

- Brief summary of files changed.
- If user review is needed, provide exact file paths.

### NZT-48 Toggle

NZT-48: ON

### Validation / Self-Check

- Did we remove the entry points without breaking the build?
- Did we respect the archive/soft-delete rule?
- (Self-Correction): If a required change breaks a hard dependency, revert and warn the user.
