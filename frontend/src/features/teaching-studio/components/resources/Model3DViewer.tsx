import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Crosshair, EyeOff, Minus, Orbit, Pause, Play, Plus, RotateCcw, Scan, SlidersHorizontal } from 'lucide-react';
import { DEFAULT_MODEL_3D_SETTINGS, type Model3DSettings } from './model3DSettings';

interface Model3DViewerProps {
  src: string;
  alt: string;
  className?: string;
  mode?: 'preview' | 'canvas' | 'runtime';
  selected?: boolean;
  settings?: Model3DSettings;
  onSettingsChange?: (settings: Model3DSettings) => void;
}

type Vector3 = { x: number; y: number; z: number };
type CameraOrbit = { theta: number; phi: number; radius: number };
type SurfacePoint = { position: Vector3; normal: Vector3 };
type ModelMaterial = {
  pbrMetallicRoughness?: {
    baseColorFactor?: number[];
    baseColorTexture?: unknown;
  };
};
type ModelViewerElement = HTMLElement & {
  animationName: string;
  availableAnimations: string[];
  availableVariants?: string[];
  variantName?: string;
  currentTime: number;
  timeScale: number;
  cameraOrbit: string;
  cameraTarget: string;
  model?: { materials?: ModelMaterial[] };
  pause: () => void;
  play: (options?: { repetitions?: number }) => void;
  getCameraOrbit?: () => CameraOrbit;
  getCameraTarget?: () => Vector3;
  getFieldOfView?: () => number;
  jumpCameraToGoal?: () => void;
  positionAndNormalFromPoint?: (x: number, y: number) => SurfacePoint | null;
};

type OrbitDrag = { pointerId: number; x: number; y: number; orbit: CameraOrbit };
type PanDrag = { pointerId: number; x: number; y: number; target: Vector3; radius: number };
type GltfUriEntry = { uri?: string };

const POLY_HAVEN_GLTF = /\/Models\/gltf\/([^/]+)\/([^/]+)\/[^/?#]+\.gltf(?:[?#].*)?$/i;

const trustedPolyHavenUrl = (value: unknown) => {
  const parsed = new URL(String(value || ''));
  if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'dl.polyhaven.org') {
    throw new Error('Poly Haven returned an untrusted model dependency.');
  }
  return parsed.href;
};

const resolveModelSource = async (source: string, signal: AbortSignal) => {
  const parsedSource = new URL(source);
  if (parsedSource.hostname.toLowerCase() !== 'dl.polyhaven.org') return { url: source, revoke: false };
  const match = parsedSource.pathname.match(POLY_HAVEN_GLTF);
  if (!match) return { url: source, revoke: false };

  const [, resolution, assetId] = match;
  const [modelResponse, manifestResponse] = await Promise.all([
    fetch(source, { signal }),
    fetch(`https://api.polyhaven.com/files/${encodeURIComponent(assetId)}`, { signal }),
  ]);
  if (!modelResponse.ok || !manifestResponse.ok) {
    throw new Error('The Poly Haven model package could not be downloaded.');
  }
  const gltf = await modelResponse.json() as { images?: GltfUriEntry[]; buffers?: GltfUriEntry[] };
  const manifest = await manifestResponse.json() as Record<string, unknown>;
  const formats = manifest.gltf as Record<string, { gltf?: { include?: Record<string, { url?: string }> } }> | undefined;
  const include = formats?.[resolution]?.gltf?.include || formats?.['1k']?.gltf?.include || {};
  for (const dependency of [...(gltf.images || []), ...(gltf.buffers || [])]) {
    if (!dependency.uri || dependency.uri.startsWith('data:')) continue;
    const mapped = include[dependency.uri]?.url;
    dependency.uri = trustedPolyHavenUrl(mapped || new URL(dependency.uri, source).href);
  }
  const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(gltf)], { type: 'model/gltf+json' }));
  return { url: blobUrl, revoke: true };
};

const degrees = (radians: number) => Math.round((radians * 180 / Math.PI) * 10) / 10;
const vectorString = (vector: Vector3, unit = 'm') =>
  `${vector.x.toFixed(5)}${unit} ${vector.y.toFixed(5)}${unit} ${vector.z.toFixed(5)}${unit}`;
const orbitString = (orbit: CameraOrbit) =>
  `${degrees(orbit.theta)}deg ${degrees(orbit.phi)}deg ${orbit.radius.toFixed(4)}m`;

