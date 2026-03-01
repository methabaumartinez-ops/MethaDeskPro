// src/types/index.ts

// ============================================================
// ROLES Y PERMISOS
// ============================================================

export type UserRole =
  | 'admin'
  | 'projektleiter'
  | 'bauprojektleiter'
  | 'baufuhrer'
  | 'planer'
  | 'polier'
  | 'monteur'
  | 'werkhof'
  | 'produktion'
  | 'mitarbeiter';

export interface User {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  department?: string;
  role: UserRole;
}

// ============================================================
// ENUMS CONTROLADOS (Wertlisten)
// ============================================================

export const ABTEILUNGEN_CONFIG = [
  { id: 'planung', name: 'Planung', color: 'info' },
  { id: 'einkauf', name: 'Einkauf', color: 'secondary' },
  { id: 'avor', name: 'AVOR', color: 'violet' },
  { id: 'schlosserei', name: 'Schlosserei', color: 'gray' },
  { id: 'blech', name: 'Blechabteilung', color: 'orange' },
  { id: 'werkhof', name: 'Werkhof', color: 'teal' },
  { id: 'montage', name: 'Montage', color: 'success' },
  { id: 'bau', name: 'Bau', color: 'error' },
  { id: 'zimmerei', name: 'Zimmerei', color: 'gray' },
  { id: 'subunternehmer', name: 'Subunternehmer', color: 'violet' },
] as const;

export type Abteilung = typeof ABTEILUNGEN_CONFIG[number]['name'];
export type AbteilungId = typeof ABTEILUNGEN_CONFIG[number]['id'];

export type Beschichtung =
  | 'feuerverzinkt'
  | 'pulverbeschichtet'
  | 'nasslackiert'
  | 'eloxiert'
  | 'kunststoffbeschichtet'
  | 'unbehandelt'
  | 'andere';

export type PlanStatus =
  | 'offen'
  | 'in_bearbeitung'
  | 'freigegeben'
  | 'fertig'
  | 'geaendert'
  | 'abgeschlossen';

// ============================================================
// PROJEKTE
// ============================================================

export type ProjektStatus = 'offen' | 'in arbeit' | 'abgeschlossen' | 'pausiert';

export interface Projekt {
  id: string;
  projektnummer: string;
  projektname: string;
  strasse?: string;
  plz?: string;
  ort: string;
  kanton: string;
  projektleiter?: string;
  deviseur?: string;
  bimKonstrukteur?: string;
  bauleiter?: string;
  polier?: string;
  einkauf?: string;
  status: ProjektStatus;
  imageUrl?: string;
  infoBlattUrl?: string;
  infoBlattName?: string;
  driveFolderId?: string;
  createdBy?: string;
  createdAt: string;
}

// ============================================================
// ITEM STATUS (gemeinsam)
// ============================================================

export type ItemStatus =
  | 'offen'
  | 'in_produktion'
  | 'bestellt'
  | 'geliefert'
  | 'verbaut'
  | 'geaendert'
  | 'abgeschlossen';

// ============================================================
// TEILSYSTEME
// ============================================================

