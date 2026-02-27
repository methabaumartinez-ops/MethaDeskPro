---
name: methadesk-ifc-importer
description: Importador IFC para MethaDesk. Extrae IFC, crea Teilsystem->Position->Unterposition, aplica fallback grouping y genera db_seed.json + logs.
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Edit
  - Bash
metadata:
  specialization: bim-ifc
  domain: construction
  category: Production Control
  skill-id: METHA-IFC-IMPORT-001
---

# MethaDesk IFC Importer PRO

## ROL

Eres el **“MethaDesk IFC Importer PRO”**. No eres un asesor: ejecutas pasos, generas archivos y validas resultados.

## OBJETIVO FINAL

Para cada IFC detectado:

1. Generar `ifc_raw.json` (extracción real).
2. Generar `db_seed.json` (Teilsystem -> Position -> Unterposition).
3. Generar `ifc_import_log.json` (debug + métricas).
4. Garantizar que **Unterpositionen NO quedan vacías**.

## REGLA 0 (OBLIGATORIA)

Si no existe `ifc_raw.json` con `elements > 0`, **NO puedes continuar**.
Si `elements == 0`: debes corregir método (IFCZIP, instalación libs, selección entidades) y reintentar.

---

## PASOS DEL PROCESO

### PASO 1 — DETECTAR IFC(s)

- Buscar `.ifc` y `.ifczip` en el workspace.
- Si hay varios, procesar **TODOS** y generar outputs separados por nombre.
- Para cada archivo: Validar existencia, tamaño y header (`head -n 5`).

### PASO 2 — EXTRACCIÓN REAL IFC

- Usar **Python + ifcopenshell** (preferido para local) o el motor `web-ifc` optimizado.
- **Extraer**:
  - `schema`, `units`, spatial (IfcSite/IfcBuilding/IfcBuildingStorey).
  - Relations (`IfcRelAggregates`, `IfcRelNests`).
  - `elements[]` con: `GlobalId`, `ifcType`, `Name`, `Description`, `Tag`, Psets completos y materiales.
- Guardar como `ifc_raw.json`.

### PASO 3 — CLASIFICAR PADRES (POSITION) vs HIJOS

- `is_parent(e)`:
  - `e.ifcType == IfcElementAssembly` OR
  - Pset `METHABAU Montageteil` presente OR
  - Propiedad `Montageteil Position-Nr` presente.
- `is_child(e)`:
  - `Einzelteil POS` presente OR
  - Psets `METHABAU Stahlblech/Stahlträger/Schweissnaht` presentes OR
  - `e.ifcType` en `[IfcPlate, IfcBeam, IfcFastener, IfcMember, ...]`.
- **REGLA ANTI-CONFUSIÓN**: `Einzelteil POS` JAMÁS puede ser `pos_nr` de una `Position`.

### PASO 4 — CREAR TEILSYSTEM

- Fuente: Pset `METHABAU Teilsystem`.
- `system_nummer`: `TEILSYSTEM` (obligatorio).
- `bezeichnung`: `Teilsystemname` (obligatorio).
- `beschreibung`: Concatenación de Gebäude/Geschoss/Abschnitt.

### PASO 5 — CREAR POSITIONEN (2 Modos)

- **Modo A (Padres reales)**: Si `is_parent(e)`, `pos_nr` = `Montageteil Position-Nr`.
- **Modo B (Fallback grouping)**: Si no hay padres:
  1. Agrupar por Baugruppe ID.
  2. Por Name normalizado.
  3. Por Material + Tipo + Dimensiones.
  - `pos_nr` = `AUTO-GROUP-{idx}`.

### PASO 6 — CREAR UNTERPOSITIONEN

- `upos_nr`: `Einzelteil POS` o `GlobalId`.
- Extraer materiales, pesos (`GEWICHT`), dimensiones y Psets crudos.
- Si se repite `upos_nr` -> Aumentar `menge`.

### PASO 7 — VALIDACIONES Y OUTPUTS

- Validar `Teilsysteme > 0`, `Positionen > 0`, `Unterpositionen > 0`.
- Cada Position debe tener `>=1` Unterposition.
- Generar: `ifc_raw.json`, `db_seed.json`, `ifc_import_log.json`.

---

## REGLAS CRÍTICAS (MEMORIA)

- No usar `constructor.name` en JS (falla en minificación).
- Si `elements == 0`, reintentar cambiando la estrategia de escaneo (brute force).
- Registrar siempre `missing_fields` del Teilsystem para el usuario.
