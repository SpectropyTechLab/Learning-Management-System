import { useEffect, useState } from 'react';
import type { StudioElement, StudioScreen } from '../types';
import type { StudioLayoutSlot, StudioLayoutSummary } from '../api/studioEditorApi';
import { getStudioResourceUrl } from '../api/studioEditorApi';

interface BlankScreenCanvasProps {
  screen: StudioScreen | null;
  layout?: StudioLayoutSummary | null;
  loading: boolean;
  editable?: boolean;
  onEditElement?: (slot: StudioLayoutSlot, element: StudioElement | null) => void;
  onRemoveElement?: (element: StudioElement) => void;
}

const elementText = (content: Record<string, unknown>) => {
  const value = content.text ?? content.label ?? content.prompt ?? content.caption;
  return typeof value === 'string' ? value : '';
};

function ResourceImage({ element, alt }: { element: StudioElement; alt: string }) {
  const externalUrl =
    typeof element.content.external_url === 'string' ? element.content.external_url : '';
  const [url, setUrl] = useState(externalUrl);
  useEffect(() => {
    setUrl(externalUrl);
    if (externalUrl || !element.resource?.resource_version_id) return;
    let active = true;
    void getStudioResourceUrl(element.resource.resource_version_id)
      .then((result) => {
        if (active) setUrl(result.url);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [element.resource?.resource_version_id, externalUrl]);
  return url ? (
    <img src={url} alt={alt} className="mt-1 h-[calc(100%-1.25rem)] w-full object-contain" />
  ) : (
    <p className="mt-1 text-xs text-slate-500">{alt}</p>
  );
}

export default function BlankScreenCanvas({
  screen,
  layout,
  loading,
  editable = false,
  onEditElement,
  onRemoveElement,
}: BlankScreenCanvasProps) {
  return (
    <section
      aria-label="Studio canvas"
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {screen?.title || (loading ? 'Loading Screen...' : 'Blank canvas')}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {screen
              ? `Screen ${screen.screen_number} · Revision ${screen.revision_no}`
              : 'Select or create a Screen to begin.'}
          </p>
        </div>
        {screen ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {screen.creation_mode === 'blank' ? 'Blank Screen' : 'Layout Screen'}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-[260px] items-center justify-center rounded-xl bg-slate-200 p-3 sm:min-h-[420px]">
        <div
          className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xl"
          data-testid="studio-canvas"
        >
          {loading ? (
            <p
              className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-500"
              role="status"
            >
              Loading Screen...
            </p>
          ) : !screen ? (
            <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-500">
              No Screen is selected.
            </p>
          ) : layout ? (
            (layout.layout_data_json?.slots ?? []).map((slot) => {
              const element = screen.elements.find((item) => item.slotId === slot.id);
              if (!editable && !element) return null;
              return (
                <div
                  key={slot.id}
                  className={`absolute overflow-hidden rounded p-1 sm:p-2 ${editable ? `border ${slot.region === 'header' ? 'border-blue-200 bg-blue-50' : slot.region === 'footer' ? 'border-slate-200 bg-slate-50' : 'border-dashed border-indigo-300 bg-indigo-50/50'}` : ''}`}
                  style={{
                    left: `${(slot.bounds.x / layout.canvas_width) * 100}%`,
                    top: `${(slot.bounds.y / layout.canvas_height) * 100}%`,
                    width: `${(slot.bounds.width / layout.canvas_width) * 100}%`,
                    height: `${(slot.bounds.height / layout.canvas_height) * 100}%`,
                  }}
                >
                  {editable ? (
                    <p className="truncate text-[7px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
                      {slot.label}
                    </p>
                  ) : null}
                  {element ? (
                    <>
                      {element.content.resource_type === 'image' ? (
                        <ResourceImage
                          element={element}
                          alt={elementText(element.content) || slot.label}
                        />
                      ) : (
                        <p className="mt-1 line-clamp-3 text-[8px] text-slate-700 sm:text-sm">
                          {elementText(element.content) || element.type}
                        </p>
                      )}
                      {editable ? (
                        <div className="absolute bottom-1 right-1 flex gap-1">
                          <button
                            type="button"
                            onClick={() => onEditElement?.(slot, element)}
                            className="rounded bg-white px-1.5 py-0.5 text-[8px] font-semibold text-blue-700 shadow sm:text-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveElement?.(element)}
                            className="rounded bg-white px-1.5 py-0.5 text-[8px] font-semibold text-red-600 shadow sm:text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : editable ? (
                    <button
                      type="button"
                      onClick={() => onEditElement?.(slot, null)}
                      className="absolute inset-x-1 bottom-1 rounded border border-dashed border-indigo-300 bg-white/90 px-1 py-0.5 text-[8px] font-semibold text-indigo-700 sm:text-xs"
                    >
                      + Add content
                    </button>
                  ) : null}
                </div>
              );
            })
          ) : screen.elements.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <p className="text-base font-semibold text-slate-700">Empty canvas</p>
              <p className="mt-1 text-sm text-slate-500">This Screen has no preset elements.</p>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <p className="text-base font-semibold text-slate-700">
                {screen.elements.length} saved{' '}
                {screen.elements.length === 1 ? 'element' : 'elements'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Element editing is added in the later editor milestone.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
