'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Printer, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ItemQrModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle: string;
    qrValue: string;
    countLabel: string;
    count: number;
    filePrefix: string;
    id: string;
}

export function ItemQrModal({
    isOpen,
    onClose,
    title,
    subtitle,
    qrValue,
    countLabel,
    count,
    filePrefix,
    id
}: ItemQrModalProps) {
    if (!isOpen) return null;

    const handleDownload = () => {
        const svg = document.querySelector('#item-qr-container svg') as SVGElement;
        if (!svg) return;
        const svgClone = svg.cloneNode(true) as SVGElement;
        svgClone.setAttribute('width', '1000');
        svgClone.setAttribute('height', '1050');
        svgClone.setAttribute('viewBox', '0 0 220 230');

        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svgClone);
        const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filePrefix}_${id}.svg`;
        link.click();
    };

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=600,height=800');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;background:#fff;">
                        <div style="padding:40px;border:4px solid #f1f5f9;border-radius:40px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.05);">
                            <h1 style="margin:0 0 5px 0;font-size:24px;color:#0f172a;font-weight:900;">${title}</h1>
                            <p style="margin:0 0 30px 0;font-size:14px;color:#64748b;font-bold;letter-spacing:0.1em;text-transform:uppercase;">${subtitle}</p>
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrValue)}" style="width:300px;height:300px;margin-bottom:30px;" />
                            <p style="margin:0 0 30px 0;font-size:16px;color:#334155;font-weight:bold;">${countLabel}: ${count}</p>
                        </div>
                        <script>window.onload=()=>{window.print();window.close();};</script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({ title, url: qrValue });
        } else {
            navigator.clipboard.writeText(qrValue);
            alert('Link kopiert!');
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl border-2 border-primary/20 p-8 flex flex-col items-center gap-6 animate-in zoom-in slide-in-from-bottom-4 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 leading-tight px-4">{title}</h2>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                        {subtitle}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border-4 border-primary/10 shadow-inner group flex flex-col items-center gap-4">
                    <div id="item-qr-container">
                        <QRCodeSVG
                            value={qrValue}
                            size={220}
                            level="H"
                            className="drop-shadow-sm group-hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                </div>

                <div className="text-center pt-2">
                    <p className="text-sm font-bold text-slate-700">
                        {countLabel}: <span className="text-primary font-black">{count}</span>
                    </p>
                </div>

                <div className="flex gap-4 w-full justify-center">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-2xl border-2 hover:bg-primary hover:text-white transition-all hover:scale-110 active:scale-90 shadow-sm"
                        title="Download"
                        onClick={handleDownload}
                    >
                        <Download className="h-5 w-5" />
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-2xl border-2 hover:bg-primary hover:text-white transition-all hover:scale-110 active:scale-90 shadow-sm"
                        title="Print"
                        onClick={handlePrint}
                    >
                        <Printer className="h-5 w-5" />
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-2xl border-2 hover:bg-primary hover:text-white transition-all hover:scale-110 active:scale-90 shadow-sm"
                        title="Share"
                        onClick={handleShare}
                    >
                        <Share2 className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
