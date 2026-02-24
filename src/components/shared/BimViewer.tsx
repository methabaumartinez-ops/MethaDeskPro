import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Maximize2, Minimize2, Layers, Video, Share2, Settings, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BimViewer({ modelName = "IFC Modell", modelUrl }: { modelName?: string; modelUrl?: string }) {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [showLayers, setShowLayers] = React.useState(false);
    const [showSettings, setShowSettings] = React.useState(false);
    const [isRotating, setIsRotating] = React.useState(true);

    const toggleFullscreen = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className={isExpanded ? "fixed inset-0 z-50 bg-background p-4 flex items-center justify-center animate-in fade-in zoom-in duration-300" : "h-full w-full relative"}>
            <Card className={`h-full w-full bg-white shadow-xl overflow-hidden relative group ${isExpanded ? 'rounded-none' : ''}`}>

                {/* Toolbar */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                    <Button
                        variant="secondary"
                        size="icon"
                        className={`h-8 w-8 transition-all backdrop-blur-md ${showLayers ? 'bg-primary text-white hover:bg-primary/90' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        onClick={() => { setShowLayers(!showLayers); setShowSettings(false); }}
                        title="Ebenen"
                    >
                        <Layers className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className={`h-8 w-8 transition-all backdrop-blur-md ${isRotating ? 'bg-primary text-white hover:bg-primary/90' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        onClick={() => setIsRotating(!isRotating)}
                        title="Auto-Rotation"
                    >
                        <Video className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className={`h-8 w-8 transition-all backdrop-blur-md ${showSettings ? 'bg-primary text-white hover:bg-primary/90' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        onClick={() => { setShowSettings(!showSettings); setShowLayers(false); }}
                        title="Einstellungen"
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>

                <div className="absolute top-4 right-4 z-10">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-slate-100 text-slate-600 hover:bg-slate-200 backdrop-blur-md hover:scale-110 transition-transform"
                        onClick={toggleFullscreen}
                        title={isExpanded ? "Verkleinern" : "Vollbild"}
                    >
                        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                    {modelUrl && (
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 bg-slate-100 text-blue-600 hover:bg-blue-50 border border-blue-200 transition-all hover:scale-110"
                            onClick={() => window.open(modelUrl, '_blank')}
                            title="In neuem Tab öffnen (Garantierte Ansicht)"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Overlays */}
                {showLayers && (
                    <div className="absolute top-4 left-14 z-20 w-48 bg-white backdrop-blur-md text-slate-700 p-3 rounded-lg border-2 border-border animate-in fade-in slide-in-from-left-2 shadow-2xl">
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-primary">Sichtbare Ebenen</h4>
                        <div className="space-y-1">
                            {['Architektur', 'Tragwerk', 'Haustechnik', 'Möblierung'].map((layer, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs p-1 hover:bg-slate-50 rounded cursor-pointer">
                                    <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                    <span>{layer}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {showSettings && (
                    <div className="absolute top-24 left-14 z-20 w-48 bg-white backdrop-blur-md text-slate-700 p-3 rounded-lg border-2 border-border animate-in fade-in slide-in-from-left-2 shadow-2xl">
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-primary">Ansicht</h4>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded">
                                <span>Transparenz</span>
                                <span className="font-mono text-slate-400">50%</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded">
                                <span>Schatten</span>
                                <span className="text-green-400 font-bold">AN</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded">
                                <span>Gitter</span>
                                <span className="text-green-400 font-bold">AN</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <CardContent className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 p-0 relative bg-slate-50/50">
                    {modelUrl ? (
                        <div className="absolute inset-0 z-0 bg-white">
                            <iframe
                                src={(() => {
                                    if (modelUrl.includes('drive.google.com')) {
                                        const fileIdMatch = modelUrl.match(/\/d\/([a-zA-Z0-9-_]+)|id=([a-zA-Z0-9-_]+)/);
                                        const fileId = fileIdMatch ? (fileIdMatch[1] || fileIdMatch[2]) : null;
                                        if (fileId) {
                                            const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                                            const proxyUrl = `${window.location.origin}/api/image-proxy?url=${encodeURIComponent(directUrl)}`;
                                            // Using our local viewer implementation
                                            return `/ifc-viewer.html?model=${encodeURIComponent(proxyUrl)}`;
                                        }
                                    }
                                    return `/ifc-viewer.html?model=${encodeURIComponent(modelUrl)}`;
                                })()}
                                className="w-full h-full border-none"
                                title={modelName}
                                allow="autoplay; fullscreen"
                            />
                            {/* Protection overlay for interactions if needed */}
                            <div className="absolute bottom-12 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-[10px] bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-slate-500 border border-slate-200 shadow-sm">
                                    Motor: IFC.js Web Viewer
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="relative flex flex-col items-center justify-center w-full h-full animate-in fade-in duration-1000">
                            {/* Advanced Placeholder Design */}
                            <div className="relative group/icon mb-6">
                                <div className={`absolute inset-0 bg-primary/20 rounded-full blur-2xl transition-all duration-1000 ${isRotating ? 'animate-pulse scale-150' : 'scale-100'}`} />
                                <div className={`relative w-40 h-40 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center transition-all duration-1000 bg-white/50 backdrop-blur-sm shadow-inner ${isRotating ? 'rotate-180' : ''}`}>
                                    <Layers className={`h-16 w-16 text-primary/40 transition-transform duration-700 ${isRotating ? '-rotate-180 scale-110' : ''}`} />
                                </div>
                            </div>

                            <div className="text-center z-10 select-none px-6">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">{modelName}</h3>
                                <div className="h-1 w-12 bg-primary/30 mx-auto mb-4 rounded-full" />
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{isRotating ? 'System Scan Aktiv' : 'System Bereit'}</p>
                                <p className="text-xs text-slate-400 mt-2 max-w-[200px] leading-relaxed">
                                    {isExpanded ? 'ESC drücken zum Verkleinern' : 'Kein 3D-Modell für dieses System hinterlegt.'}
                                </p>
                            </div>

                            {/* Decorative Elements */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.03)_0%,transparent_70%)] pointer-events-none" />
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#00000003_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
                        </div>
                    )}
                </CardContent>

                {/* Footer info */}
                <div className="absolute bottom-0 inset-x-0 p-3 bg-slate-50/90 backdrop-blur-sm border-t border-border flex justify-between items-center text-[10px] text-slate-500">
                    <div className="flex items-center gap-4">
                        <span>Vers. 2.4.1</span>
                        <span>LOD 300</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${isRotating ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                        <span>{isRotating ? 'LIVE' : 'PAUSED'}</span>
                    </div>
                </div>
            </Card>
        </div>
    );
}