const missingMaterialMessage = (viewer: ModelViewerElement) => {
  const materials = viewer.model?.materials || [];
  if (!materials.length) return 'This model does not expose any renderable material. It may appear plain white.';
  const hasTexture = materials.some((material) => Boolean(material.pbrMetallicRoughness?.baseColorTexture));
  const factors = materials.flatMap((material) => {
    const factor = material.pbrMetallicRoughness?.baseColorFactor;
    return Array.isArray(factor) && factor.length >= 3 ? [factor] : [];
  });
  const hasColour = factors.some((factor) => {
    const channels = factor.slice(0, 3);
    return Math.max(...channels) - Math.min(...channels) > 0.08 || Math.min(...channels) < 0.78;
  });
  return !hasTexture && factors.length > 0 && !hasColour
    ? 'The source model appears to contain only white or neutral material. Use a coloured, textured GLB to reproduce a PowerPoint-quality object.'
    : '';
};

export default function Model3DViewer({
  src,
  alt,
  className = '',
  mode = 'preview',
  selected = false,
  settings = DEFAULT_MODEL_3D_SETTINGS,
  onSettingsChange,
}: Model3DViewerProps) {
  const [moduleReady, setModuleReady] = useState(false);
  const [renderSource, setRenderSource] = useState('');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [materialWarning, setMaterialWarning] = useState('');
  const [animations, setAnimations] = useState<string[]>([]);
  const [variants, setVariants] = useState<string[]>([]);
  const [selectedAnimation, setSelectedAnimation] = useState(settings.animationName);
  const [playing, setPlaying] = useState(false);
  const [compact, setCompact] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [placingHotspot, setPlacingHotspot] = useState(false);
  const [panZoomMode, setPanZoomMode] = useState(false);
  const viewerRef = useRef<ModelViewerElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const orbitDragRef = useRef<OrbitDrag | null>(null);
  const panDragRef = useRef<PanDrag | null>(null);
  const latestSettings = useRef(settings);
  latestSettings.current = settings;

  useEffect(() => {
    let active = true;
    void import('@google/model-viewer')
      .then(() => { if (active) setModuleReady(true); })
      .catch(() => { if (active) setLoadError('The 3D viewer could not be started in this browser.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    setRenderSource('');
    setLoadError('');
    void resolveModelSource(src, controller.signal)
      .then((resolved) => {
        if (controller.signal.aborted) {
          if (resolved.revoke) URL.revokeObjectURL(resolved.url);
          return;
        }
        objectUrl = resolved.revoke ? resolved.url : '';
        setRenderSource(resolved.url);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : 'The 3D model package could not be prepared.');
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  useEffect(() => {
    setAnimations([]);
    setVariants([]);
    setSelectedAnimation(settings.animationName);
    setPlaying(false);
    setModelLoaded(false);
    setLoadProgress(0);
    setLoadError('');
    setMaterialWarning('');
  }, [src, settings.animationName]);

  useEffect(() => {
    if (mode === 'canvas' && !selected) {
      setControlsVisible(false);
      setPlacingHotspot(false);
      setPanZoomMode(false);
    }
  }, [mode, selected]);

  const updateSettings = useCallback((changes: Partial<Model3DSettings>) => {
    onSettingsChange?.({ ...latestSettings.current, ...changes });
  }, [onSettingsChange]);

  const persistCamera = useCallback(() => {
    const viewer = viewerRef.current;
    const orbit = viewer?.getCameraOrbit?.();
    if (!viewer || !orbit) return;
    const target = viewer.getCameraTarget?.();
    const fieldOfView = viewer.getFieldOfView?.();
    updateSettings({
      cameraOrbit: orbitString(orbit),
      cameraTarget: target ? vectorString(target) : latestSettings.current.cameraTarget,
      fieldOfView: Number.isFinite(fieldOfView)
        ? `${Number(fieldOfView).toFixed(2)}deg`
        : latestSettings.current.fieldOfView,
    });
  }, [updateSettings]);

  const playAnimation = useCallback((restart = false) => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedAnimation) return;
    viewer.animationName = selectedAnimation;
    viewer.timeScale = settings.animationSpeed;
    if (restart) viewer.currentTime = 0;
    viewer.play({ repetitions: Infinity });
    setPlaying(true);
  }, [selectedAnimation, settings.animationSpeed]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedAnimation || !modelLoaded) return;
    viewer.animationName = selectedAnimation;
    viewer.timeScale = settings.animationSpeed;
    viewer.currentTime = 0;
    viewer.play({ repetitions: Infinity });
    setPlaying(true);
  }, [modelLoaded, selectedAnimation, settings.animationSpeed]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!moduleReady || !viewer) return;
    const synchronizeModel = () => {
      const availableAnimations = [...(viewer.availableAnimations || [])];
      const availableVariants = [...(viewer.availableVariants || [])];
      setAnimations(availableAnimations);
      setVariants(availableVariants);
      setSelectedAnimation((current) => {
        const next = availableAnimations.includes(settings.animationName)
          ? settings.animationName
          : availableAnimations.includes(current) ? current : availableAnimations[0] || '';
        if (next && next !== settings.animationName) updateSettings({ animationName: next });
        return next;
      });
      if (settings.variant && availableVariants.includes(settings.variant)) viewer.variantName = settings.variant;
      setMaterialWarning(missingMaterialMessage(viewer));
      setModelLoaded(true);
      setLoadProgress(1);
      setLoadError('');
    };
    const failModel = () => {
      setModelLoaded(false);
      setLoadError('This 3D model could not be loaded. Check that the GLB/GLTF and all of its material textures are available.');
    };
    const reportProgress = (event: Event) => {
      const progress = Number((event as CustomEvent<{ totalProgress?: number }>).detail?.totalProgress);
      if (Number.isFinite(progress)) setLoadProgress(progress);
    };
    viewer.addEventListener('load', synchronizeModel);
    viewer.addEventListener('error', failModel);
    viewer.addEventListener('progress', reportProgress);
    if (viewer.availableAnimations?.length || viewer.model) synchronizeModel();
    return () => {
      viewer.removeEventListener('load', synchronizeModel);
      viewer.removeEventListener('error', failModel);
      viewer.removeEventListener('progress', reportProgress);
    };
  }, [moduleReady, settings.animationName, settings.variant, updateSettings]);

  useEffect(() => {
    const container = containerRef.current;
    if (!moduleReady || !container) return;
    const observer = new ResizeObserver(([entry]) => {
      setCompact(entry.contentRect.width < 520 || entry.contentRect.height < 340);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [moduleReady]);

  const togglePlayback = () => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedAnimation) return;
    if (playing) { viewer.pause(); setPlaying(false); } else playAnimation();
  };

  const beginOrbit = (event: React.PointerEvent<HTMLButtonElement>) => {
    const orbit = viewerRef.current?.getCameraOrbit?.();
    if (!orbit) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    orbitDragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, orbit };
  };

  const moveOrbit = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = orbitDragRef.current;
    const viewer = viewerRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !viewer) return;
    event.preventDefault();
    event.stopPropagation();
    const theta = drag.orbit.theta - (event.clientX - drag.x) * 0.012;
    const phi = Math.min(Math.PI - 0.05, Math.max(0.05, drag.orbit.phi - (event.clientY - drag.y) * 0.012));
    viewer.cameraOrbit = `${theta}rad ${phi}rad ${drag.orbit.radius}m`;
    viewer.jumpCameraToGoal?.();
  };

  const endOrbit = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (orbitDragRef.current?.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    orbitDragRef.current = null;
    persistCamera();
  };

  const beginPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const viewer = viewerRef.current;
    const target = viewer?.getCameraTarget?.();
    const orbit = viewer?.getCameraOrbit?.();
    if (!viewer || !target || !orbit || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    panDragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, target, radius: orbit.radius };
  };

  const movePan = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = panDragRef.current;
    const viewer = viewerRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !viewer) return;
    event.preventDefault();
    event.stopPropagation();
    const scale = drag.radius / Math.max(220, containerRef.current?.clientWidth || 220);
    viewer.cameraTarget = `${drag.target.x - (event.clientX - drag.x) * scale}m ${drag.target.y + (event.clientY - drag.y) * scale}m ${drag.target.z}m`;
    viewer.jumpCameraToGoal?.();
  };

  const endPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panDragRef.current?.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    panDragRef.current = null;
    persistCamera();
  };

  const zoomCamera = (factor: number) => {
    const viewer = viewerRef.current;
    const orbit = viewer?.getCameraOrbit?.();
    if (!viewer || !orbit) return;
    viewer.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${Math.max(0.01, orbit.radius * factor)}m`;
    viewer.jumpCameraToGoal?.();
    window.setTimeout(persistCamera, 80);
  };

  const addHotspot = (event: React.MouseEvent) => {
    if (!placingHotspot || !selected || !onSettingsChange) return;
    event.preventDefault();
    event.stopPropagation();
    const point = viewerRef.current?.positionAndNormalFromPoint?.(event.clientX, event.clientY);
    if (!point) return;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    updateSettings({
      hotspots: [...settings.hotspots, {
        id: `label-${id}`,
        label: `Label ${settings.hotspots.length + 1}`,
        position: vectorString(point.position),
        normal: vectorString(point.normal, ''),
      }],
    });
    setPlacingHotspot(false);
  };

  const canvasMode = mode === 'canvas';
  const directCameraInteraction = !canvasMode;
  const controlSize = compact ? 'h-8 w-8' : 'h-9 w-9';

  if ((!moduleReady || !renderSource) && !loadError) {
    return <div className={`grid place-items-center bg-transparent text-sm text-slate-600 ${className}`}>Loading 3D viewer…</div>;
  }
  if (loadError) {
    return <div role="alert" className={`grid place-items-center bg-transparent p-5 text-center text-slate-900 ${className}`}><div><AlertTriangle className="mx-auto text-amber-600" size={36}/><p className="mt-3 font-bold">3D preview unavailable</p><p className="mt-1 max-w-md text-xs text-slate-600">{loadError}</p></div></div>;
  }

  const viewer = createElement('model-viewer', {
    ref: (element: ModelViewerElement | null) => { viewerRef.current = element; },
    src: renderSource,
    alt,
    style: { width: '100%', height: '100%', display: 'block', background: 'transparent', '--poster-color': 'transparent' },
    'camera-controls': directCameraInteraction ? true : undefined,
    'camera-orbit': settings.cameraOrbit || undefined,
    'camera-target': settings.cameraTarget || undefined,
    'field-of-view': settings.fieldOfView || undefined,
    'auto-rotate': settings.autoRotate ? true : undefined,
    'rotation-per-second': settings.autoRotate ? `${settings.rotationPerSecond}deg` : undefined,
    'shadow-intensity': String(settings.shadowIntensity),
    'shadow-softness': String(settings.shadowSoftness),
    exposure: String(settings.exposure),
    'environment-image': settings.environment === 'none' ? undefined : 'neutral',
    'tone-mapping': 'neutral',
    'interaction-prompt': directCameraInteraction ? 'auto' : 'none',
    ar: mode === 'runtime' || mode === 'preview' ? true : undefined,
    loading: 'eager',
    onDoubleClick: addHotspot,
  }, settings.hotspots.map((hotspot) => createElement('button', {
    key: hotspot.id,
    type: 'button',
    slot: `hotspot-${hotspot.id}`,
    'data-position': hotspot.position,
    'data-normal': hotspot.normal,
    className: 'pointer-events-auto rounded-full border border-white/80 bg-slate-950/85 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur',
    title: hotspot.label,
    onClick: (event: React.MouseEvent) => event.stopPropagation(),
  }, hotspot.label)));

  const hasAuthorControls = canvasMode && selected;
  return <div
    ref={containerRef}
    data-canvas-interactive={panZoomMode || placingHotspot ? 'true' : undefined}
    className={`relative min-h-0 overflow-hidden bg-transparent ${placingHotspot ? 'cursor-crosshair' : ''} ${className}`}
  >
    {viewer}
    {!modelLoaded && <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-full bg-slate-950/75 p-1 shadow"><div className="h-1.5 rounded-full bg-cyan-400 transition-[width]" style={{ width: `${Math.max(8, Math.round(loadProgress * 100))}%` }}/></div>}

    {hasAuthorControls && !panZoomMode && !placingHotspot && <button
      type="button"
      onPointerDown={beginOrbit}
      onPointerMove={moveOrbit}
      onPointerUp={endOrbit}
      onPointerCancel={endOrbit}
      className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center rounded-full border-2 border-slate-600 bg-white/80 text-slate-700 shadow-lg backdrop-blur-sm hover:bg-white active:cursor-grabbing"
      title="Drag to rotate the 3D model"
      aria-label="Drag to rotate the 3D model"
    ><Orbit size={31} strokeWidth={1.8}/></button>}

    {panZoomMode && <div
      data-canvas-interactive="true"
      onPointerDown={beginPan}
      onPointerMove={movePan}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      className="absolute inset-0 z-10 touch-none cursor-grab border-2 border-cyan-500/80 bg-cyan-500/[0.03] active:cursor-grabbing"
      aria-label="Pan model within frame"
    ><span className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-slate-950/80 px-3 py-1 text-[11px] font-bold text-white">Pan & Zoom · drag model inside frame</span></div>}

    {panZoomMode && <div className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 rounded-xl border border-white/70 bg-slate-950/85 p-1 text-white shadow-lg">
      <button type="button" onClick={(event) => { event.stopPropagation(); zoomCamera(0.88); }} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/15" title="Zoom in"><Plus size={17}/></button>
      <button type="button" onClick={(event) => { event.stopPropagation(); zoomCamera(1.14); }} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/15" title="Zoom out"><Minus size={17}/></button>
    </div>}

    {animations.length > 0 && <button type="button" onClick={(event) => { event.stopPropagation(); togglePlayback(); }} title={playing ? 'Pause model animation' : 'Play model animation'} className="absolute bottom-2 left-2 z-20 grid h-10 w-10 place-items-center border border-white bg-slate-700/85 text-white shadow-lg backdrop-blur-sm">{playing ? <Pause size={18}/> : <Play size={18}/>}</button>}

    {hasAuthorControls && !controlsVisible && <button type="button" onClick={(event) => { event.stopPropagation(); setControlsVisible(true); }} title="Show 3D model tools" className="absolute bottom-2 right-2 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/70 bg-slate-950/80 text-white shadow-lg backdrop-blur"><SlidersHorizontal size={17}/></button>}
    {hasAuthorControls && controlsVisible && <div className={`absolute bottom-2 right-2 z-30 flex items-center border border-white/60 bg-slate-950/85 text-white shadow-lg backdrop-blur ${compact ? 'max-w-[calc(100%-1rem)] gap-1 rounded-lg p-1' : 'max-w-[calc(100%-1rem)] gap-2 rounded-xl p-2'}`} onClick={(event) => event.stopPropagation()}>
      {animations.length > 0 && <label className="min-w-0"><span className="sr-only">Animation scene</span><select value={selectedAnimation} onChange={(event) => { setSelectedAnimation(event.target.value); updateSettings({ animationName: event.target.value }); }} className={`${compact ? 'h-8 max-w-24 px-1 text-xs' : 'h-9 max-w-40 px-2 text-sm'} w-full rounded-lg border border-white/20 bg-slate-900 font-semibold text-white outline-none`}>{animations.map((animation) => <option key={animation} value={animation}>{animation}</option>)}</select></label>}
      {animations.length > 0 && <button type="button" onClick={() => playAnimation(true)} title="Replay animation" className={`grid ${controlSize} shrink-0 place-items-center rounded-lg border border-white/30`}><RotateCcw size={compact ? 14 : 16}/></button>}
      {variants.length > 0 && <label className="min-w-0"><span className="sr-only">Material variant</span><select value={settings.variant} onChange={(event) => { if (viewerRef.current) viewerRef.current.variantName = event.target.value; updateSettings({ variant: event.target.value }); }} className={`${compact ? 'h-8 max-w-24 px-1 text-xs' : 'h-9 max-w-36 px-2 text-sm'} w-full rounded-lg border border-white/20 bg-slate-900 font-semibold text-white outline-none`}><option value="">Default material</option>{variants.map((variant) => <option key={variant} value={variant}>{variant}</option>)}</select></label>}
      <button type="button" onClick={() => { setPanZoomMode((value) => !value); setPlacingHotspot(false); }} title={panZoomMode ? 'Exit Pan & Zoom' : 'Pan & Zoom inside frame'} className={`grid ${controlSize} shrink-0 place-items-center rounded-lg border ${panZoomMode ? 'border-cyan-300 bg-cyan-500 text-slate-950' : 'border-white/30'}`}><Scan size={compact ? 14 : 16}/></button>
      <button type="button" onClick={() => { setPlacingHotspot((value) => !value); setPanZoomMode(false); }} title={placingHotspot ? 'Cancel label placement' : 'Add label to model'} className={`grid ${controlSize} shrink-0 place-items-center rounded-lg border ${placingHotspot ? 'border-cyan-300 bg-cyan-500 text-slate-950' : 'border-white/30'}`}><Crosshair size={compact ? 14 : 16}/></button>
      <button type="button" onClick={() => setControlsVisible(false)} title="Hide 3D model tools" className={`grid ${controlSize} shrink-0 place-items-center rounded-lg border border-white/30`}><EyeOff size={compact ? 14 : 16}/></button>
    </div>}

    {placingHotspot && <p className="pointer-events-none absolute inset-x-3 top-3 z-20 rounded-lg bg-cyan-950/90 px-3 py-2 text-center text-xs font-bold text-cyan-50 shadow-lg">Double-click the model surface to place a label.</p>}
    {materialWarning && selected && <p className="pointer-events-none absolute left-2 top-2 z-20 max-w-[calc(100%-1rem)] rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-2 text-[11px] font-semibold text-amber-950 shadow">{materialWarning}</p>}
  </div>;
}
