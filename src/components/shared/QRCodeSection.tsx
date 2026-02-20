'use client';

import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Printer, Share2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QRCodeSectionProps {
    url: string;
    title: string;
    subtitle?: string;
    compact?: boolean;
}

export function QRCodeSection({ url, title, subtitle, compact = false }: QRCodeSectionProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const windowUrl = window.location.href;
        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Imprimir QR - ${title}</title>
                    <style>
                        body { 
                            font-family: sans-serif; 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            justify-content: center; 
                            height: 100vh; 
                            margin: 0;
                            text-align: center;
                        }
                        .qr-container { padding: 40px; border: 2px solid #000; border-radius: 20px; }
                        h1 { margin-top: 20px; font-size: 24px; }
                        p { color: #666; margin-bottom: 20px; }
                        .url { font-size: 10px; color: #999; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="qr-container">
                        ${printContent.innerHTML}
                        <h1>${title}</h1>
                        ${subtitle ? `<p>${subtitle}</p>` : ''}
                        <div class="url">${url}</div>
                    </div>
                    <script>
                        window.onload = () => {
                            window.print();
                            window.close();
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Info: ${title}`,
                    url: url,
                });
            } catch (error) {
                console.log('Error sharing', error);
            }
        } else {
            console.log("Clipboard fallback for:", url);
            navigator.clipboard.writeText(url);
            alert('Link in die Zwischenablage kopiert!');
        }
    };

    if (compact) {
        return (
            <div className="flex items-center gap-4 bg-muted/30 p-2.5 rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors shadow-sm">
                <div ref={printRef} className="bg-white p-1.5 rounded-xl border border-border shadow-sm">
                    <QRCodeSVG
                        value={url}
                        size={80}
                        level="H"
                        includeMargin={false}
                    />
                </div>
                <div className="flex flex-col gap-1.5 pr-2">
                    <p className="text-[10px] font-black text-primary leading-none tracking-tighter uppercase mb-0.5 whitespace-nowrap">SCAN QR INFO</p>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-9 w-9 rounded-xl bg-background shadow-sm hover:scale-105 transition-transform"
                            onClick={handlePrint}
                            title="Drucken"
                        >
                            <Printer className="h-4 w-4 text-foreground" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-9 w-9 rounded-xl bg-background shadow-sm hover:scale-105 transition-transform"
                            onClick={handleShare}
                            title="Teilen"
                        >
                            <Share2 className="h-4 w-4 text-foreground" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Card className="shadow-sm border-2 border-border overflow-hidden">
            <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Share2 className="h-3 w-3" />
                    QR-Code & Sharing
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col items-center gap-3 text-center">
                <div ref={printRef} className="bg-white p-3 rounded-xl shadow-inner border border-border">
                    <QRCodeSVG
                        value={url}
                        size={120}
                        level="H"
                        includeMargin={false}
                    />
                </div>

                <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">Scannen für Info-Zugriff</p>
                    <p className="text-[9px] text-muted-foreground break-all max-w-[180px] leading-tight">{url}</p>
                </div>

                <div className="flex gap-2 w-full pt-1">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 font-bold text-[10px] h-8 px-2"
                        onClick={handlePrint}
                    >
                        <Printer className="h-3 w-3 mr-1.5" />
                        Drucken
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 font-bold text-[10px] h-8 px-2"
                        onClick={handleShare}
                    >
                        <Share2 className="h-3 w-3 mr-1.5" />
                        Teilen
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
