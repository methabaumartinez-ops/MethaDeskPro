'use client';
// src/components/shared/QrScanner.tsx
// Scanner QR usando html5-qrcode

import { useEffect, useRef, useState } from 'react';

interface QrScannerProps {
    onScan: (result: string) => void;
    onError?: (error: string) => void;
    label?: string;
    active?: boolean;
}

export default function QrScanner({ onScan, onError, label, active = true }: QrScannerProps) {
    const scannerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string>('');
    const [manualInput, setManualInput] = useState('');
    const [showManual, setShowManual] = useState(false);

    useEffect(() => {
        if (!active) return;

        const startScanner = async () => {
            try {
                const { Html5QrcodeScanner } = await import('html5-qrcode');
                const scannerId = `qr-scanner-${Math.random().toString(36).substr(2, 9)}`;
                if (containerRef.current) containerRef.current.id = scannerId;

                const scanner = new Html5QrcodeScanner(
                    scannerId,
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    false
                );

                scanner.render(
                    (decodedText: string) => {
                        onScan(decodedText);
                        setScanning(true);
                    },
                    (err: string) => {
                        if (!err.includes('No MultiFormat') && !err.includes('NotFoundException')) {
                            console.warn('QR Scan error:', err);
                        }
                    }
                );
                scannerRef.current = scanner;
            } catch (e: any) {
                const msg = 'Kamera nicht verfügbar. Bitte manuell eingeben.';
                setError(msg);
                setShowManual(true);
                onError?.(msg);
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(() => { });
            }
        };
    }, [active]);

    const handleManualSubmit = () => {
        if (manualInput.trim()) {
            onScan(manualInput.trim());
            setManualInput('');
        }
    };

    return (
        <div className="qr-scanner-wrapper">
            {label && <h4 className="qr-scanner-label">{label}</h4>}

            {error && <div className="alert alert-warning">{error}</div>}

            {!showManual && (
                <div ref={containerRef} className="qr-scanner-container" />
            )}

            <div className="qr-scanner-actions">
                <button
                    type="button"
                    onClick={() => setShowManual(!showManual)}
                    className="btn btn-ghost btn-sm"
                >
                    {showManual ? '📷 Kamera verwenden' : '⌨️ Manuell eingeben'}
                </button>
            </div>

            {showManual && (
                <div className="qr-manual-input">
                    <input
                        type="text"
                        value={manualInput}
                        onChange={e => setManualInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                        placeholder="QR-Code Inhalt eingeben..."
                        className="form-input"
                        autoFocus
                    />
                    <button onClick={handleManualSubmit} className="btn btn-primary btn-sm">
                        ✓ Bestätigen
                    </button>
                </div>
            )}
        </div>
    );
}
