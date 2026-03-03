'use client';

import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

const LOGO_DATA_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 140 40'%3E%3Crect width='140' height='40' fill='white' rx='10'/%3E%3Ctext x='70' y='28' font-family='Arial, sans-serif' font-weight='900' font-size='20' text-anchor='middle'%3E%3Ctspan fill='%231e293b'%3EMETHA%3C/tspan%3E%3Ctspan fill='%23F26A21'%3EDesk%3C/tspan%3E%3Ctspan fill='%2394a3b8' font-size='10' font-weight='300' dy='-8'%3Epro%3C/tspan%3E%3C/text%3E%3C/svg%3E";

interface QrCodeGeneratorProps {
    content: string;
    label?: string;
    size?: number;
    showDownload?: boolean;
    className?: string;
}

export default function QrCodeGenerator({ content, label, size = 200, className }: QrCodeGeneratorProps) {
    return (
        <div className={cn("qr-svg-wrapper bg-white p-1 rounded-sm", className)}>
            <QRCodeSVG
                value={content}
                size={size}
                level="H"
                imageSettings={{
                    src: LOGO_DATA_URL,
                    height: size * 0.15,
                    width: size * 0.5,
                    excavate: true,
                }}
            />
        </div>
    );
}
