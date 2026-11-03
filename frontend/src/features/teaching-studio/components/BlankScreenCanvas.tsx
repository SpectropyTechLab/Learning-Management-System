import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getStudioResource } from '../api/studioResourcesApi';
import type { StudioResourceDetails, StudioResourceVersion } from '../api/studioResourcesApi';
import type { Layout, Slide } from '../layouts';
import SlideCanvas from '../SlideCanvas';
import type { StudioElement, StudioScreen } from '../types';
import StudioResourcePlayer from './resources/StudioResourcePlayer';

interface BlankScreenCanvasProps {
  screen: StudioScreen | null;
  loading: boolean;
  layout?: Layout | null;
  selectedElementId?: string | null;
  onSelectElement?: (elementId: string) => void;
  showGuides?: boolean;
}

const elementText = (content: Record<string, unknown>) => {
  const preferred = content.text ?? content.value ?? content.title;
  if (typeof preferred === 'string') return preferred;
  const firstText = Object.values(content).find((value) => typeof value === 'string');
  return typeof firstText === 'string' ? firstText : '';
};

function BoundResource({ element, onSelect }: { element: StudioElement; onSelect?: () => void }) {
  const [resource, setResource] = useState<StudioResourceDetails | null>(null);
  const [version, setVersion] = useState<StudioResourceVersion | null>(null);
  const [error, setError] = useState('');
  const resourceId = element.resource?.resource_id;
  const versionId = element.resource?.resource_version_id;

  useEffect(() => {
    if (!resourceId || !versionId) return;
    let active = true;
    setResource(null);
    setVersion(null);
    setError('');
    void getStudioResource(resourceId)
      .then((details) => {
        if (!active) return;
        const selectedVersion = details.versions.find((candidate) => candidate.id === versionId);
        if (!selectedVersion) throw new Error('The linked Resource version is no longer available.');
        setResource(details);
        setVersion(selectedVersion);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load the linked Resource.');
      });
    return () => { active = false; };
  }, [resourceId, versionId]);

  if (error) return <div className="grid h-full place-items-center bg-slate-900 p-3 text-center text-xs text-white">{error}</div>;
  if (!resource || !version) return <div className="grid h-full place-items-center bg-slate-900 text-xs font-medium text-white">Preparing media…</div>;

  return <div className="relative h-full w-full">
    <StudioResourcePlayer resourceType={resource.resource_type} version={version} mode="canvas" className="h-full w-full" />
    {onSelect ? <button type="button" onClick={onSelect} className="absolute right-2 top-2 z-10 rounded bg-white/95 px-2 py-1 text-xs font-semibold text-blue-900 shadow">Select</button> : null}
  </div>;
}

export default function BlankScreenCanvas({ screen, loading, layout = null, selectedElementId, onSelectElement, showGuides = true }: BlankScreenCanvasProps) {
  const slide: Slide | null = screen && layout ? {
    title: screen.title,
    creationMode: 'layout',
    objects: screen.elements.map((element) => ({
      id: element.id,
      slotId: element.slotId || '',
      type: element.type as Slide['objects'][number]['type'],
      text: elementText(element.content),
      url: typeof element.content.url === 'string' ? element.content.url : undefined,
      altText: typeof element.content.altText === 'string' ? element.content.altText : undefined,
      caption: typeof element.content.caption === 'string' ? element.content.caption : undefined,
    })),
  } : null;

  const objectOverlays: Record<string, ReactNode> = {};
  for (const element of screen?.elements ?? []) {
    if (!element.resource) continue;
    objectOverlays[element.id] = <BoundResource
      key={`${element.resource.resource_id}-${element.resource.resource_version_id}`}
      element={element}
      onSelect={onSelectElement ? () => onSelectElement(element.id) : undefined}
    />;
  }

  return <section aria-label="Studio canvas" className="flex h-full min-h-0 min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <h2 className="min-w-0 truncate text-lg font-semibold text-slate-900">{screen ? `${screen.title || 'Untitled Screen'} · Screen ${screen.screen_number} · Revision ${screen.revision_no}` : (loading ? 'Loading Screen...' : 'Blank canvas · Select or create a Screen to begin.')}</h2>
      {screen ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{screen.creation_mode === 'blank' ? 'Blank Screen' : 'Layout Screen'}</span> : null}
    </div>

    <div className="min-h-0 flex-1">{slide && layout && !loading ? <SlideCanvas
      layout={layout}
      slide={slide}
      showGuides={showGuides}
      selectedObjectId={selectedElementId}
      onSelectObject={onSelectElement}
      objectOverlays={objectOverlays}
    /> : <div className="flex h-full min-h-0 items-center justify-center rounded-xl bg-slate-200 p-3">
      <div className="relative h-full min-h-0 w-full max-w-5xl overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xl" data-testid="studio-canvas">
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-medium text-slate-500" role={loading ? 'status' : undefined}>
          {loading ? 'Loading Screen...' : !screen ? 'No Screen is selected.' : screen.elements.length === 0 ? 'Empty canvas' : 'Apply a layout to position this Screen’s content.'}
        </p>
      </div>
    </div>}</div>
  </section>;
}
