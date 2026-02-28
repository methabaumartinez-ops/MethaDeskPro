'use client';
// src/components/shared/QrCodeGenerator.tsx
// Genera un QR code SVG en cliente usando la librería qrcode

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface QrCodeGeneratorProps {
    content: string;
    label?: string;
    size?: number;
    showDownload?: boolean;
    className?: string;
}

export default function QrCodeGenerator({ content, label, size = 200, showDownload = true, className }: QrCodeGeneratorProps) {
    const [qrSvg, setQrSvg] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function generateQr() {
            try {
                const QRCode = (await import('qrcode')).default;
                const svg = await QRCode.toString(content, { type: 'svg', width: size, margin: 2 });
                setQrSvg(svg);
            } catch (error) {
                console.error('QR generation error:', error);
            } finally {
                setLoading(false);
            }
        }
        generateQr();
    }, [content, size]);

    const handleDownload = () => {
        const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-${label || 'code'}.svg`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div style={{ width: size, height: size }} className="qr-loading">
                <div className="spinner-sm"></div>
            </div>
        );
    }

    return (
        <div
            style={{ width: size, height: size }}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
            className={cn("qr-svg-wrapper bg-white p-1 rounded-sm", className)}
        />
    );
}
