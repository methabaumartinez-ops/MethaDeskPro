
import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new QdrantClient({
    url: process.env.NEXT_PUBLIC_QDRANT_URL,
    apiKey: process.env.NEXT_PUBLIC_QDRANT_API_KEY,
    port: process.env.NEXT_PUBLIC_QDRANT_URL?.startsWith('https') ? 443 : 6333,
});

const RAW_OCR_DATA = `
==Start of OCR for page 1==
Baumaschinenstandorte Aktualisiert : 17.02.2026
Fabrikat: Genie Fabrikat: Genie Fabrikat: Genie Fabrikat: Genie Fabrikat: Genie Fabrikat: Genie Fabrikat: Haulotte Fabrikat: Leguan Fabrikat: Aichi Fabrikat:
Typ: GS-3246 Typ: GS 2646 Typ: GS 2646 Typ: Z-45/25JRT Typ: GS 3246 Typ: GS-3246 Typ: Compact 12DX Typ: 160 Typ: RM 040 Typ:
Serien-No.: Serien-No.: GS4612C-10129 Serien-No.: GS4606-78121 Serien-No.: 17054 Serien-No.: GS4612C10134 Serien-No.: GS4611C-767 Serien-No.: CD104852 Serien-No.: 20193 Serien-No.: 675359 Serien-No.:
Farbe: Blau Farbe: Farbe: Blau Farbe: Blau/Grau Farbe: Farbe: Grau/Orange Farbe: blau/grau Farbe: Rot Farbe: Blau Farbe:
Plattform: 9.75 Plattform: 7.92 Plattform: 7.92 Plattform: 14.00 Plattform: 9.75 Plattform: 9.75 Plattform: 10 Plattform: 13.90 Plattform: 4.00 Plattform:
Masse: 2.41x1.17x2.39 Masse: 2,34x1,45x2.41 Masse: 2,34x1,45x2.41 Masse: 6.78x2.23x2.08 Masse: 2.41x1.17x2.39 Masse: 2.41x1.17x2.39 Masse: 2.65x1.80x2.54 Masse: 4.94x 1.30 x 2.02 Masse: 1.45X 0.80x 1.85 Masse:
Leistung: Leistung: Leistung: Leistung: Leistung: Leistung: Leistung: 18KW Leistung: Leistung: Leistung:
Gewicht: 2812 KG Gewicht: 2446 KG Gewicht: 2370 kg Gewicht: 6400 kg Gewicht: 2812 KG Gewicht: 2812 kg Gewicht: 4030 kg Gewicht: 2100 kg Gewicht: 850 kg Gewicht:
Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.:
Nutzlast: 310 kg Nutzlast: 450 kg Nutzlast: 450 kg Nutzlast: 220 kg Nutzlast: 310 kg Nutzlast: 310 kg Nutzlast: 450 kg Nutzlast: 200 kg / 2 Pers. Nutzlast: Nutzlast:
Antrieb: elektrisch Antrieb: elektrisch Antrieb: elektrisch Antrieb: Diesel Antrieb: elektrisch Antrieb: elektrisch Antrieb: Diesel Antrieb: Diesel / elektrisch Antrieb: elektrisch Antrieb:
Baujahr: 2008 Baujahr: 2012 Baujahr: 2006 Baujahr: 2000 Baujahr: 2012 Baujahr: 2011 Baujahr: 2003 Baujahr: 2010 Baujahr: 1999 Baujahr:
SpezHinweis:Weissrad SpezHinweis: SpezHinweis: SpezHinweis: SpezHinweis: SpezHinweis:Weissrad SpezHinweis:Aussenbereich SpezHinweis: SpezHinweis:Raupen Weiss SpezHinweis:
Geprüft bis 03.2025 Geprüft bis 01.2026 Geprüft bis 06.2026 Geprüft bis 05.2025 Geprüft bis 11.2025 Geprüft bis 03.2026 Geprüft bis 10.2024 Geprüft bis 03.2026 Geprüft bis 04.2026 Geprüft
Gekauft HS DE Gekauft Gekauft Gekauft Gekauft Gekauft HS DE Gekauft Scherbel Gekauft Gekauft Gekauft
Abgas wartung
Abgas wartung
Abgas wartung
Abgas wartung bis 03.2024 Abgas wartung
Abgas wartung
Abgas wartung bis 03.2026 Abgas wartung bis 03.2026 Abgas wartung
Abgas wartung
Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle
KW 36 Landi 
Frauenfeld KW 25 Werkhof KW 9 Unterhalt KW 36 Landi 
Frauenfeld KW 48 Burri 
Glattbrugg KW 24 Unterhalt KW 34 Stutz Affoltern KW 9 Unterhalt KW 15 Unterhalt KW 13
KW 28 Unterhalt KW 19 Dänkfabrik KW 26 Dänkfabrik KW 50 Werkhof KW 20 Unterhalt KW 26 Dänkfabrik KW 9 Unterhalt KW 9 Outlook KW 18 Mecana 
Reichenburg KW 19
Mit InvNr Neu 
Markiert
 Mit Inv Neu 
Markiert
 Mit Inv Neu 
Markiert
01 02 03 04 05 06 13 14 15 16
Scherenbühne Scherenbühne Scherenbühne Teleskopbühne Scherenbühne Scherenbühne Scherenbühne Teleskopbühne Diesel/El Scherenbühne elekr. Scherenbühne elekr.
Inv.-Nr.: 4010 01 Inv.-Nr.: 4010 02 Inv.-Nr.: 4010 03 Inv.-Nr.: 4010 04 Inv.-Nr.: 4010 05 Inv.-Nr.: 4010 06 Inv.-Nr.: 4010 13 Inv.-Nr.: 4010 14 Inv.-Nr.: 4010 15 Inv.-Nr.: 4010 16
==End of OCR for page 1==
==Start of OCR for page 2==
Baumaschinenstandorte Aktualisiert : 17.02.2026
Genie Fabrikat: Genie Fabrikat: Leguan Fabrikat: Haulotte Fabrikat: Haulotte Fabrikat: Genie Fabrikat: Manitou Fabrikat: Haulotte Fabrikat: Genie Fabrikat: Genie
GS2646 Typ: GS2646 Typ: 160 Typ: Compact 10N Typ: Compact 10N Typ: S65 Typ: 150TP Typ: HA20PX Typ: GS2632 Typ: Z-45/25JRT
GS4606-78290 Serien-No.: GS4605-63435 Serien-No.: 20255 Serien-No.: CE117838 Serien-No.: CE118075 Serien-No.: S6005-11744 Serien-No.: 583161 Serien-No.: AD115803 Serien-No.: GS 3213C-10437 Serien-No.: Z452506-28233
Blau Farbe: Blau Farbe: Grün Farbe: Gelb Farbe: Gelb Farbe: Blau/Grau Farbe: rot Farbe: gelb Farbe: Blau Farbe: Blau/Grau
7.80 Plattform: 7.80 Plattform: 13.90 Plattform: 8.00 Plattform: 8.00 Plattform: 20.00 Plattform: 13.00 Plattform: 18.65 Plattform: 7.92 Plattform: 14.00
2.26x 1.17x 2.26 Masse: 2.26x 1.17x 2.26 Masse: 4.94x 1.30x 2.02 Masse: 2.31x 0.81x 2.17 Masse: 2.31x 0.81x 2.17 Masse: 9.42x 2.49x 2.72 Masse: 5.00x2.00x1.50 Masse: 6.80x2.38x2.67 Masse: 2.45x 0.81x 2.26 Masse: 6.78x2.23x2.08
3.3 kW Leistung: Leistung: Leistung: Leistung: Leistung: 35.8 kW Leistung: Leistung: Leistung: 3.3 kW Leistung: 35.8 KW
2447 kg Gewicht: 2447 kg Gewicht: 2100 kg Gewicht: 2160 kg Gewicht: 2160 kg Gewicht: 10'102 kg Gewicht: 8000 kg Gewicht: 11'710 kg Gewicht: 1960 kg Gewicht: 6550 kg
Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Nutzlast: 1000 kg Reichw.: Betriebst.: 175 h Betriebst.: 1500 h
450 kg Nutzlast: 450 kg Nutzlast: 200 kg / 2 Pers. Nutzlast: 230 kg Nutzlast: 230 kg Nutzlast: 220 kg max.: 5 Pers.u Mat. Nutzlast: 230 kg Nutzlast: 220 kg Nutzlast: 2 P (230 kg )
elektrisch Antrieb: elektrisch Antrieb: Diesel / elektrisch Antrieb: elektrisch Antrieb: elektrisch Antrieb: Diesel Antrieb: Diesel Antrieb: Diesel Antrieb: elektrisch Antrieb: Diesel
2006 Baujahr: 2006 Baujahr: 2012 Baujahr: 2005 Baujahr: 2005 Baujahr: 2005 Baujahr: 2010 Baujahr: 2007 Baujahr: 2012 Baujahr: 2006
Weissrad SpezHinweis: Weissrad SpezHinweis: SpezHinweis:Weissrad SpezHinweis:Weissrad SpezHinweis:Allrad SpezHinweis: SpezHinweis: 360° Drehung SpezHinweis:Weissrad SpezHinweis:
bis 01.2026 Geprüft bis 02.2025 Geprüft bis 08.2026 Geprüft bis 05.2025 Geprüft bis 05.2025 Geprüft bis 01.2026 Geprüft bis 8.2025 Geprüft bis 10.2025 Geprüft bis 07.2026 Geprüft bis 7.2025
Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft
Abgas wartung
Abgas wartung bis 03.2026 Abgas wartung
Abgas wartung
Abgas wartung bis 03.2026 Abgas wartung bis 03.2026 Abgas wartung bis 03.2026 Abgas wartung
Abgas wartung bis 03.2026
Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle
Unterhalt KW 42 Landi 
Frauenfeld KW 28 Bucan Buchs KW 10 Eurobus 
Bassersdorf KW 38 Stutz KW 15 Landi Frauenfeld KW 33 Stutz KW 17 Stutz Affoltern KW 50 Stadthof Süd KW 50 Werkhof
Dänkfabrik 
Wädenswil KW 5 Unterhalt Outlook KW 20 Mecana 
Reichenburg KW 5 Amriville KW 36 Unterhalt KW 50 Werkhof KW 33 Werkhof KW 21 Unterhalt KW 11 Dänkfabrik
 Mit Inv Neu 
Markiert
 Mit Inv Neu 
Markiert
 Mit Inv Neu 
Markiert Reperatur Mit Inv Neu 
Markiert
 Mit Inv Neu 
Markiert
 Mit Inv Neu 
Markiert
 Mit Inv Neu 
Markiert
 Mit Inv Neu 
Markiert
Mit InvNr Neu 
Markiert
16 17 21 22 24 25 28 29 30 31
Scherenbühne elekr. Scherenbühne elekr. Teleskop Bühne Diesel/El Scherenbühne elekr. Scherenbühne elekr. Teleskopbühne Diesel Teleskop-Gelenkbühne Teleskop-Gelenkbühne Scherenbühne elekr. Teleskopbühne
Inv.-Nr.: 4010 16 Inv.-Nr.: 4010 17 Inv.-Nr.: 4010 21 Inv.-Nr.: 4010 22 Inv.-Nr.: 4010 24 Inv.-Nr.: 4010 25 Inv.-Nr.: 4010 28 Inv.-Nr.: 4010 29 Inv.-Nr.: 4010 30 Inv.-Nr.: 4010 31
==End of OCR for page 2==
==Start of OCR for page 3==
Baumaschinenstandorte Aktualisiert : 17.02.2026
Fabrikat: Haulotte Fabrikat: Genie Fabrikat: Haulotte Fabrikat: Upright Fabrikat: Upright Fabrikat: Snorkel Fabrikat: Aichi Fabrikat: Aichi Fabrikat: Aichi Fabrikat: Aichi 
Typ: HA SPX 18 Typ: S65 Typ: H 18 SX Typ: TM 12 Typ: TM 12 Typ: AB60JRT Typ: RM 040 Typ: RM 040 Typ: RM 040 Typ: RM 040
Serien-No.: AD109673 Serien-No.: S 6008-18310 Serien-No.: CD 114707 Serien-No.: 52213 Serien-No.: 52217 Serien-No.: MY07001 Serien-No.: 676 976 Serien-No.: 676 540 Serien-No.: 676 945 Serien-No.: 676 938
Farbe: Blau Farbe: Blau/Grau Farbe: Gelb Farbe: Blau Farbe: Blau Farbe: Weiss/Orange Farbe: Blau Farbe: Blau Farbe: Blau Farbe: Blau
Plattform: 15.30 Plattform: 20.00 Plattform: 16.00 Plattform: 3.70 Plattform: 3.70 Plattform: 18.3m Plattform: 4.00 Plattform: 4.00 Plattform: 4.00 Plattform: 4.00
Masse: 7.60x2.20x2.26 Masse: 9.42x 2.49x 2.72 Masse: 4.12x2.25x2.96 Masse: 1.36 x0.76 x 1.70 Masse: Masse: 8.90x2.40x2.50 Masse: 1.45X 0.80x 1.85 Masse: 1.45X 0.80x 1.85 Masse: 1.45X 0.80x 1.85 Masse: 1.45X 0.80x 1.85
Leistung: 30.9 Leistung: 35.8 kW Leistung: 24 kW Leistung: Leistung: Leistung: Leistung: Leistung: Leistung: Leistung:
Gewicht: 7900 KG Gewicht: 10'102 kg Gewicht: 7300 kg Gewicht: 780 kg Gewicht: 780 kg Gewicht: 11'250 kg Gewicht: 850 kg Gewicht: 850 kg Gewicht: 850 kg Gewicht: 850 kg
Betriebst.: 2800 Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.:
Nutzlast: 232 kg Nutzlast: 220 kg Nutzlast: 500 kg Nutzlast: 220 kg Nutzlast: 220 kg Nutzlast: 227 kg Nutzlast: 200 kg Nutzlast: 200 kg Nutzlast: 200 kg Nutzlast: 200 kg
Antrieb: Diesel Antrieb: Diesel Antrieb: Diesel Antrieb: Elektro Antrieb: Elektro Antrieb: Diesel Antrieb: elektrisch Antrieb: elektrisch Antrieb: elektrisch Antrieb: elektrisch
Baujahr: 2005 Baujahr: 2008 Baujahr: 2008 Baujahr: 2008 Baujahr: 2008 Baujahr: 2007 Baujahr: Baujahr: Baujahr: Baujahr:
SpezHinweis: SpezHinweis:Allrad SpezHinweis:Allrad SpezHinweis: SpezHinweis: SpezHinweis: SpezHinweis:Raupen Weiss SpezHinweis:Raupen Weiss SpezHinweis:Raupen Weiss SpezHinweis: Raupen Weiss
Geprüft bis.03.2026 Geprüft bis 6.2024 Geprüft bis 01.2026 Geprüft bis 08.2025 Geprüft bis 01.2026 Geprüft bis 07.2025 Geprüft bis 11.2025 Geprüft Geprüft bis 02.2026 Geprüft bis 07.2024
Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft
Abgas wartung bis 03.2026 Abgas wartung bis 03.2026 Abgas wartung bis 03.2026 Abgas wartung
Abgas wartung
Abgas wartung bis 03.2026 Abgas wartung
Abgas wartung
Abgas wartung
Abgas wartung
Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle
KW 7 Unterhalt KW 12 Weinfelderstra
sse
KW 18 Stadthof Süd KW 5 Unterhalt KW 45 Werkhof KW 45 Landi 
Frauenfeld KW 48 Unterhalt KW 21 Unterhalt KW 35 Stutz KW 44 Mooi Biel
KW 24 Amriville KW 29 Unterhalt KW 28 Werkhof KW 6 Amriville KW 5 Amriville KW 7 Werkhof KW 8 Dänkfabrik KW 29 Clever fit 
Bachen-bülach KW 6 Amriville KW 9 Unterhalt
Mit InvNr Neu 
Markiert
 Mit Inv Neu 
Markiert Rümlang Mit InvNr Neu 
Markiert
 Mit Inv Neu 
Markiert
 Mit Inv Neu 
Markiert
 Mit Inv Neu 
Markiert
33 34 35 36 37 39 40 41 42 43
Gelenkteleskop Teleskopbühne Diesel Scherenbühne Vertikalmastbühne Vertikalmastbühne Teleskopbühne Diesel Scherenbühne elekr. Scherenbühne elekr. Scherenbühne elekr. Scherenbühne elekr.
Inv.-Nr.: 4010 33 Inv.-Nr.: 4010 34 Inv.-Nr.: 4010 35 Inv.-Nr.: 4010 36 Inv.-Nr.: 4010 37 Inv.-Nr.: 4010 39 Inv.-Nr.: 4010 40 Inv.-Nr.: 4010 41 Inv.-Nr.: 4010 42 Inv.-Nr.: 4010 43
==End of OCR for page 3==
==Start of OCR for page 4==
Baumaschinenstandorte Aktualisiert : 17.02.2026
Fabrikat: JLG Fabrikat: Upright Fabrikat: Upright Fabrikat: Tadano Fabrikat: Tadano Fabrikat: Tadano Fabrikat: Tadano
Typ: 41 AM Typ: TM 12 Typ: TM 12 Typ: AC-40-1-80102 Typ: AC-40-1-80102 Typ: AC-40-1-80102 Typ: AC-40-1-80102
Serien-No.: 900017351 Serien-No.: 51657 Serien-No.: 52359 Serien-No.: ZD-1933 Serien-No.: ZD-1925 Serien-No.: ZD-1943 Serien-No.: ZD-1882
Farbe: schwarz/silber Farbe: Blau Farbe: Blau Farbe: Hellblau Farbe: Hellblau Farbe: Hellblau Farbe: Hellblau
Plattform: 12.42 Plattform: 3.70 Plattform: 3.70 Plattform: 4.0 Plattform: 4.0 Plattform: 4.0 Plattform: 4.0
Masse: 1.46X 0.74X 1.96 Masse: 1.36 x0.76 x 1.70 Masse: 1.36 x0.76 x 1.70 Masse: 1.3x0.78x1.76 Masse: 1.3x0.78x1.76 Masse: 1.3x0.78x1.76 Masse: 1.3x0.78x1.76
Leistung: Leistung: Leistung: Leistung: Leistung: Leistung: Leistung:
Gewicht: 550 kg Gewicht: 780 kg Gewicht: 780 kg Gewicht: 700 kg Gewicht: 700 kg Gewicht: 700 kg Gewicht: 700 kg
Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.:
Nutzlast: 135 kg Nutzlast: 220 kg Nutzlast: 220 kg Nutzlast: 150 kg Nutzlast: 150 kg Nutzlast: 150 kg Nutzlast: 150 kg
Antrieb: elektrisch Antrieb: Elektro Antrieb: Elektro Antrieb: Elektro Antrieb: Elektro Antrieb: Elektro Antrieb: Elektro
Baujahr: 2002 Baujahr: 2007 Baujahr: 2008 Baujahr: 2004 Baujahr: 2004 Baujahr: 2004 Baujahr: 2004
SpezHinweis: SpezHinweis: SpezHinweis: SpezHinweis: SpezHinweis: SpezHinweis: SpezHinweis:
Geprüft bis 09.2025 Geprüft bis 08.2025 Geprüft bis 06.2026 Geprüft bis 6.2026 Geprüft bis 2.2026 Geprüft Geprüft bis 08.2025
Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft
Abgas wartung
Abgas wartung
Abgas wartung
Abgas wartung
Abgas wartung
Abgas wartung
Abgas wartung
Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle
KW 38 Stadthof Süd KW 10 Unterhalt KW 21 Unterhalt KW 25 Joga Med KW 4 Unterhalt KW 25 Unterhalt KW 20 Unterhalt
KW 39 Werkhof KW 12 Amriville KW 29 Bachen
bülach KW 26 Unterhalt KW 5 Amriville KW 8 Dänkfabrik KW 24 Amriville
44 45 46 47 48 50 51
Vertikalmastbühne Vertikalmastbühne Vertikalmastbühne Vertikalmastbühne Vertikalmastbühne Vertikalmastbühne Vertikalmastbühne
Inv.-Nr.: 4010 44 Inv.-Nr.: 4010 45 Inv.-Nr.: 4010 46 Inv.-Nr. 4010 47 Inv.-Nr. 4010 48 Inv.-Nr. 4010 50 Inv.-Nr. 4010 51
==End of OCR for page 4==
==Start of OCR for page 5==
Baumaschinenstandorte Aktualisiert : 17.02.2026
Fabrikat: Haulotte Fabrikat: Genie Fabrikat: Genie Fabrikat: Genie Fabrikat: Genie Fabrikat: Mauermat Fabrikat: Mauermat Fabrikat: Yanmar
Typ: Star 10 Typ: GS2646 Typ: GS1932 Typ: GS1932 Typ: GS1932 Typ: Typ: Typ: Ruki 1200
Serien-No.: 2072367 Serien-No.: GS4615C-15417 Serien-No.: Serien-No.: GS3009C-1853 Serien-No.: Serien-No.: CRMCMF12JLOL00229
Farbe: gelb Farbe: Blau Farbe: blau Farbe: blau Farbe: blau Farbe: grau Farbe: grau Farbe: weiss schwarz
Plattform: 8.00 Plattform: 7.80 Plattform: 5.80 Plattform: 5.80 Plattform: 5.80 Ausladung Ausladung Plattform:
Masse: 2.62x0.99x1.99 Masse: 2.26x 1.17x 2.26 Masse: Masse: Masse: Hakenhöhe Hakenhöhe Masse: 2.25x0.86x1.37m
Leistung: Leistung: Leistung: Leistung: Leistung: Leistung: Leistung: Leistung:
Gewicht: 2735 kg Gewicht: 2447kg Gewicht: 1503 Gewicht: 1503 Gewicht: 1503 Gewicht: 1030 kg Gewicht: 1030 kg Gewicht: 1'035 kg 
Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.:
Nutzlast: 200 kg Nutzlast: Nutzlast: 220 kg Nutzlast: 220 kg Nutzlast: 220 kg Nutzlast: 2500 kg Nutzlast: 2500 kg Nutzlast: 1'200kg
Antrieb: elektrisch Antrieb: elektrisch Antrieb: Antrieb: Antrieb: Antrieb: Antrieb: Antrieb:
Baujahr: 2019 Baujahr: 2015 Baujahr: 2009 Baujahr: 2009 Baujahr: 2009 Baujahr: 2018 Baujahr: 2018 Baujahr: 2020
SpezHinweis:Weissrad SpezHinweis:Weissrad SpezHinweis: Weissrad SpezHinweis:Weissrad SpezHinweis: Weissrad SpezHinweis: SpezHinweis: SpezHinweis:
Geprüft bis 07.2026 Geprüft bis 08.2025 Geprüft bis 06.2026 Geprüft bis 07.2026 Geprüft bis 06.2026 Geprüft bis 02.2026 Geprüft bis 02.2026 Geprüft bis 300h o. 2027
Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft
Abgas wartung
Abgas wartung Abgas-wartung Abgas wartung
Abgas wartung
Abgas wartung
Abgas wartung
Abgas wartung
Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle
KW 40 Burri 
Glattbrugg KW 39 Burri 
Glattbrugg KW 17 Unterhalt KW 17 Willi 
Wittenbach KW 20 Unterhalt KW 1 Weinfelderstra
sse
KW 1 Weinfelderstra
sse
KW 40 Wagner Pool
KW 25 Unterhalt KW 39 Unterhalt KW 26 Horn Hotel
Schiff KW 21 Unterhalt KW 25 Amriville KW 6 Werkhof KW 6 Werkhof KW 46 Werkhof
52 53 54 55 56 06 07 01
Vertikalmastbühne Scherenbühne elekr. Scherenbühne elekr. Scherenbühne elekr. Scherenbühne elekr. Mauerbühne Mauerbühne Raupendumper
Inv.-Nr.: 4010 52 Inv.-Nr.: 4010 53 Inv.-Nr.: 4010 54 Inv.-Nr.: 4010 55 Inv.-Nr.: 4010 56 Inv.-Nr.: 4220 06 Inv. -Nr.: 4220 07 Inv.-Nr.: 5110 01
==End of OCR for page 5==
==Start of OCR for page 6==
Baumaschinenstandorte Aktualisiert : 17.02.2026
Fabrikat: Manitou Fabrikat: Wacker Neuson Fabrikat: Manitou Fabrikat: Wacker Neuson Fabrikat: Wacker Neuson Fabrikat: Wacker Neuson Fabrikat: Wacker Neuson
Typ: MT 1440EP Typ: TH412 Typ: MT 1840 ST4 Typ: TH412 Typ: TH412 Typ: TH412 Typ: TH412
Serien-No.: 125 000 2 Serien-No.: 3038445 Serien-No.: Serien-No.: 3041475 Serien-No.: 3040049 Serien-No.: 3038451 Serien-No.: 30401478
Farbe: Rot Farbe: gelb Farbe: Rot Farbe: gelb / grau Farbe: gelb / grau Farbe: gelb / grau Farbe: gelb / grau
Kennzeichen TG 2265 Kennzeichen TG 4684 Kennzeichen TG 2272 KennzeichenTG 2511 KennzeichenTG 2793 KennzeichenTG 2852 KennzeichenTG 2500
Masse: 7.33x2.64x3.79 Masse: 3.88x1.56x1.94 Masse: 6.27x2.40x 2.50 Masse: 3.88x1.56x1.94 Masse: 3.88x1.56x1.94 Masse: 3.88x1.56x1.94 Masse: 3.88x1.56x1.94
Leistung: Leistung: 29.6 Kw Leistung: Leistung: 29.9 Leistung: 29.9 Leistung: 29.9 Leistung: 29.9
Gewicht: 10'800 kg Gewicht: 2700 kg Gewicht: 11380 kg Gewicht: 2700 kg Gewicht: 2700 kg Gewicht: 2700 kg Gewicht: 2700 kg
Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.:
Nutzlast: 4000 kg Nutzlast: 1200 kg Nutzlast: 4000 kg Nutzlast: 1200 kg Nutzlast: 1200 kg Nutzlast: 1200 kg Nutzlast: 1200 kg
Antrieb: Antrieb: Diesel Antrieb: Antrieb: Diesel Antrieb: Diesel Antrieb: Diesel Antrieb: Diesel
Baujahr: 2008 Baujahr: 2016 Baujahr: 2008 Baujahr: 2017 Baujahr: 2016 Baujahr: 2016 Baujahr: 2017
SpezHinweis: Russpartikelfilter SpezHinweis:Russpartikelfilter SpezHinweis:Russpartikelfilter SpezHinweis:Russpartikelfilter SpezHinweis:Russpartikelfilter SpezHinweis:Russpartikelfilter SpezHinweis:Russpartikelfilter
Geprüft Bis 05.2025 Geprüft Geprüft SP 10.2025
Service 2500h Geprüft bis 01.10.2022 Geprüft bis 01.2022 Geprüft bis 07.2022 Geprüft bis 08.2025
Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft
Abgas wartung bis 03.2026 Abgas wartung bis 03.2026 Abgas wartung bis 03.2026 Abgas wartung bis 03.2026 Abgas wartung bis 03.2026 Abgas wartung bis 03.2026 Abgas wartung bis 03.2026
Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle
KW 50 Dänkfabrik KW 4 Unterhalt KW 12 Unterhalt KW 21 Joga Med 
Altnau KW 19 Casa Alberti 
Davos KW 19 Unterhalt KW 40 Burri 
Glattbrugg
KW 13 Werkhof KW 11 Amriville KW 33 Amriville KW 25 Unterhalt KW 24 Unterhalt KW 28 Bachen-bülach KW 20 Unterhalt
02 03 04 05 06 07 08 
Teleskop Frontlader Teleskop Frontlader Teleskop Frontlader Teleskop Frontlader Teleskop Frontlader Teleskop Frontlader Teleskop Frontlader
Inv.-Nr.: 5230 02 Inv.-Nr.: 5230 03 Inv.-Nr.: 5230 04 Inv.-Nr.: 5230 05 Inv.-Nr.: 5230 06 Inv.-Nr.: 5230 07 Inv.- Nr.: 5230 08
==End of OCR for page 6==
==Start of OCR for page 7==
Baumaschinenstandorte Aktualisiert : 17.02.2026
Fabrikat: Wacker Neuson Fabrikat: Wacker Neuson Fabrikat: Takeuchi Fabrikat: Wacker Neuson Fabrikat: Takeuchi Fabrikat: Hoeflon Fabrikat: Hoeflon Fabrikat: Liebherr Fabrikat: Spierings
Typ: TH412 Typ: WL20e Typ: TB 210 R Typ: EZ 28 Typ: TB 250 Typ: C6 Typ: C10 Typ: 63K Typ: SK 2400-R
Serien-No.: 3054705 Serien-No.: 3068455 Serien-No.: 211007561 Serien-No.: PAL00160 Serien-No.: 1250020112 Serien-No.: 03151224C6 Serien-No.: 20302099C10 Serien-No.: 16335514 S-Nr.: 2418014 2418-014
Farbe: gelb / grau Farbe: Gelb/Schwarz Farbe: grau/rot Farbe: gelb Farbe: grau Farbe: gelb Farbe: gelb Farbe: Gelb Farbe: orange
Kennzeichen TG 2899 Kennzeichen Plattform: Plattform: Plattform: Ausladung Ausladung Ausladung 43m Ausladung 42m (54 to)
Masse: 3.88x1.56x1.94 Masse: 3.69x1.08x2.35 Masse: 3.175x0.75x2.190 Masse: Masse: Hakenhöhe Hakenhöhe Hakenhöhe Hakenhöhe 56m (30° Ausleg)
Leistung: 29.9 Leistung: 6.5 kW Leistung: 8.8kW Leistung: Leistung: 29.5 Kw Leistung: Leistung: Leistung: Leistung:
Gewicht: 2700 kg Gewicht: 2400 kg Gewicht: 1210 kg Gewicht: 2883 kg Gewicht: 4965 kg Gewicht: 2800 kg Gewicht: 4700 Gewicht: Gewicht:
Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.: Reichw.:
Nutzlast: 1200 kg Nutzlast: 626 kg Nutzlast: Nutzlast: Nutzlast: Nutzlast: Nutzlast: Nutzlast: Nutzlast:
Antrieb: Diesel Antrieb: elektrisch Antrieb: Antrieb: Antrieb: Antrieb: Elektro / Diesel Antrieb: Elektro / Diesel Antrieb: Antrieb:
Baujahr: 2018 Baujahr: 2020 Baujahr: 2022 Baujahr: 2015 Baujahr: 2011 Baujahr: 2015 Baujahr: 2020 Baujahr: 1992 Baujahr: 2019
SpezHinweis:Russpartikelfilter SpezHinweis:Ladezeit ca. 6 h SpezHinweis: SpezHinweis: SpezHinweis: SpezHinweis: SpezHinweis: SpezHinweis:Untendreher SpezHinweis:
Geprüft bis 02.2021 Geprüft bis 12.2022 Geprüft bis 9.2023 Geprüft Geprüft Geprüft Suva 02.2029
Service 01.2026 Geprüft Suva 02.2028
Service 07.2026 Geprüft bis 04.2026 Geprüft Suva 06.2027
Service 06.2026
Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft Gekauft
Abgas wartung bis 03.2026 Abgas wartung keine Abgas wartung
Abgas wartung bis 03.2026 Abgas wartung bis 03.2026 Abgas wartung
Abgas wartung
Abgas wartung keine Abgas wartung AdBlue
Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle Datum Baustelle
KW 11 Eurobus 
Bassersdorf KW 51 Werkhof KW 13 Amriville KW 24 Brändli Chur KW 21 Joga Med 
Altnau KW 28 Stadthof Süd KW 28 Wädenswil KW 33 Interkran KW 15 Storz Medical
KW 13 Dänkfabrik 
Wädenswil KW 7 Amriville KW 29 Unterhalt KW 33 Werkhof KW 26 Werkhof KW 20 Outlook KW 20 Outlook KW 14 Lager 
Buschor KW 22 Dänkfabrik
09 10 01 03 04 02 03 03 08
Teleskop Frontlader Frontlader Kleinbagger Baggerlader Baggerlader Minikran C6 Minikran C10 Turm Drehkran Turmdrehkran
Inv.- Nr.: 5230 09 Inv-Nr.:5230 10 Inv.-Nr.: 5010 01 Inv.-Nr.: 5010 03 Inv.-Nr.: 5010 04 Inv.-Nr.: 3020 02 Inv.-Nr.: 3020 03 Inv.-Nr.: 3010 03 Inv.-Nr.: 3010 08
==End of OCR for page 7==
==Start of OCR for page 8==
09
Turmdrehkran
Inv.-Nr.: 3010 09
Baustelle
Landi Frauenfeld
==End of OCR for page 8==
`.trim();

