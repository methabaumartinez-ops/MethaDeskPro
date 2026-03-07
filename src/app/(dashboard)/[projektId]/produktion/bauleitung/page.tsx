'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { Briefcase } from 'lucide-react';

export default function BauleitungPage() {
    const { projektId } = useParams() as { projektId: string };

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            <ModuleActionBanner
                icon={Briefcase}
                title="Bauleitung"
                backHref={`/${projektId}`}
            />

            <Card className="border-2 border-dashed rounded-2xl">
                <CardContent className="py-32 text-center flex flex-col items-center">
                    <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6 border-2 border-slate-200">
                        <Briefcase className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-2xl font-black text-foreground tracking-tight mb-2">Bauleitung</h3>
                    <p className="text-sm text-muted-foreground font-medium max-w-sm">
                        Dieser Bereich befindet sich im Aufbau. Bauleitung-Funktionen werden hier verfügbar sein.
                    </p>
                    <Button variant="outline" className="mt-8 font-black text-xs uppercase rounded-xl h-11 px-6 border-2" disabled>
                        Demnächst verfügbar
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
