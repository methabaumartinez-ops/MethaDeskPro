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

            const [projekt, allTeilsysteme, fahrzeuge, mitarbeiter, material, lieferanten, positionen, allBestellungen] = await Promise.all([
                DatabaseService.get<any>('projekte', projektId),
                DatabaseService.list<any>('teilsysteme'), // Fetch all, filter manually like UI to avoid index issues
                DatabaseService.list<any>('fahrzeuge'),
                DatabaseService.list<any>('mitarbeiter'),
                DatabaseService.list<any>('material'),
                DatabaseService.list<any>('lieferanten'),
                DatabaseService.list<any>('positionen'),
                DatabaseService.list<any>('bestellungen'),
            ]);

            const teilsysteme = allTeilsysteme?.filter(t => t.projektId === projektId) || [];
            const bestellungen = allBestellungen?.filter(b => b.projektId === projektId) || [];

            console.log(`Context found: ${teilsysteme?.length || 0} systems, ${positionen?.length || 0} positions, ${bestellungen?.length || 0} bestellungen`);

            return {
                projekt,
                teilsysteme,
                fahrzeuge,
                mitarbeiter,
                material: material?.filter(m => m.projektId === projektId || !m.projektId),
                lieferanten,
                positionen,
                bestellungen
            };
        } catch (error) {
            console.error('Error fetching context for AI:', error);
            return null;
        }
    }

    static formatContextToText(context: any): string {
        if (!context) return "Kein Projektkontext in der Datenbank verfügbar.";

        let text = `=== SYSTEMKONFIGURATION ===\n`;
        text += `Datenquelle: Echzeit-Datenbank (MethaDeskPro Qdrant)\n`;
        text += `Aktuelles Datum: ${new Date().toLocaleDateString('de-CH')}\n\n`;

        text += `=== AKTUELLE PROJEKTINFORMATIONEN ===\n`;
        if (context.projekt) {
            text += `Name: ${context.projekt.projektname || context.projekt.name || context.projekt.id}\n`;
            text += `Projektnummer: ${context.projekt.projektnummer || 'N/A'}\n`;
            text += `Ort: ${context.projekt.plz || ''} ${context.projekt.ort || ''}\n`;
            text += `Bauleiter: ${context.projekt.bauleiter || 'Nicht zugewiesen'}\n`;
            text += `Projektleiter: ${context.projekt.projektleiter || 'Nicht zugewiesen'}\n`;
            text += `Polier: ${context.projekt.polier || 'N/A'}\n`;
            text += `Status: ${context.projekt.status || 'N/A'}\n`;
            if (context.projekt.description) text += `Beschreibung: ${context.projekt.description}\n`;
        } else {
            text += `Projekt nicht gefunden.\n`;
        }

        if (context.teilsysteme && context.teilsysteme.length > 0) {
            text += `\n=== TEILSYSTEME & BAUZEITENPLAN ===\n`;
            context.teilsysteme.forEach((ts: any) => {
                text += `- ${ts.name} (${ts.teilsystemNummer || 'ID: ' + ts.id}):\n`;
                text += `  Status: ${ts.status || 'offen'}\n`;
                if (ts.montagetermin) text += `  MONTAGETERMIN: ${ts.montagetermin}\n`;
                if (ts.lieferfrist) text += `  Lieferfrist: ${ts.lieferfrist}\n`;
                if (ts.abgabePlaner) text += `  Abgabe Planer: ${ts.abgabePlaner}\n`;
                if (ts.verantwortlich) text += `  Verantwortlich: ${ts.verantwortlich}\n`;

                // Add associated positions if available
                const systemPos = context.positionen?.filter((p: any) => p.teilsystemId === ts.id) || [];
                if (systemPos.length > 0) {
                    text += `  Positionen: ${systemPos.map((p: any) => p.name).join(', ')}\n`;
                }
            });
        }

        if (context.mitarbeiter && context.mitarbeiter.length > 0) {
            text += `\n=== PERSONAL & VERFÜGBARKEIT ===\n`;
            context.mitarbeiter.forEach((m: any) => {
                text += `- ${m.vorname} ${m.nachname}: Rolle: ${m.rolle || 'Mitarbeiter'}, Email: ${m.email || 'N/A'}\n`;
            });
        }

        if (context.material && context.material.length > 0) {
            text += `\n=== FINANZDATEN & MATERIALKOSTEN ===\n`;
            let totalBudget = 0;
            context.material.slice(0, 30).forEach((mat: any) => {
                const subTotal = (mat.menge || 0) * (mat.preis || 0);
                totalBudget += subTotal;
                text += `- ${mat.bezeichnung || mat.name}: Menge ${mat.menge || 0} ${mat.einheit || 'Stk'}, Preis pro Einheit: ${mat.preis || 0} CHF (Subtotal: ${subTotal.toFixed(2)} CHF)\n`;
                if (mat.liefertermin) text += `  LIEFERTERMIN: ${mat.liefertermin}\n`;
                if (mat.status) text += `  Bestellstatus: ${mat.status}\n`;
            });
            text += `Zusammenfassung Materialkosten (Auszug): ca. ${totalBudget.toFixed(2)} CHF\n`;
        }

        if (context.fahrzeuge && context.fahrzeuge.length > 0) {
            text += `\n=== FUHRPARK & MASCHINEN ===\n`;
            context.fahrzeuge.forEach((f: any) => {
                text += `- ${f.bezeichnung || f.name}: ${f.typ || 'Gerät'} - Status: ${f.status || 'Verfügbar'}\n`;
                if (f.standort) text += `  Standort: ${f.standort}\n`;
                if (f.geprueftBis) text += `  Service fällig am: ${f.geprueftBis}\n`;
            });
        }

        if (context.lieferanten && context.lieferanten.length > 0) {
            text += `\n=== LIEFERANTEN ===\n`;
            context.lieferanten.forEach((l: any) => {
                text += `- ${l.name}: Kontakt ${l.kontakt || 'N/A'}, Tel: ${l.telefon || 'N/A'}\n`;
            });
        }

        if (context.bestellungen && context.bestellungen.length > 0) {
            text += `\n=== WERKHOF BESTELLUNGEN & LOGISTIK ===\n`;
            context.bestellungen.forEach((b: any) => {
                const datum = b.bestelldatum ? new Date(b.bestelldatum).toLocaleDateString('de-CH') : 'N/A';
                text += `- Bestellung ${b.id} (${b.containerBez || 'Sin título'}): Status ${b.status}, Bestellt von ${b.bestelltVon}, Datum ${datum}\n`;
                if (b.items && b.items.length > 0) {
                    text += `  Artikel:\n`;
                    b.items.forEach((item: any) => {
                        const readyMark = item.vorbereitet ? '[X] Bereit' : '[ ] Offen';
                        text += `  - ${item.menge} ${item.einheit} ${item.materialName || 'Unbekannt'} | ${readyMark}\n`;
                    });
                }
            });
        }

        return text;
    }

}
