'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, BarChart, ClipboardList } from 'lucide-react';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';

export default function BerichtePage() {
    const [activeTab, setActiveTab] = React.useState('planer');

    return (
        <div className="space-y-6">
            <ModuleActionBanner
                icon={FileText}
                title="Berichte"
            />

            <Tabs>
                <TabsList>
                    <TabsTrigger active={activeTab === 'planer'} onClick={() => setActiveTab('planer')}>Planer</TabsTrigger>
                    <TabsTrigger active={activeTab === 'produktion'} onClick={() => setActiveTab('produktion')}>Produktion</TabsTrigger>
                    <TabsTrigger active={activeTab === 'status'} onClick={() => setActiveTab('status')}>Projektstatus</TabsTrigger>
                </TabsList>

                <TabsContent active={activeTab === 'planer'}>
                    <Card className="py-20 flex flex-col items-center justify-center border-dashed">
                        <div className="h-16 w-16 rounded-2xl bg-muted text-muted-foreground/50 flex items-center justify-center mb-4">
                            <FileText className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-muted-foreground">Keine Planer-Berichte</h3>
                        <p className="text-sm text-muted-foreground mt-2">Diese Funktion wird im nächsten Release implementiert.</p>
                    </Card>
                </TabsContent>

                <TabsContent active={activeTab === 'produktion'}>
                    <Card className="py-20 flex flex-col items-center justify-center border-dashed">
                        <div className="h-16 w-16 rounded-2xl bg-muted text-muted-foreground/50 flex items-center justify-center mb-4">
                            <BarChart className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-muted-foreground">Produktionsübersicht</h3>
                        <p className="text-sm text-muted-foreground mt-2">Placeholder für Produktionskennzahlen.</p>
                    </Card>
                </TabsContent>

                <TabsContent active={activeTab === 'status'}>
                    <Card className="py-20 flex flex-col items-center justify-center border-dashed">
                        <div className="h-16 w-16 rounded-2xl bg-muted text-muted-foreground/50 flex items-center justify-center mb-4">
                            <ClipboardList className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-muted-foreground">Gesamtstatusbericht</h3>
                        <p className="text-sm text-muted-foreground mt-2">Detaillierte Auswertung aller Teilsysteme.</p>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
