import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Maximize2, Minimize2, Layers, Video, Share2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BimViewer({ modelName = "IFC Modell" }: { modelName?: string }) {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [showLayers, setShowLayers] = React.useState(false);
    const [showSettings, setShowSettings] = React.useState(false);
    const [isRotating, setIsRotating] = React.useState(true);

    const toggleFullscreen = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className={isExpanded ? "fixed inset-0 z-50 bg-background p-4 flex items-center justify-center animate-in fade-in zoom-in duration-300" : "h-full w-full relative"}>
            <Card className={`h-full w-full bg-white border-2 border-border shadow-xl overflow-hidden relative group ${isExpanded ? 'rounded-none' : ''}`}>

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

                {/* Content (Placeholder) */}
                <CardContent className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 p-0">
                    <div className={`relative w-32 h-32 border-2 border-dashed border-slate-200 rounded-full transition-all duration-1000 ${isRotating ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
                    <div className="absolute">
                        <Share2 className="h-12 w-12 text-primary opacity-50" />
                    </div>
                    <div className="text-center z-10 select-none">
                        <h3 className="text-lg font-bold text-slate-700 mb-1">{modelName}</h3>
                        <p className="text-xs text-slate-400">Interaktiver 3D Viewer</p>
                        <p className="text-[10px] mt-2 text-slate-300">{isExpanded ? 'ESC zum Verlassen' : '(Klicken zum Laden)'}</p>
                    </div>

                    {/* Grid Overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                    {/* Background Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent opacity-80" />
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