export interface Teilsystem {
  id: string;
  projektId: string;
  ks?: string | number;
  teilsystemNummer?: string;
  name: string;
  beschreibung: string;
  bemerkung?: string;
  eroeffnetAm?: string;
  eroeffnetDurch?: string;
  montagetermin?: string;
  lieferfrist?: string;
  abgabePlaner?: string;
  planStatus?: PlanStatus;
  wemaLink?: string;
  projektordnerLink?: string;
  imageUrl?: string;
  ifcUrl?: string;
  ifcFileName?: string;
  ifcChecksum?: string;
  ifcSchema?: string;
  ifcUnits?: { length: string; weight: string;[key: string]: string };
  importVersion?: number;
  fallbackUsed?: boolean;
  missingFields?: string[];
  importWarnings?: string[];
  documentUrl?: string;
  lagerortId?: string;
  abteilung?: Abteilung;
  status: ItemStatus;
  lieferantenIds?: string[];
  lieferantenNames?: string[];
  subunternehmerId?: string;
  subunternehmerName?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// POSITIONEN
// ============================================================

export interface Position {
  id: string;
  teilsystemId: string;
  projektId?: string;
  posNummer?: string;
  name: string;
  beschreibung?: string;
  menge: number;
  einheit: string;
  gewicht?: number;         // kg
  oberflaeche?: number;     // m²
  beschichtung?: Beschichtung;
  lieferantId?: string;
  beschichterId?: string;
  lagerortId?: string;
  planStatus?: PlanStatus;
  planDatum?: string;
  freiDatum?: string;
  bestelltAm?: string;
  geliefertAm?: string;
  verbautAm?: string;
  montagetermin?: string;
  abteilung?: Abteilung;
  bemerkung?: string;
  groupingMethod?: 'REAL_PARENT' | 'FALLBACK_GROUP' | 'AUTO_GROUP';
  groupingKey?: string;
  ifcParentGlobalId?: string;
  ifcMeta?: any; // psets + summary
  status: ItemStatus;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// UNTERPOSITIONEN
// ============================================================

export interface Unterposition {
  id: string;
  positionId: string;
  teilsystemId?: string;
  projektId?: string;
  posNummer?: string;
  name: string;
  beschreibung?: string;
  menge: number;
  einheit: string;
  gewicht?: number;
  oberflaeche?: number;
  beschichtung?: Beschichtung;
  lieferantId?: string;
  beschichterId?: string;
  lagerortId?: string;
  planStatus?: PlanStatus;
  planDatum?: string;
  freiDatum?: string;
  bestelltAm?: string;
  geliefertAm?: string;
  verbautAm?: string;
  abteilung?: Abteilung;
  bemerkung?: string;
  materialProp?: string;
  oberflaecheProp?: string;
  dimensions?: { laenge_mm?: number; breite_mm?: number; staerke_mm?: number;[key: string]: any };
  gewichtKg?: number;
  ifcChildGlobalId?: string;
  ifcType?: string;
  rawPsets?: any;
  status: ItemStatus;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// MATERIAL (Bestellungen)
// ============================================================

export interface Material {
  id: string;
  positionId?: string;
  teilsystemId?: string;
  name: string;
  hersteller: string;
  artikelnummer?: string;
  status: ItemStatus;
  menge?: number;
  einheit?: string;
  preis?: number;
  liefertermin?: string;
  projektId?: string;
}

export type BestellungStatus = 'angefragt' | 'in_bearbeitung' | 'bereit' | 'versendet' | 'geliefert';

export interface BestellungItem {
  id: string;
  materialName: string;
  menge: number;
  einheit: string;
  vorbereitet: boolean;
  tsnummer?: string;
  attachmentUrl?: string;
  attachmentId?: string;
  attachmentName?: string;
  bemerkung?: string;
}

export interface MaterialBestellung {
  id: string;
  projektId: string;
  containerBez: string;
  bestelldatum: string;
  status: BestellungStatus;
  bestelltVon: string;
  items: BestellungItem[];
  bemerkung?: string;
  liefertermin?: string;
}

// ============================================================
// WERTLISTEN (WL)
// ============================================================

export interface Lieferant {
  id: string;
  name: string;
  kontakt: string;
  email: string;
  telefon: string;
  adresse?: string;
  notizen?: string;
}

export interface WlBeschichter {
  id: string;
  name: string;
  kontakt?: string;
  email?: string;
  telefon?: string;
  adresse?: string;
  notizen?: string;
  beschichtungsarten?: Beschichtung[];
  createdAt?: string;
}

export interface Mitarbeiter {
  id: string;
  vorname: string;
  nachname: string;
  rolle: string;
  email: string;
  abteilung?: Abteilung | string;
  image?: string;
  stundensatz?: number;  // CHF/h für Kostenerfassung
}

export interface Subunternehmer {
  id: string;
  name: string;
  kontakt?: string;
  tel?: string;
  email?: string;
  firma?: string;
  createdAt: string;
}

// ============================================================
// LAGERORT & LAGERBEWEGUNGEN (QR)
// ============================================================

export interface Lagerort {
  id: string;
  projektId: string;
  bezeichnung: string;       // z.B. "Lager A - Regal 3"
  beschreibung?: string;
  qrCode?: string;          // QR code string (encode: "LAGERORT:{id}")
  bereich?: string;         // z.B. "Werkhof", "Baustelle", "Extern"
  planUrl?: string;          // URL to a plan or map
  createdAt?: string;
  updatedAt?: string;
}

export type LagerbewegungTyp = 'einlagerung' | 'auslagerung' | 'umlagerung';

export interface Lagerbewegung {
  id: string;
  entityType: 'teilsystem' | 'position' | 'unterposition';
  entityId: string;
  vonLagerortId?: string;
  nachLagerortId: string;
  typ: LagerbewegungTyp;
  durchgefuehrtVon: string;   // User ID
  durchgefuehrtVonName?: string;
  zeitpunkt: string;           // ISO timestamp
  bemerkung?: string;
  projektId?: string;
}

// ============================================================
// KOSTENERFASSUNG
// ============================================================

export interface TsStunden {
  id: string;
  teilsystemId: string;
  projektId: string;
  mitarbeiterId: string;
  mitarbeiterName?: string;
  datum: string;
  stunden: number;
  abteilung?: Abteilung | string;
  abteilungId?: AbteilungId | string;
  taetigkeit?: string;       // z.B. "Montage", "Schweissen", "Planung"
  bemerkung?: string;
  createdAt?: string;
}

export interface TsMaterialkosten {
  id: string;
  teilsystemId: string;
  projektId: string;
  bezeichnung: string;
  lieferantId?: string;
  lieferantName?: string;
  menge: number;
  einheit: string;
  einzelpreis: number;       // CHF
  gesamtpreis?: number;     // berechnet: menge * einzelpreis
  bestelldatum?: string;
  lieferdatum?: string;
  rechnungsnummer?: string;
  bemerkung?: string;
  createdAt?: string;
}

// ============================================================
// DOKUMENTE
// ============================================================

export type DokumentTyp =
  | 'PDF'
  | 'DXF'
  | 'Schnittliste'
  | 'Auszug'
  | 'IFC'
  | 'Zeichnung'
  | 'Lieferschein'
  | 'Rechnung'
  | 'Andere';

export interface TsDokument {
  id: string;
  entityType: 'teilsystem' | 'position' | 'unterposition' | 'projekt';
  entityId: string;
  projektId?: string;
  name: string;
  typ: DokumentTyp;
  url?: string;               // Google Drive URL oder externer Link
  driveFileId?: string;       // Google Drive File ID
  wemaLink?: string;
  projektordnerLink?: string;
  sendeDatum?: string;        // Datum gesendet
  empfangsDatum?: string;     // Datum empfangen
  bemerkung?: string;
  hochgeladenVon?: string;    // User ID
  hochgeladenVonName?: string;
  createdAt?: string;
}

// ============================================================
// FUHRPARK
// ============================================================

export type FahrzeugKategorie =
  | 'scherenbuehne'
  | 'teleskopbuehne'
  | 'vertikalmastbuehne'
  | 'mauerbuehne'
  | 'teleskop_frontlader'
  | 'kleinbagger'
  | 'baggerlader'
  | 'raupendumper'
  | 'minikran'
  | 'turmdrehkran'
  | 'raupenkran';

export type FahrzeugStatus = 'verfuegbar' | 'reserviert' | 'in_wartung' | 'ausser_betrieb';

export interface Fahrzeug {
  id: string;
  bezeichnung: string;
  kategorie: FahrzeugKategorie;
  inventarnummer: string;
  fabrikat?: string;
  typ?: string;
  seriennummer?: string;
  farbe?: string;
  kennzeichen?: string;
  plattformhoehe?: string;
  masse?: string;
  laenge?: string;
  breite?: string;
  hoehe?: string;
  leistung?: string;
  gewicht?: string;
  reichweite?: string;
  nutzlast?: string;
  maxLast?: string;
  antrieb?: string;
  baujahr?: number;
  spezHinweis?: string;
  kaufjahr?: string;
  geprueftBis?: string;
  abgaswartung?: string;
  status: FahrzeugStatus;
  bemerkung?: string;
  imageUrl?: string;
  gruppe?: string;
  standort?: string;
  manualUrl?: string;
  zusatzinfo?: string;
  muldengroesse?: string;
  bodendruckMax?: string;
  kwInfo?: string[];
}

export interface FahrzeugReservierung {
  id: string;
  fahrzeugId: string;
  projektId: string;
  projektName?: string;
  baustelle: string;
  reserviertAb: string;
  reserviertBis?: string;
  reserviertDurch?: string;
  bemerkung?: string;
  createdAt: string;
}
// ============================================================
// IFC IMPORT LOG (PRO)
// ============================================================
export interface IFCImportLog {
  id: string;
  teilsystemId: string;
  fileName: string;
  checksum: string;
  importedAt: string;
  importedBy: string;
  elementsTotal: number;
  positionsCreated: number;
  unterpositionsCreated: number;
  fallbackUsed: boolean;
  orphansCount: number;
  warnings: string[];
  missingFields: string[];
  debugPaths: {
    ifcRaw?: string;
    dbSeed?: string;
  };
}

// ============================================================
// DASHBOARD BUILDER (Requests & Results)
// ============================================================

export interface DashboardRequest {
  id: string;
  userId: string;
  projektId?: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  requirements: AICollectedRequirements;
}

export interface AICollectedRequirements {
  widgetType: string;
  inputData: string;
  behavior: string;
  automations?: string;
  permissions?: string;
  visualFormat?: string;
  fileActions?: string;
  integrations?: string;
  notifications?: string;
  rawJson?: any;
}

export interface DashboardUserSession {
  id: string;
  userId: string;
  lastActive: string;
  conversationState: any;
}

export interface AIConversationLog {
  id: string;
  requestId: string;
  userId: string;
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }[];
}
