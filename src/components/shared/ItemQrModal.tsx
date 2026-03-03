'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Printer, Share2, Check, Package, Layers, FileText, ListTodo, Loader2, FileStack, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PositionService } from '@/lib/services/positionService';
import { SubPositionService } from '@/lib/services/subPositionService';
import { cn } from '@/lib/utils';

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
    projectNumber?: string;
    projectName?: string;
}

const LOGO_DATA_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 140 40'%3E%3Crect width='140' height='40' fill='white' rx='10'/%3E%3Ctext x='70' y='28' font-family='Arial, sans-serif' font-weight='900' font-size='20' text-anchor='middle'%3E%3Ctspan fill='%231e293b'%3EMETHA%3C/tspan%3E%3Ctspan fill='%23F26A21'%3EDesk%3C/tspan%3E%3Ctspan fill='%2394a3b8' font-size='10' font-weight='300' dy='-8'%3Epro%3C/tspan%3E%3C/text%3E%3C/svg%3E";

export function ItemQrModal({
    isOpen,
    onClose,
    title,
    subtitle,
    qrValue,
    countLabel,
    count,
    filePrefix,
    id,
    projectNumber,
    projectName
}: ItemQrModalProps) {
    if (!isOpen) return null;

    const handleDownload = () => {
        const svg = document.querySelector('#item-qr-container svg') as SVGElement;
        if (!svg) return;

        const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

        // Expand height and viewBox to fit the logo and text
        const originalViewBox = clonedSvg.getAttribute('viewBox') || '0 0 45 45';
        const vbValues = originalViewBox.split(' ').map(Number);

        // Add padding for header and footer in the exported SVG
        clonedSvg.setAttribute('width', '1000');
        clonedSvg.setAttribute('height', '1350');
        clonedSvg.setAttribute('viewBox', `${vbValues[0]} ${vbValues[1] - 22} ${vbValues[2]} ${vbValues[3] + 37}`);
        clonedSvg.setAttribute('style', 'background: white;');

        // Add Header (Number and Name) - Number larger than Name
        const headerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        headerGroup.setAttribute('transform', `translate(${vbValues[2] / 2}, ${vbValues[1] - 8})`);
        headerGroup.innerHTML = `
            ${projectNumber && projectName ? `<text x="0" y="-8" font-family="Arial, sans-serif" font-weight="400" font-size="2px" text-anchor="middle" fill="#94a3b8">${projectNumber} ${projectName}</text>` : ''}
            <text x="0" y="-4" font-family="Arial, sans-serif" font-weight="900" font-size="6px" text-anchor="middle" fill="#0f172a">${subtitle}</text>
            <text x="0" y="0" font-family="Arial, sans-serif" font-weight="700" font-size="3.5px" text-anchor="middle" fill="#64748b">${title}</text>
        `;
        clonedSvg.insertBefore(headerGroup, clonedSvg.firstChild);

        // Add Footer Logo Group
        const logoGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        logoGroup.setAttribute('transform', `translate(${vbValues[2] / 2}, ${vbValues[3] + 6})`);

        logoGroup.innerHTML = `
            <text x="0" y="2" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="4.5px" text-anchor="middle">
                <tspan fill="#1e293b">METHA</tspan><tspan fill="#F26A21">Desk</tspan><tspan fill="#94a3b8" font-size="2.5px" font-weight="100" dy="-1.5">pro</tspan>
            </text>
            <text x="0" y="7" font-family="Arial, sans-serif" font-weight="700" font-size="2px" text-anchor="middle" fill="#334155">${countLabel}: ${count}</text>
        `;
        clonedSvg.appendChild(logoGroup);

        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(clonedSvg);
        const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filePrefix}_${subtitle.replace(/\s+/g, '_')}_${id}.svg`;
        link.click();
    };

    const handlePrint = () => {
        const svgElement = document.querySelector('#item-qr-container svg');
        if (!svgElement) return;

        const printWindow = window.open('', '', 'width=600,height=800');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Print Label</title>
                        <style>
                            @page { size: auto; margin: 0mm; }
                            body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: sans-serif; background: #fff; }
                            .label-container { padding: 40px; border: 4px solid #f1f5f9; border-radius: 40px; text-align: center; width: 400px; background: white; }
                            .number { font-size: 58px; font-weight: 900; color: #0f172a; margin: 0 0 5px 0; letter-spacing: -2px; }
                            .name { font-size: 32px; font-weight: 700; color: #64748b; margin: 0 0 35px 0; line-height: 1.2; }
                            .project-info { font-size: 14px; font-weight: 400; color: #94a3b8; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px; }
                            .qr-container { margin-bottom: 35px; }
                            .qr-container svg { width: 350px; height: 350px; }
                            .brand { margin-top: 15px; display: flex; align-items: center; justify-content: center; gap: 4px; border-top: 2px solid #f8fafc; padding-top: 20px; }
                            .brand-metha { color: #1e293b; font-weight: 900; font-size: 36px; letter-spacing: -1.5px; }
                            .brand-desk { color: #F26A21; font-weight: 900; font-size: 36px; letter-spacing: -1.5px; }
                            .brand-pro { color: #94a3b8; font-weight: 300; font-size: 16px; margin-bottom: 12px; }
                            .footer-label { font-size: 18px; color: #334155; font-weight: bold; margin: 15px 0 0 0; }
                        </style>
                    </head>
                    <body>
                        <div class="label-container">
                            ${projectNumber && projectName ? `<div class="project-info">${projectNumber} ${projectName}</div>` : ''}
                            <div class="number">${subtitle}</div>
                            <div class="name">${title}</div>
                            <div class="qr-container">${svgElement.outerHTML}</div>
                            <div class="brand">
                                <span class="brand-metha">METHA</span><span class="brand-desk">Desk</span><span class="brand-pro">pro</span>
                            </div>
                            <p class="footer-label">${countLabel}: ${count}</p>
                        </div>
                        <script>window.onload=()=>{setTimeout(()=>{window.print();window.close();},500);};</script>
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
        <div className="fixed inset-0 z-[150] bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 flex items-center justify-center p-4">
            <div className="relative bg-white dark:bg-card w-full max-w-sm rounded-[2.5rem] shadow-2xl border-2 border-primary/20 p-8 flex flex-col items-center gap-6 animate-in zoom-in slide-in-from-bottom-4 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="text-center flex flex-col items-center">
                    {projectNumber && projectName && (
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{projectNumber} {projectName}</span>
                    )}
                    <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">{subtitle}</span>
                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight mt-0.5 px-4">{title}</h2>
                </div>

                {/* Main QR Area */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border-4 border-primary/10 shadow-inner group flex flex-col items-center gap-6">
                    <div id="item-qr-container">
                        <QRCodeSVG
                            value={qrValue}
                            size={200}
                            level="H"
                            className="drop-shadow-sm group-hover:scale-105 transition-transform duration-500"
                            imageSettings={{
                                src: LOGO_DATA_URL,
                                height: 30,
                                width: 100,
                                excavate: true,
                            }}
                        />
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 italic">
                        {countLabel}
                    </p>
                    <p className="text-3xl font-black text-primary leading-none tracking-tighter">
                        {count}
                    </p>
                </div>

                <div className="flex gap-4 w-full justify-center">
                    <button
                        className="h-12 w-12 rounded-2xl border-2 border-border bg-background flex items-center justify-center hover:bg-primary hover:text-white transition-all hover:scale-110 active:scale-90 shadow-sm"
                        title="Download"
                        onClick={handleDownload}
                    >
                        <Download className="h-5 w-5" />
                    </button>

                    <button
                        className="h-12 w-12 rounded-2xl border-2 border-border bg-background flex items-center justify-center hover:bg-primary hover:text-white transition-all hover:scale-110 active:scale-90 shadow-sm"
                        title="Print"
                        onClick={handlePrint}
                    >
                        <Printer className="h-5 w-5" />
                    </button>

                    <button
                        className="h-12 w-12 rounded-2xl border-2 border-border bg-background flex items-center justify-center hover:bg-primary hover:text-white transition-all hover:scale-110 active:scale-90 shadow-sm"
                        title="Share"
                        onClick={handleShare}
                    >
                        <Share2 className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