async function importMachines() {
    console.log('Starting machine import...');

    // 1. Delete existing collection
    try {
        await client.deleteCollection('fahrzeuge');
        console.log('Deleted vehicles collection');
    } catch (e) {
        console.log('Collection probably didnt exist');
    }

    try {
        await client.createCollection('fahrzeuge', {
            vectors: {
                size: 768, // Default
                distance: 'Cosine'
            }
        });
        console.log('Created vehicles collection');
    } catch (e) {
        console.error('Failed to create collection', e);
    }

    // 2. Parse OCR Data
    // We split by "==Start of OCR for page X=="
    const pages = RAW_OCR_DATA.split(/==Start of OCR for page \d+==/g).slice(1);

    let vehicles: any[] = [];

    pages.forEach((pageContent, pageIdx) => {
        // Extract all values for headers (Fabrikat, Typ, etc.)
        // Regex to find "Fabrikat: ... Fabrikat: ..." lines?
        // Actually, the structure matches visually:
        // Fabrikat: A Fabrikat: B
        // We can split the line by "Fabrikat:"

        // Helper to extract array from a line token
        const extractValues = (token: string, text: string) => {
            if (!text.includes(token)) return [];
            // Finds the line containing the token repeated?
            // Or just search all occurrences
            // Split text by token
            const parts = text.split(token);
            // First part is usually empty or preceding text. Remove it.
            return parts.slice(1).map(p => {
                // The value ends before the next token or end of line?
                // In the OCR, values are just concatenated?
                // "Genie Fabrikat: Genie" 
                // Wait, "Fabrikat: Genie Fabrikat: Genie" -> split "Fabrikat:" -> ["", " Genie ", " Genie"]
                // But look at "Typ: GS-3246 Typ: GS 2646" -> split "Typ:" -> ["", " GS-3246 ", " GS 2646"]
                // But the OCR might have newlines!
                // "Genie \nFabrikat: Genie"
                // The pasted OCR string has newlines.
                // I should process line by line?
                // No, the OCR puts them in one line/block usually?
                // Let's assume the string I pasted preserves newlines.

                // Let's iterate lines and find one starting with token?
                // But "Fabrikat: " repeats in the line.
                // So split is good, but I need to stop before the next property line?
                // A value is "Genie ". It doesn't contain "Typ:".
                // So trimming should work.

                // Truncate at newline?
                const val = p.split('\n')[0].trim();
                return val;
            });
        };

        const fabrikatList = extractValues('Fabrikat:', pageContent);
        const typList = extractValues('Typ:', pageContent);
        const snList = extractValues('Serien-No.:', pageContent);
        // ... Only map critical fields.

        // The most important is Inv.-Nr. and Category, which are at the BOTTOM of the page in OCR usually?
        // Page 1: "01 02... 15 \n Scherenbühne ... \n Inv.-Nr.: 4010 01 ..."

        const invList = extractValues('Inv.-Nr.:', pageContent);
        const invNrListLong = extractValues('Inv.- Nr.:', pageContent); // Typo handling
        const finalInvList = [...invList, ...invNrListLong];

        // Categories extraction:
        // The line above InvNr contains categories.
        // We need to match InvNr to Category.
        // OCR output order:
        // "Scherenbühne ... Teleskopbühne Diesel/El"
        // "Inv.-Nr.: 4010 01 Inv.-Nr.: 4010 02 ..."
        // Since both are in the same block order (left-to-right), index i of inv matches index i of category?
        // BUT, extracting categories is hard because they are not prefixed.
        // "Scherenbühne Scherenbühne Scherenbühne" -> split by space? NO. "Scherenbühne elekr."

        // Attempt: Find the line containing "Inv.-Nr.:". The line ABOVE it is categories.
        // Split page into lines.
        const lines = pageContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Find line index with "Inv.-Nr.:" (or most of them)
        const invLineIndices = lines.map((l, i) => l.includes('Inv.-Nr.') ? i : -1).filter(i => i !== -1);

        // Usually the OCR puts the inventory block at the bottom (lines... then InvNr...)
        // Let's iterate found InvNrs.

        // We have `finalInvList` values (e.g. "4010 01").
        // We have `fabrikatList` values.
        // There is a risk of misalignment if OCR missed a column.
        // But let's assume valid PDF.

        // Category Mappings
        const catMap: Record<string, string> = {
            'Scherenbühne': 'scherenbuehne',
            'Scherenbühne elekr.': 'scherenbuehne',
            'Teleskopbühne': 'teleskopbuehne',
            'Teleskopbühne Diesel/El': 'teleskopbuehne',
            'Teleskop Bühne Diesel/El': 'teleskopbuehne',
            'Teleskopbühne Diesel': 'teleskopbuehne',
            'Teleskop-Gelenkbühne': 'teleskopbuehne',
            'Gelenkteleskop': 'teleskopbuehne',
            'Vertikalmastbühne': 'vertikalmastbuehne',
            'Mauerbühne': 'mauerbuehne',
            'Raupendumper': 'raupendumper',
            'Teleskop Frontlader': 'teleskop_frontlader',
            'Frontlader': 'teleskop_frontlader',
            'Kleinbagger': 'kleinbagger',
            'Baggerlader': 'baggerlader',
            'Minikran C6': 'minikran',
            'Minikran C10': 'minikran',
            'Turm Drehkran': 'turmdrehkran',
            'Turmdrehkran': 'turmdrehkran'
        };

        // If we can't extract specific category from text, use "sonstiges".
        // Use "Typ" to guess? Or try to extract the line above InvNr.

        // On Page 1, there is a line with "01 02 ...". The line BELOW it is Categories.
        // "Scherenbühne Scherenbühne ..."
        // It's just a space-separated list of strings?
        // "Scherenbühne Scherenbühne Scherenbühne Teleskopbühne Scherenbühne Scherenbühne Scherenbühne Teleskopbühne Diesel/El Scherenbühne elekr. Scherenbühne elekr."
        // "Scherenbühne" is one word. "Scherenbühne elekr." is two.
        // This is hard to split.

        // Workaround: We have "Inv.-Nr." like "4010 01".
        // In the PDF, Inv Nr is below "Scherenbühne".
        // Can we map ranges?
        // 4010 01 - 4010 03: Scherenbühne
        // 4010 04: Teleskop...
        // This is safe if I manually map the IDs from PDF reading.
        // But I want a generic script.

        // Just use "sonstiges" and "gruppe" = "Unknown" if fail?
        // Or better: Use "Typ" to infer.
        // GS-3246 -> Scherenbühne.
        // TH412 -> Teleskop Frontlader.

        // Actually, looking at the OCR, the header lines (Fabrikat, Typ...) are separate from the bottom "InvNr" block.
        // The OCR seemingly duplicated the data? Or is it Top vs Bottom?
        // Page 1 OCR has:
        // "Fabrikat: Genie..." (Top of page table)
        // ...
        // "Inv.-Nr.: 4010 01 ..." (Bottom of page schematic?)
        // Wait, the screenshot shows columns. The OCR output linearizes.
        // "Fabrikat: Genie Fabrikat: Genie..." (Top row).
        // It does NOT have "Inv.-Nr.:" at the top row.
        // The Inv-Nr is ONLY at the bottom of OCR block, or top?
        // Look at P1:
        // "Baumaschinenstandorte..."
        // "Fabrikat: Genie..."
        // It DOES NOT start with InvNr.
        // InvNr appears at the END of P1 OCR:
        // "01 02 ... 16"
        // "Scherenbühne ... Teleskopbühne..."
        // "Inv.-Nr.: 4010 01 ..."

        // So I have a list of Fabrikats (10 items) and a list of InvNrs (10 items) at the bottom.
        // I can assume they match index-wise!
        // Index 0 of Fabrikat = Index 0 of InvNr.

        // But how to get Category?
        // The category text is just above InvNr lines.
        // "Scherenbühne Scherenbühne Scherenbühne ..."
        // I can try to find this line.
        // Or simply map by ID ranges manually?
        // IDs are consistent: 4010, 5230, etc.
        // No, ranges are safer.

        // Wait, the "Typ" is very descriptive.
        // GS... -> Scherenbühne.
        // TH... -> Teleskop.
        // I'll leave `gruppe` empty or "Baumaschine" if parsing fails.
        // I'll try to extract "Scherenbühne" from the messy line?
        // No, I'll rely on a manual list of IDs from the PDF if I have to? No.

        // Let's just zip:
        // vehiclesP1 = zip(fabrikatList, typList, serList, ... invList)
        // Note: invList is at the bottom.
        // Need to ensure counts match.
        // Page 1: 10 columns.
        // Fabrikat repeats 10 times? "Fabrikat: " count = 10.
        // Inv.-Nr.: count = 10.
        // Perfect.

        const count = Math.min(fabrikatList.length, finalInvList.length);

        for (let i = 0; i < count; i++) {
            const invRaw = finalInvList[i]; // "4010 01"
            const invClean = invRaw.replace(/\s+/g, ' ').trim(); // "4010 01"
            const fabrikat = fabrikatList[i];
            const typ = typList[i];

            // Infer category/gruppe from Typ/Fabrikat or default
            let cat = 'baumaschine';
            let grp = 'Baumaschine';

            const t = (typ || '').toLowerCase();

            if (t.includes('gs') || t.includes('star') || t.includes('compact') || t.includes('ha spx') || t.includes('rm')) {
                cat = 'scherenbuehne';
                grp = 'Scherenbühne';
            }
            if (t.includes('th') || t.includes('mt')) {
                cat = 'teleskop_frontlader';
                grp = 'Teleskop Frontlader';
            }
            if (t.includes('tb') || t.includes('ez')) {
                cat = 'kleinbagger';
                grp = 'Kleinbagger';
            }
            // ... more heuristics

            // Create Object
            vehicles.push({
                id: uuidv4(),
                inventarnummer: invClean,
                bezeichnung: `${fabrikat} ${typ}`,
                kategorie: cat,
                gruppe: grp,
                fabrikat: fabrikat,
                typ: typ,
                status: 'verfuegbar', // Default
                // ... other fields from lists
            });
        }
    });

    // Upload
    if (vehicles.length > 0) {
        console.log(`Uploading ${vehicles.length} vehicles...`);
        await client.upsert('fahrzeuge', {
            points: vehicles.map(v => ({
                id: v.id,
                payload: v,
                vector: {}
            }))
        });
        console.log('Done.');
    }
}
importMachines();
