import { DatabaseService } from './db';

export class AIService {
    static async getProjectContext(projektId: string) {
        try {
            console.log(`Fetching context for project ID: ${projektId}`);
            // Fetch relevant data for the project
            const filter = {
                must: [
                    { key: 'projektId', match: { value: projektId } }
                ]
            };

            const [projekt, teilsysteme, fahrzeuge, mitarbeiter, material, lieferanten] = await Promise.all([
                DatabaseService.get<any>('projekte', projektId),
                DatabaseService.list<any>('teilsysteme', filter),
                DatabaseService.list<any>('fahrzeuge'),
                DatabaseService.list<any>('mitarbeiter'),
                DatabaseService.list<any>('material'),
                DatabaseService.list<any>('lieferanten'),
            ]);

            console.log(`Context found: ${teilsysteme?.length || 0} systems, ${mitarbeiter?.length || 0} employees`);

            return {
                projekt,
                teilsysteme,
                fahrzeuge,
                mitarbeiter,
                material: material?.filter(m => m.projektId === projektId || !m.projektId),
                lieferanten
            };
        } catch (error) {
            console.error('Error fetching context for AI:', error);
            return null;
        }
    }

    static formatContextToText(context: any): string {
        if (!context) return "Kein Projektkontext in der Datenbank verfügbar.";

        let text = `=== AKTUELLE PROJEKTINFORMATIONEN ===\n`;
        if (context.projekt) {
            text += `Name: ${context.projekt.projektname || context.projekt.name || context.projekt.id}\n`;
            text += `Nummer: ${context.projekt.projektnummer || 'N/A'}\n`;
            text += `Bauleiter: ${context.projekt.bauleiter || 'Nicht zugewiesen'}\n`;
            text += `Projektleiter: ${context.projekt.projektleiter || 'Nicht zugewiesen'}\n`;
            text += `Status: ${context.projekt.status || 'N/A'}\n`;
            if (context.projekt.description) text += `Beschreibung: ${context.projekt.description}\n`;
        } else {
            text += `Projekt mit der angegebenen ID nicht gefunden.\n`;
        }

        if (context.teilsysteme && context.teilsysteme.length > 0) {
            text += `\n=== TEILSYSTEME / KOMPONENTEN ===\n`;
            context.teilsysteme.forEach((ts: any) => {
                text += `- ${ts.name} (ID: ${ts.teilsystemNummer || ts.id}): Status ${ts.status || 'offen'}, Verantwortlich: ${ts.verantwortlich || 'N/A'}\n`;
            });
        }

        if (context.mitarbeiter && context.mitarbeiter.length > 0) {
            text += `\n=== PERSONAL / TEAM ===\n`;
            context.mitarbeiter.forEach((m: any) => {
                text += `- ${m.vorname || m.firstName} ${m.nachname || m.lastName}: Rolle: ${m.rolle || m.role || 'Mitarbeiter'}, Email: ${m.email || 'N/A'}\n`;
            });
        }

        if (context.fahrzeuge && context.fahrzeuge.length > 0) {
            text += `\n=== FUHRPARK / MASCHINEN ===\n`;
            context.fahrzeuge.forEach((f: any) => {
                text += `- ${f.bezeichnung || f.name}: ${f.typ || f.type || 'Fahrzeug'} (${f.status || 'Verfügbar'})\n`;
            });
        }

        if (context.material && context.material.length > 0) {
            text += `\n=== MATERIALIEN ===\n`;
            context.material.slice(0, 20).forEach((mat: any) => {
                text += `- ${mat.bezeichnung || mat.name}: Menge ${mat.menge || 0} ${mat.einheit || 'Stk'}\n`;
            });
            if (context.material.length > 20) text += `... und ${context.material.length - 20} weitere Materialien.\n`;
        }

        if (context.lieferanten && context.lieferanten.length > 0) {
            text += `\n=== LIEFERANTEN ===\n`;
            context.lieferanten.forEach((l: any) => {
                text += `- ${l.name || l.firma}: Ansprechpartner ${l.kontaktperson || 'N/A'}, Tel: ${l.telefon || 'N/A'}\n`;
            });
        }

        return text;
    }
}
