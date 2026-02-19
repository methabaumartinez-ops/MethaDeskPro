// src/types/index.ts

export type UserRole = 'admin' | 'projektleiter' | 'mitarbeiter';

export interface User {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  department?: string;
  role: UserRole;
}

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
  driveFolderId?: string;
  createdBy?: string;
  createdAt: string;
}

export type ItemStatus = 'offen' | 'in_produktion' | 'bestellt' | 'geliefert' | 'verbaut' | 'abgeschlossen';

export interface Teilsystem {
  id: string;
  projektId: string;
  ks?: string;
  teilsystemNummer?: string;
  name: string;
  beschreibung: string;
  bemerkung?: string;
  eroeffnetAm?: string;
  eroeffnetDurch?: string;
  montagetermin?: string;
  lieferfrist?: string;
  abgabePlaner?: string;
  planStatus?: string;
  wemaLink?: string;
  imageUrl?: string;
  status: ItemStatus;
}

export interface Position {
  id: string;
  teilsystemId: string;
  name: string;
  menge: number;
  einheit: string;
  status: ItemStatus;
}

export interface Material {
  id: string;
  positionId?: string;
  name: string;
  hersteller: string;
  artikelnummer?: string;
  status: ItemStatus;
  menge?: number;
  einheit?: string;
  preis?: number;
  liefertermin?: string;
}

export interface Lieferant {
  id: string;
  name: string;
  kontakt: string;
  email: string;
  telefon: string;
  adresse?: string;
  notizen?: string;
}

export interface Mitarbeiter {
  id: string;
  vorname: string;
  nachname: string;
  rolle: string;
  email: string;
  abteilung?: string;
  image?: string;
}

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
  | 'sonstiges';

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
  leistung?: string;
  gewicht?: string;
  reichweite?: string;
  nutzlast?: string;
  antrieb?: string;
  baujahr?: number;
  spezHinweis?: string;
  kaufjahr?: string;
  geprueftBis?: string;
  abgaswartung?: string;
  status: FahrzeugStatus;
  bemerkung?: string;
  imageUrl?: string;
  gruppe?: string; // e.g. "Scherenbühne elekr."
  standort?: string; // Current location
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
