'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Maximize2, Minimize2, Layers, Video, ExternalLink, Focus, Ruler, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type MeshData = {
    positions: number[];
    normals: number[];
    indices: number[];
    r: number; g: number; b: number; a: number;
    transform: number[];
};

export function BimViewer({ modelName = 'IFC Modell', modelUrl }: { modelName?: string; modelUrl?: string }) {
    const mountRef = useRef<HTMLDivElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState<string | null>(modelUrl ? 'Initialisierung...' : null);
    const [error, setError] = useState<string | null>(null);
    const [isRotating, setIsRotating] = useState(true);

    // Measurement & Controls state
    const [isMeasuring, setIsMeasuring] = useState(false);
    const [measurementDistance, setMeasurementDistance] = useState<number | null>(null);

    // Refs for scene interaction
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const measurePointsRef = useRef<THREE.Vector3[]>([]);
    const measureMarkersRef = useRef<THREE.Object3D[]>([]);
    const measureLineRef = useRef<THREE.Line | null>(null);

    // Define center function for the button
    const centerModel = () => {
        if (!sceneRef.current || !cameraRef.current || !controlsRef.current) return;

        const box = new THREE.Box3().setFromObject(sceneRef.current);
        if (!box.isEmpty()) {
            const center = box.getCenter(new THREE.Vector3());
            const sz = box.getSize(new THREE.Vector3()).length();

            // Adjust to orthogonal-like fit view
            controlsRef.current.target.copy(center);
            cameraRef.current.position.set(center.x + sz * 0.5, center.y + sz * 0.3, center.z + sz * 0.5);
            cameraRef.current.near = Math.max(0.001, sz / 2000);
            cameraRef.current.far = sz * 20;
            cameraRef.current.updateProjectionMatrix();
            controlsRef.current.update();

            setIsRotating(false); // Stop rotation when manually centering
        }
    };

    const clearMeasurement = () => {
        if (!sceneRef.current) return;
        measureMarkersRef.current.forEach(m => sceneRef.current?.remove(m));
        if (measureLineRef.current) sceneRef.current.remove(measureLineRef.current);
        measureMarkersRef.current = [];
        measurePointsRef.current = [];
        measureLineRef.current = null;
        setMeasurementDistance(null);
    };

    useEffect(() => {
        if (!modelUrl || !mountRef.current) return;

        const container = mountRef.current;
        let destroyed = false;

        // ── Scene setup ────────────────────────────────────────────────────────
        const w = container.clientWidth || 600;
        const h = container.clientHeight || 400;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(w, h);
        renderer.setClearColor(0xf1f5f9);
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
        dirLight.position.set(10, 20, 10);
        scene.add(dirLight);

        const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 5000);
        camera.position.set(15, 15, 15);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;

        // Save refs for external functions
        sceneRef.current = scene;
        cameraRef.current = camera;
        controlsRef.current = controls;

        scene.add(new THREE.GridHelper(100, 50, 0xcccccc, 0xe2e8f0));

        const onResize = () => {
            if (!container) return;
            const W = container.clientWidth, H = container.clientHeight;
            renderer.setSize(W, H);
            camera.aspect = W / H;
            camera.updateProjectionMatrix();
        };

        // ── Raycaster for Measurement ──────────────────────────────────────────
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onPointerDown = (event: PointerEvent) => {
            if (!isMeasuring || !container) return;
            // Only left clicks
            if (event.button !== 0) return;

            const rect = container.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);

            // Intersect all meshes in scene (filtering out GridHelper/Lines)
            const meshes = scene.children.filter(c => c instanceof THREE.Mesh);
            const intersects = raycaster.intersectObjects(meshes, false);

            if (intersects.length > 0) {
                const point = intersects[0].point;

                // Add Marker
                const markerGeo = new THREE.SphereGeometry(0.1, 16, 16);
                const markerMat = new THREE.MeshBasicMaterial({ color: 0xff3300, depthTest: false });
                const marker = new THREE.Mesh(markerGeo, markerMat);
                marker.position.copy(point);
                marker.renderOrder = 999;
                scene.add(marker);

                measureMarkersRef.current.push(marker);
                measurePointsRef.current.push(point.clone());

                if (measurePointsRef.current.length === 2) {
                    const p1 = measurePointsRef.current[0];
                    const p2 = measurePointsRef.current[1];
                    const distance = p1.distanceTo(p2);
                    setMeasurementDistance(distance);

                    // Draw Line
                    const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                    const lineMat = new THREE.LineBasicMaterial({ color: 0xff3300, depthTest: false, linewidth: 2 });
                    const line = new THREE.Line(lineGeo, lineMat);
                    line.renderOrder = 998;
                    scene.add(line);
                    measureLineRef.current = line;

                    // Auto-disable measuring mode after a complete measurement
                    setIsMeasuring(false);
                }
            }
        };

        container.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('resize', onResize);
        renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

        // ── Fetch geometry JSON from server ────────────────────────────────────
        (async () => {
            try {
                setLoadingStatus('Modell wird verarbeitet...');
                const res = await fetch('/api/ifc-parse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: modelUrl }),
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                    throw new Error(err.error || `HTTP ${res.status}`);
                }

                const { meshes }: { meshes: MeshData[] } = await res.json();
                if (destroyed) return;

                setLoadingStatus('Geometrie wird aufgebaut...');

                for (const m of meshes) {
                    const geo = new THREE.BufferGeometry();
                    geo.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(m.positions), 3));
                    geo.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(m.normals), 3));
                    geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(m.indices), 1));

                    const mat = new THREE.MeshLambertMaterial({
                        color: new THREE.Color(m.r, m.g, m.b),
                        transparent: m.a < 1,
                        opacity: Math.max(m.a, 0.1),
                        side: THREE.DoubleSide,
                    });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.applyMatrix4(new THREE.Matrix4().fromArray(m.transform));
                    scene.add(mesh);
                }

                // Auto-fit camera
                const box = new THREE.Box3().setFromObject(scene);
                if (!box.isEmpty()) {
                    const center = box.getCenter(new THREE.Vector3());
                    const sz = box.getSize(new THREE.Vector3()).length();
                    controls.target.copy(center);
                    camera.position.set(center.x + sz * 0.5, center.y + sz * 0.3, center.z + sz * 0.5);
                    camera.near = Math.max(0.001, sz / 2000);
                    camera.far = sz * 20;
                    camera.updateProjectionMatrix();
                    controls.update();

                    // Adjust grid size to fit model roughly
                    scene.children.forEach(c => {
                        if (c instanceof THREE.GridHelper) {
                            scene.remove(c);
                        }
                    });
                    scene.add(new THREE.GridHelper(Math.max(100, sz * 2), 50, 0xcccccc, 0xe2e8f0));
                }

                if (!destroyed) setLoadingStatus(null);
            } catch (e: any) {
                if (!destroyed) setError(e.message || 'Unbekannter Fehler');
            }
        })();

        const resizeTimeout = setTimeout(onResize, 100);

        return () => {
            destroyed = true;
            clearTimeout(resizeTimeout);
            window.removeEventListener('resize', onResize);
            container.removeEventListener('pointerdown', onPointerDown);
            // Cleanup refs
            sceneRef.current = null;
            cameraRef.current = null;
            controlsRef.current = null;
            renderer.setAnimationLoop(null);
            renderer.dispose();
            if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modelUrl, isMeasuring]); // Rebind pointerdown if isMeasuring changes

    // Force resize calculation when expansion state toggles
    useEffect(() => {
        const timer = setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 310); // slightly more than the duration-300 transition
        return () => clearTimeout(timer);
    }, [isExpanded]);

    return (
        <div className={isExpanded
            ? 'fixed inset-0 z-[100] bg-background p-4 flex items-center justify-center animate-in fade-in zoom-in duration-300'
            : 'h-full w-full relative'}>
            <Card className={`h-full w-full bg-white shadow-xl overflow-hidden relative group ${isExpanded ? 'rounded-none' : ''}`}>

                {/* Toolbar */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                    <Button variant="secondary" size="icon"
                        className={`h-8 w-8 ${isRotating ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        onClick={() => setIsRotating(r => !r)}
                        title="Auto-Rotation">
                        <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon"
                        className="h-8 w-8 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        onClick={centerModel}
                        title="Modell zentrieren">
                        <Focus className="h-4 w-4" />
                    </Button>

                    <div className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800 my-0.5" />

                    <Button variant="secondary" size="icon"
                        className={`h-8 w-8 ${isMeasuring ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        onClick={() => {
                            if (!isMeasuring && measurePointsRef.current.length === 2) {
                                clearMeasurement(); // Clear old measurement if starting new
                            }
                            setIsMeasuring(m => !m);
                            setIsRotating(false); // Stop rotation while measuring
                        }}
                        title="Distanz messen">
                        <Ruler className="h-4 w-4" />
                    </Button>

                    {measurementDistance !== null && (
                        <div className="bg-white dark:bg-card px-3 py-2 rounded-lg shadow-lg border-2 border-orange-500 flex flex-col items-center gap-1 animate-in slide-in-from-left-4 fade-in">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400">Distanz</span>
                            <span className="font-mono font-black text-orange-500">
                                {measurementDistance < 1 ? (measurementDistance * 1000).toFixed(0) + ' mm' : measurementDistance.toFixed(3) + ' m'}
                            </span>
                            <Button variant="ghost" size="sm" className="h-5 text-[10px] w-full mt-1 text-slate-500 hover:text-red-600 p-0" onClick={clearMeasurement}>
                                Löschen
                            </Button>
                        </div>
                    )}
                </div>

                <div className="absolute top-4 right-4 z-10 flex gap-1">
                    <Button variant="secondary" size="icon"
                        className="h-8 w-8 bg-slate-100 text-slate-600 hover:bg-slate-200"
                        onClick={() => setIsExpanded(e => !e)}
                        title={isExpanded ? 'Verkleinern' : 'Vollbild'}>
                        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                    {modelUrl && (
                        <Button variant="secondary" size="icon"
                            className="h-8 w-8 bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 border border-blue-200 dark:border-slate-700"
                            onClick={() => window.open(modelUrl, '_blank')}
                            title="In Google Drive öffnen">
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <CardContent className="h-full p-0 relative bg-slate-50/50 dark:bg-card">
                    {modelUrl ? (
                        <>
                            <div ref={mountRef} className="w-full h-full" />

                            {/* Loading overlay */}
                            {loadingStatus && !error && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/95 dark:bg-slate-950/95 z-10">
                                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                                    <h3 className="text-sm font-black text-slate-800 mb-1">IFC Modell wird geladen</h3>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{loadingStatus}</p>
                                </div>
                            )}

                            {/* Error overlay */}
                            {error && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/95 dark:bg-slate-950/95 z-10 px-8">
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-w-sm text-center">
                                        <p className="text-sm font-bold text-red-700 mb-2">Fehler beim Laden</p>
                                        <p className="text-xs text-red-600">{error}</p>
                                        <Button variant="outline" size="sm" className="mt-3 text-xs"
                                            onClick={() => window.open(modelUrl, '_blank')}>
                                            In Google Drive öffnen
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* No model placeholder */
                        <div className="flex flex-col items-center justify-center w-full h-full relative overflow-hidden">
                            <div className="relative mb-6">
                                <div className={`absolute inset-0 bg-primary/15 rounded-full blur-2xl ${isRotating ? 'animate-pulse scale-150' : ''}`} />
                                <div className={`relative w-40 h-40 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center bg-white/50 ${isRotating ? 'animate-spin' : ''}`}
                                    style={{ animationDuration: '10s' }}>
                                    <Layers className="h-16 w-16 text-primary/40" />
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-1">{modelName}</h3>
                            <div className="h-1 w-12 bg-primary/30 mx-auto mb-3 rounded-full" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Kein 3D-Modell hinterlegt</p>
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#00000003_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
                        </div>
                    )}
                </CardContent>

                {/* Footer */}
                <div className="absolute bottom-0 inset-x-0 p-3 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-border flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 z-10">
                    <div className="flex items-center gap-4">
                        <span>Vers. 2.4.1</span>
                        <span>LOD 300</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${loadingStatus && !error ? 'bg-orange-500 animate-pulse' : error ? 'bg-red-500' : modelUrl ? 'bg-green-500' : 'bg-slate-400'}`} />
                        <span>{loadingStatus && !error ? 'LADEN' : error ? 'FEHLER' : modelUrl ? 'BEREIT' : 'LEER'}</span>
                    </div>
                </div>
            </Card>
        </div>
    );
}
