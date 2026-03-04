import { Project, SyntaxKind, IfStatement } from "ts-morph";
import * as path from 'path';

const project = new Project();
const servicesDir = path.join(__dirname, '../src/lib/services');
project.addSourceFilesAtPaths(`${servicesDir}/*.ts`);

const files = project.getSourceFiles();

const skipFiles = ['db.ts', 'db.client.ts', 'googleDriveService.ts', 'authService.ts', 'subsystemService.ts'];

let totalRefactored = 0;

for (const file of files) {
    const filename = file.getBaseName();
    if (skipFiles.includes(filename)) {
        continue;
    }

    let changed = false;

    // 1. Remove dangerous server imports
    const imports = file.getImportDeclarations();
    for (const imp of imports) {
        const mod = imp.getModuleSpecifierValue();
        if (mod.includes('/db') || mod.includes('googleDrive') || mod === 'uuid') {
            imp.remove();
            changed = true;
        }
    }

    // 2. Find and refactor `if (typeof window !== 'undefined')` blocks
    const methods = file.getDescendantsOfKind(SyntaxKind.MethodDeclaration);
    for (const method of methods) {
        let replacementBody = '';
        let foundWindowCheck = false;

        const statements = method.getBody()?.getStatements() || [];
        for (const stmt of statements) {
            if (stmt.getKind() === SyntaxKind.IfStatement) {
                const ifStmt = stmt as IfStatement;
                if (ifStmt.getExpression().getText().includes("typeof window")) {
                    foundWindowCheck = true;
                    const thenStmt = ifStmt.getThenStatement();

                    if (thenStmt.getKind() === SyntaxKind.Block) {
                        const fullText = thenStmt.getText();
                        // Strip out { and }
                        replacementBody = fullText.slice(1, -1).trim();
                    } else {
                        replacementBody = thenStmt.getText();
                    }
                    break;
                }
            }
        }

        if (foundWindowCheck) {
            method.setBodyText(replacementBody);
            changed = true;
        }
    }

    if (changed) {
        file.saveSync();
        console.log(`[+] Refactored: ${filename}`);
        totalRefactored++;
    }
}

console.log(`\nDone. Successfully refactored ${totalRefactored} services to pure client fetchers.`);
