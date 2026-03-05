---
description: Archive-first delete + Gelöscht grayscale + Restore + Hard-delete advanced gating
---

Title
Global Slash Workflow Trigger: Bind “/++” to Universal Archive-First Delete Workflow

Context
You want a reusable workflow (repo-agnostic) to be available in ALL projects, and you want it to trigger specifically when typing “/++” in Antigravity.

Task
Create a global slash command that:

- Trigger: /++
- Expands to the “Universal Archive-First Delete Workflow (Repo-Agnostic) — Locate → Patch → Validate”
- Works across all repositories/projects.
- Is optimized for token efficiency (strict scoping, two-pass execution, diff-only outputs).

Requirements

1) Command Definition

- Name: Universal Archive-First Delete
- Trigger: /++
- Visibility: Global (available in all projects/workspaces)
- Insertion mode: Insert template into prompt composer (not execute immediately unless Antigravity supports it)
- Ensure the slash trigger includes both characters: “/++” (not just “/”)

1) Template Content
When /++ is invoked, insert EXACTLY the following template (verbatim), with an “Inputs” block that the user edits:

[PASTE TEMPLATE]
Universal Archive-First Delete Workflow (Repo-Agnostic) — Locate → Patch → Validate
(Include the full workflow template with:

- Inputs
- Scope Rules
- PASS 1 Locate & Trace
- PASS 2 Apply Patch
- Output Format
- Stop Conditions
- NZT-48 Toggle
- Validation/Self-check)

1) Token Optimization Defaults

- Enforce: Open max 8 files, ask before >12
- Enforce: Search only entry strings
- Enforce: Diff-only output
- Enforce: No alternatives unless asked
- Enforce: Stop after PASS 1 if semantics unclear

1) Validation

- Confirm typing “/++” shows the command in the slash palette.
- Confirm selecting it inserts the workflow text.
- Confirm it is available in a new/unrelated project without reconfiguration.

Constraints

- Do not store project-specific paths inside the global template.
- Do not include any secrets or environment variables in templates.
- Keep the workflow usable across frameworks (Next.js, React, backend repos) by relying on search-based discovery.

Output Format

1) Exact steps to add a global slash command in Antigravity (Settings path + UI actions).
2) The exact /++ command metadata to enter (Name, Trigger, Scope, Description).
3) The final template text to paste as the command body.
4) Quick test checklist to verify it works in all projects.

NZT-48 Toggle
NZT-48: ON

Validation / Self-Check

- /++ appears as a selectable command.
- It inserts the workflow verbatim.
- It is global across projects.
