import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <header className="px-6 py-6 flex justify-between items-center border-b border-slate-100">
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
            { title: 'Projektmanagement', desc: 'Zentrale Steuerung aller Bauvorhaben und Datenexport.', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
            { title: 'Systeme & Teile', desc: 'Detaillierte Übersicht der Teilsysteme und des Baustatus.', icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50' },
            { title: 'Flottensteuerung', desc: 'Reservierung und Verwaltung von Maschinen und Fahrzeugen.', icon: Zap, color: 'text-green-600', bg: 'bg-green-50' },
            { title: 'Planung', desc: 'Überwachung von Terminen, Plänen und Lieferfristen.', icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
            { title: 'Baustellenpersonal', desc: 'Kontaktverzeichnis und Rollenverwaltung des Teams.', icon: CheckCircle2, color: 'text-cyan-600', bg: 'bg-cyan-50' },
            { title: 'KI-Assistent', desc: 'Intelligente Abfragen Ihrer Projektdaten in Echtzeit.', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { title: 'BIM 3D Viewer', desc: 'Visualisierung von IFC-Modellen direkt im Browser.', icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { title: 'Sicherheit & Rollen', desc: 'Rollenbasierter Zugriff und höchster Datenschutz.', icon: ShieldCheck, color: 'text-red-600', bg: 'bg-red-50' },
          ].map((feature, i) => (
            <div key={i} className={cn("p-3 rounded-xl border border-slate-100 flex flex-col items-center text-center transition-all hover:shadow-md", feature.bg)}>
              <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2">
                <feature.icon className={cn("h-4 w-4", feature.color)} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 leading-tight">{feature.title}</h3>
              <p className="text-[10px] text-slate-500 mt-1 leading-tight font-medium">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-4 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400 font-medium">
          © {new Date().getFullYear()} METHABAU AG. Alle Rechte vorbehalten.
        </p>
      </footer>
    </div>
  );
}
