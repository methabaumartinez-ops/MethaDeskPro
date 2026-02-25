'use client';
// src/components/shared/QrCodeGenerator.tsx
// Genera un QR code SVG en cliente usando la librería qrcode

import { useEffect, useState } from 'react';

interface QrCodeGeneratorProps {
    content: string;
    label?: string;
    size?: number;
    showDownload?: boolean;
}

export default function QrCodeGenerator({ content, label, size = 200, showDownload = true }: QrCodeGeneratorProps) {
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
        <div className="qr-container">
            <div
                style={{ width: size, height: size }}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
                className="qr-svg-wrapper"
            />
            {label && <p className="qr-label">{label}</p>}
            <p className="qr-content-text">{content}</p>
            {showDownload && qrSvg && (
                <button onClick={handleDownload} className="btn btn-secondary btn-sm">
                    ⬇ QR herunterladen
                </button>
            )}
        </div>
    );
}
