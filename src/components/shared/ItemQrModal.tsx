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
            ${projectNumber || projectName ? `
                ${projectNumber ? `<text x="0" y="-11" font-family="Arial, sans-serif" font-weight="700" font-size="2.5px" text-anchor="middle" fill="#334155">${projectNumber}</text>` : ''}
                ${projectName ? `<text x="0" y="-7.5" font-family="Arial, sans-serif" font-weight="900" font-size="2.8px" text-anchor="middle" fill="#0f172a">${projectName}</text>` : ''}
            ` : ''}
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

        const svgMarkup = svgElement.outerHTML;

        // Build a single label card
        const labelHtml = `
            <div class="label">
                ${projectNumber ? `<div class="proj-num">${projectNumber}</div>` : ''}
                ${projectName ? `<div class="proj-name">${projectName}</div>` : ''}
                <div class="number">${subtitle}</div>
                <div class="name">${title}</div>
                <div class="qr">${svgMarkup}</div>
                <div class="brand">
                    <span class="b-m">METHA</span><span class="b-d">Desk</span><span class="b-p">pro</span>
                </div>
                <div class="count">${countLabel}: ${count}</div>
            </div>
        `;

        // Repeat 8 times for the grid
        const labels = Array(8).fill(labelHtml).join('\n');

        const printWindow = window.open('', '', 'width=800,height=1100');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Print Labels</title>
                        <style>
                            @page { size: A4; margin: 8mm; }
                            * { box-sizing: border-box; margin: 0; padding: 0; }
                            html, body { width: 100%; height: 100%; font-family: 'Arial', 'Helvetica', sans-serif; }
                            body {
                                display: grid;
                                grid-template-columns: 1fr 1fr;
                                grid-template-rows: repeat(4, 1fr);
                                gap: 4mm;
                                align-content: stretch;
                                height: calc(297mm - 16mm);
                                width: calc(210mm - 16mm);
                            }
                            .label {
                                border: 1.5px solid #e2e8f0;
                                border-radius: 12px;
                                padding: 6px 8px 5px;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                text-align: center;
                                overflow: hidden;
                                gap: 1px;
                            }
                            .proj-num {
                                font-size: 7px;
                                font-weight: 700;
                                color: #334155;
                                text-transform: uppercase;
                                letter-spacing: 1px;
                            }
                            .proj-name {
                                font-size: 8.5px;
                                font-weight: 900;
                                color: #0f172a;
                                letter-spacing: 0.3px;
                                margin-bottom: 1px;
                            }
                            .number {
                                font-size: 18px;
                                font-weight: 900;
                                color: #0f172a;
                                letter-spacing: -0.5px;
                                line-height: 1.1;
                            }
                            .name {
                                font-size: 10px;
                                font-weight: 700;
                                color: #64748b;
                                line-height: 1.2;
                                margin-bottom: 2px;
                                max-width: 100%;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                white-space: nowrap;
                            }
                            .qr { margin: 2px 0; }
                            .qr svg { width: 110px; height: 110px; }
                            .brand {
                                display: flex;
                                align-items: baseline;
                                gap: 0px;
                                margin-top: 1px;
                            }
                            .b-m { color: #1e293b; font-weight: 900; font-size: 11px; letter-spacing: -0.5px; }
                            .b-d { color: #F26A21; font-weight: 900; font-size: 11px; letter-spacing: -0.5px; }
                            .b-p { color: #94a3b8; font-weight: 300; font-size: 6px; margin-bottom: 3px; }
                            .count {
                                font-size: 7px;
                                color: #334155;
                                font-weight: 700;
                            }
                        </style>
                    </head>
                    <body>
                        ${labels}
                        <script>window.onload=()=>{setTimeout(()=>{window.print();window.close();},500);};<\/script>
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
                    {projectNumber && (
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-[0.2em] mb-0.5">{projectNumber}</span>
                    )}
                    {projectName && (
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tight mb-1">{projectName}</span>
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
