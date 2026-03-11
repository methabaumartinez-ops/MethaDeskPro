import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Signature } from '@/components/shared/Signature';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <header className="px-6 py-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-xl">
            M
          </div>
          <span className="text-2xl font-black tracking-tighter text-slate-900">
            METHA<span className="text-primary">Desk</span> <span className="font-light text-slate-400 text-lg align-top">pro</span>
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-6xl mx-auto flex flex-col justify-center gap-4">
        {/* Hero Section - Compact */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Willkommen bei <span className="tracking-tighter">METHA<span className="text-primary">Desk</span> <span className="font-light text-slate-400 text-2xl align-top">pro</span></span>
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
            Die umfassende Plattform für die vollständige Kontrolle Ihrer Bauprojekte – von der Planung bis zur Ausführung.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/login">
              <Button className="font-bold px-8">Anmelden</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="font-bold px-8">Registrieren</Button>
            </Link>
          </div>
        </div>

        {/* Features Matrix - Very Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          {[
            { title: 'Projektmanagement', desc: 'Zentrale Steuerung aller Bauvorhaben und Datenexport.', icon: CheckCircle2 },
            { title: 'Teilsysteme & Produktion', desc: 'Abteilungsverwaltung und detaillierte Bearbeitung des Baustatus.', icon: Zap },
            { title: 'Logistik & Werkhof', desc: 'Materialbestellungen, QR-Codes und Lieferverfolgung.', icon: Zap },
            { title: 'Ausführung', desc: 'Arbeitsvorbereitung, Checklisten und Statusaktualisierungen.', icon: ShieldCheck },
            { title: 'Kostenerfassung', desc: 'Detaillierte Erfassung von Arbeitsstunden und Kosten pro Abteilung.', icon: CheckCircle2 },
            { title: 'Datenanalyse & Tabellen', desc: 'Umfangreiche Auswertungen und Kostenanalysen in Echtzeit.', icon: Zap },
            { title: 'BIM 3D Viewer', desc: 'Visualisierung und Prüfung von IFC-Modellen direkt im Browser.', icon: ShieldCheck },
            { title: 'Sicherheit & Rollen', desc: 'Rollenbasierter Zugriff und höchster Datenschutz.', icon: ShieldCheck },
          ].map((feature, i) => (
            <div key={i} className="p-3 bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center transition-all hover:border-primary hover:shadow-md group">
              <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center mb-2 group-hover:bg-primary/10 transition-colors">
                <feature.icon className="h-4 w-4 text-slate-500 group-hover:text-primary transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight group-hover:text-primary transition-colors">{feature.title}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight font-medium">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 py-3 flex flex-row items-center justify-between px-8 z-[60]">
        <Signature />
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider opacity-60">
          © {new Date().getFullYear()} METHABAU AG. v1.3
        </p>
      </footer>
    </div>
  );
}
