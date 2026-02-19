import { DatabaseService } from './db';

export class AIService {
    static async getProjectContext(projektId: string) {
        try {
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
        if (!context) return "No hay contexto disponible en la base de datos.";

        let text = `=== INFORMACIÓN DEL PROYECTO ACTUAL ===\n`;
        if (context.projekt) {
            text += `Nombre: ${context.projekt.projektname || context.projekt.name || context.projekt.id}\n`;
            text += `Número: ${context.projekt.projektnummer || 'N/A'}\n`;
            text += `Bauleiter: ${context.projekt.bauleiter || 'No asignado'}\n`;
            text += `Projektleiter: ${context.projekt.projektleiter || 'No asignado'}\n`;
            text += `Estatus: ${context.projekt.status || 'N/A'}\n`;
            if (context.projekt.description) text += `Descripción: ${context.projekt.description}\n`;
        } else {
            text += `No se encontró el proyecto con el ID proporcionado.\n`;
        }

        if (context.teilsysteme && context.teilsysteme.length > 0) {
            text += `\n=== SISTEMAS / COMPONENTES (Teilsysteme) ===\n`;
            context.teilsysteme.forEach((ts: any) => {
                text += `- ${ts.name} (ID: ${ts.teilsystemNummer || ts.id}): Estatus ${ts.status || 'abierto'}, Responsable: ${ts.verantwortlich || 'N/A'}\n`;
            });
        }

        if (context.mitarbeiter && context.mitarbeiter.length > 0) {
            text += `\n=== PERSONAL / EQUIPO ===\n`;
            context.mitarbeiter.forEach((m: any) => {
                text += `- ${m.vorname || m.firstName} ${m.nachname || m.lastName}: Rol: ${m.rolle || m.role || 'Personal'}, Email: ${m.email || 'N/A'}\n`;
            });
        }

        if (context.fahrzeuge && context.fahrzeuge.length > 0) {
            text += `\n=== MAQUINARIA Y VEHÍCULOS (Fuhrpark) ===\n`;
            context.fahrzeuge.forEach((f: any) => {
                text += `- ${f.bezeichnung || f.name}: ${f.typ || f.type || 'Vehículo'} (${f.status || 'Disponible'})\n`;
            });
        }

        if (context.material && context.material.length > 0) {
            text += `\n=== MATERIALES ===\n`;
            context.material.slice(0, 20).forEach((mat: any) => {
                text += `- ${mat.bezeichnung || mat.name}: Cantidad ${mat.menge || 0} ${mat.einheit || 'uds'}\n`;
            });
            if (context.material.length > 20) text += `... y ${context.material.length - 20} materiales más.\n`;
        }

        if (context.lieferanten && context.lieferanten.length > 0) {
            text += `\n=== PROVEEDORES ===\n`;
            context.lieferanten.forEach((l: any) => {
                text += `- ${l.name || l.firma}: Contacto ${l.kontaktperson || 'N/A'}, Tel: ${l.telefon || 'N/A'}\n`;
            });
        }

        return text;
    }
}
