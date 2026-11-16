import { Copy, ImagePlus, Layers3, Plus, Trash2 } from 'lucide-react';
import type { Layout, ObjectType, Slot } from '../layouts';
import type { StudioElement, StudioScreen } from '../types';
import { canPlaceResource } from '../resourcePlacement';
import { model3DSettingsFrom, standardModel3DView, type Model3DSettings } from './resources/model3DSettings';

interface Props {
  layout: Layout | null;
  screen: StudioScreen | null;
  selectedElementId: string | null;
  onSelect: (elementId: string) => void;
  onAdd: (slot: Slot) => void;
  onChangeSlotType: (slot: Slot, type: ObjectType) => void;
  onAddBlank: (type: ObjectType, region: Slot['region']) => void;
  onUpdate: (element: StudioElement) => void;
  onDuplicate: (elementId: string) => void;
  onRemove: (elementId: string) => void;
  availableScreens?: Array<{ id: number; title: string; screen_number: number }>;
}

const textValue = (element: StudioElement) => String(element.content.text || '');
const layerText = (element: StudioElement) => {
  const value = textValue(element)
    .replace(/\[\[shape:.+?\]\]/g, ' [inline shape] ')
    .replace(/\\\(.+?\\\)/g, ' [equation] ')
    .replace(/\s+/g, ' ')
    .trim();
  return value.length > 48 ? `${value.slice(0, 45)}…` : value;
};
const fieldValue = (element: StudioElement, key: string) => String(element.content[key] || '');
const textLike = new Set<ObjectType>(['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data']);
const blankElementTypes: ObjectType[] = ['title', 'text', 'visual', 'media', 'simulation', 'question', 'response', 'steps', 'workspace', 'footer', 'activity', 'graph', 'data', 'options'];
const elementTypeLabels: Partial<Record<ObjectType, string>> = {
  title: 'Title — heading text',
  text: 'Text — formatted text and equations',
  visual: 'Visual — image, animation, or 3D model',
  media: 'Media — image, video, audio, link, or presentation',
  simulation: 'Simulation — HTML, ZIP, SCORM, or external link',
  question: 'Question — question or prompt text',
  response: 'Response — answer or explanation text',
  steps: 'Steps — step-by-step text',
  workspace: 'Workspace — working-area content',
  footer: 'Footer — short bottom text',
  activity: 'Activity — interactive activity content',
  graph: 'Graph — graph or chart content',
  data: 'Data — structured or tabular text',
  options: 'Options — answer-choice text',
};
const slotTypesFor = (slot: Slot): ObjectType[] => slot.id === 'visual'
  ? Array.from(new Set<ObjectType>([...slot.allowed, 'visual', 'media', 'simulation']))
  : slot.allowed;

export default function StudioElementPanel({ layout, screen, selectedElementId, onSelect, onAdd, onChangeSlotType, onAddBlank, onUpdate, onDuplicate, onRemove, availableScreens = [] }: Props) {
  if (!screen) return <p className="text-sm text-slate-500">Select a Screen to edit its content.</p>;

  const selected = screen.elements.find((element) => element.id === selectedElementId) || null;
  const selectedSlot = selected
    ? (layout?.slots.find((slot) => slot.id === selected.slotId) ?? {
        id: selected.slotId || selected.id,
        label: 'Screen element',
        region: (selected.type === 'title' ? 'header' : selected.type === 'footer' ? 'footer' : 'content') as Slot['region'],
        allowed: blankElementTypes,
        bounds: selected.position as Slot['bounds'],
      })
    : null;
  const configurableContentSlot = layout?.slots.find((slot) => slot.id === 'visual') ?? null;
  const configurableContentElement = configurableContentSlot
    ? screen.elements.find((element) => element.slotId === configurableContentSlot.id) ?? null
    : null;
  const updateContent = (key: string, value: string) =>
    selected &&
    onUpdate({
      ...selected,
      content: { ...selected.content, [key]: value },
    });
  const updatePosition = (key: string, value: number | boolean) =>
    selected &&
    onUpdate({
      ...selected,
      position: { ...selected.position, [key]: value },
    });
  const boundResourceType = typeof selected?.resource?.usage?.resource_type === 'string'
    ? selected.resource.usage.resource_type
    : '';
  const model3DSettings = model3DSettingsFrom(selected?.content);
  const updateModel3D = (changes: Partial<Model3DSettings>) => selected && onUpdate({
    ...selected,
    content: { ...selected.content, model3d: { ...model3DSettings, ...changes } },
  });
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="font-semibold text-slate-900">{layout ? 'Layout slots' : 'Screen elements'}</h2>
        <p className="mt-1 text-sm text-slate-500">{layout ? 'Add permitted content to a slot, then edit it directly on the Screen.' : 'Add an element, then edit it directly on the Screen.'}</p>
        {!layout && (
          <div className="mt-3 grid min-w-0 gap-2 overflow-hidden pr-1">
            {(
              [
                ['title', 'title', 'header'],
                ['text', 'text', 'content'],
                ['footer', 'footer', 'footer'],
              ] as const
            ).map(([label, type, region]) => (
              <button key={region} type="button" onClick={() => onAddBlank(type, region)} className="flex w-full min-w-0 items-center justify-center gap-1 overflow-hidden rounded-lg border border-blue-800 bg-white px-2 py-2 text-center text-xs font-semibold text-blue-900">
                <Plus size={14} className="shrink-0" />
                <span className="min-w-0 whitespace-normal break-words">Add {label}</span>
              </button>
            ))}
            <label className="text-xs font-semibold text-slate-600">
              Add another element type
              <select
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) {
                    onAddBlank(event.target.value as ObjectType, 'content');
                    event.target.value = '';
                  }
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
              >
                <option value="">Choose element…</option>
                {blankElementTypes.map((type) => (
                  <option key={type} value={type}>
                    {elementTypeLabels[type] ?? type}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {layout ? (
          <div className="mt-3 min-w-0 space-y-2 overflow-hidden pr-1">
            {layout.slots.map((slot) => {
              const element = screen.elements.find((candidate) => candidate.slotId === slot.id);
              return (
                <div key={slot.id} className={`rounded-lg border p-3 ${element?.id === selectedElementId ? 'border-blue-700 bg-blue-50' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{slot.label}</p>
                      <p className="text-xs text-slate-500">{slot.allowed.join(', ')}</p>
                    </div>
                    {element ? (
                      <button type="button" onClick={() => onSelect(element.id)} className="rounded-lg border border-blue-800 px-3 py-1.5 text-xs font-semibold text-blue-900">Edit</button>
                    ) : (
                      <button type="button" onClick={() => onAdd(slot)} className="inline-flex items-center gap-1 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white"><Plus size={14} />Add</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        {configurableContentSlot ? (
          <label className="mt-4 block text-xs font-semibold text-slate-600">
            Content type
            <select
              value={configurableContentElement?.type ?? ''}
              onChange={(event) => event.target.value && onChangeSlotType(configurableContentSlot, event.target.value as ObjectType)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900"
            >
              <option value="">Choose content type...</option>
              {slotTypesFor(configurableContentSlot).map((type) => <option key={type} value={type}>{elementTypeLabels[type] ?? type}</option>)}
            </select>
          </label>
        ) : null}
        <label className="mt-4 block text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-2"><Layers3 size={16} className="text-blue-800" />Layers</span>
          <select
            value={selectedElementId ?? ''}
            onChange={(event) => event.target.value && onSelect(event.target.value)}
            disabled={screen.elements.length === 0}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">{screen.elements.length === 0 ? 'No screen elements' : 'Choose layer...'}</option>
            {[...screen.elements]
              .sort((a, b) => (Number(b.position.zIndex) || 0) - (Number(a.position.zIndex) || 0))
              .map((element) => (
                <option key={element.id} value={element.id}>
                  {element.type.replaceAll('_', ' ')}{layerText(element) ? ` - ${layerText(element)}` : ''}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-slate-900">Screen element</h2>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        {!selected || !selectedSlot ? (
          <div className="flex min-h-48 flex-col items-center justify-center text-center text-slate-500">
            <ImagePlus size={28} />
            <p className="mt-2 text-sm">Select an existing object or add content to an empty slot.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-800">{selectedSlot.label}</p>
                <h3 className="mt-1 font-semibold text-slate-900">Object inspector</h3>
              </div>
              <div className="flex gap-1">
                {!layout && (
                  <button type="button" onClick={() => onDuplicate(selected.id)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1.5 text-xs font-semibold text-blue-800">
                    <Copy size={14} />
                    Duplicate
                  </button>
                )}
                <button type="button" onClick={() => onRemove(selected.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs font-semibold text-red-700">
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            </div>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Object type
              <select
                value={selected.type}
                onChange={(event) => {
                  const nextType = event.target.value;
                  const boundType = selected.resource?.usage?.resource_type;
                  const keepResource = typeof boundType === 'string' && canPlaceResource(nextType, boundType as Parameters<typeof canPlaceResource>[1]);
                  onUpdate({
                    ...selected,
                    type: nextType,
                    content: { ...selected.content },
                    ...(keepResource ? {} : { resource: undefined }),
                  });
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
              >
                {slotTypesFor(selectedSlot).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            {selected.type === 'zoom' ? (
              <div className="mt-4 grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <label className="text-sm font-semibold text-slate-700">Zoom title<input value={textValue(selected)} onChange={(event) => updateContent('text', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" /></label>
                <label className="text-sm font-semibold text-slate-700">Destination Screen<select value={selected.zoom?.target_screen_id ?? ''} onChange={(event) => onUpdate({ ...selected, zoom: { kind: 'screen', target_screen_id: Number(event.target.value), target_section_id: null, return_to_zoom: selected.zoom?.return_to_zoom !== false, transition_enabled: true, transition_duration_ms: 500, thumbnail_mode: 'auto', custom_thumbnail_url: null } })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"><option value="">Choose Screen…</option>{availableScreens.filter((item) => item.id !== screen.id).map((item) => <option key={item.id} value={item.id}>Screen {item.screen_number}: {item.title}</option>)}</select></label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={selected.zoom?.return_to_zoom !== false} onChange={(event) => selected.zoom && onUpdate({ ...selected, zoom: { ...selected.zoom, return_to_zoom: event.target.checked } })} />Return to this Zoom after the destination</label>
                <p className="text-xs text-slate-600">Section and Summary Zoom are created from the Sections manager so their ordered Screen membership is preserved.</p>
              </div>
            ) : textLike.has(selected.type as ObjectType) ? (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                Double-click this element on the Screen to edit its text and formatting.
              </div>
            ) : (
              <>
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Media or asset URL
                  <input value={fieldValue(selected, 'url')} onChange={(event) => updateContent('url', event.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
                </label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Alternative text
                  <textarea value={fieldValue(selected, 'altText')} onChange={(event) => updateContent('altText', event.target.value)} rows={2} placeholder="Describe the instructional content" className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
                </label>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Caption
                    <input value={fieldValue(selected, 'caption')} onChange={(event) => updateContent('caption', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Credit or source
                    <input value={fieldValue(selected, 'credit')} onChange={(event) => updateContent('credit', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
                  </label>
                </div>
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Teaching label
                  <input value={textValue(selected)} onChange={(event) => updateContent('text', event.target.value)} placeholder="Short visible label" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
                </label>
                {boundResourceType === 'model_3d' && (
                  <div className="mt-4 grid gap-4 rounded-xl border border-cyan-200 bg-cyan-50/70 p-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">3D appearance and interaction</h4>
                      <p className="mt-1 text-xs text-slate-600">Drag the outer object to move it. Drag the circular control over the model to rotate it, or open Pan & Zoom from the model tools. The internal view is saved automatically.</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-white p-3 text-xs text-emerald-900">
                      The viewer background is always transparent. Model colour comes from the GLB material and texture, exactly as in PowerPoint.
                    </div>
                    <label className="text-sm font-semibold text-slate-700">Standard camera view
                      <select defaultValue="" onChange={(event) => { const cameraOrbit = standardModel3DView(event.target.value); if (cameraOrbit) updateModel3D({ cameraOrbit, fieldOfView: '30deg' }); event.target.value = ''; }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
                        <option value="">Choose a view…</option><option value="front">Front</option><option value="back">Back</option><option value="left">Left</option><option value="right">Right</option><option value="top">Top</option><option value="isometric">Isometric</option>
                      </select>
                    </label>
                    <button type="button" onClick={() => updateModel3D({ cameraOrbit: '', cameraTarget: '', fieldOfView: '' })} className="rounded-lg border border-cyan-300 bg-white px-3 py-2 text-xs font-bold text-cyan-900">Reset camera, pan and zoom</button>
                    <label className="text-sm font-semibold text-slate-700">Lighting environment
                      <select value={model3DSettings.environment} onChange={(event) => updateModel3D({ environment: event.target.value as Model3DSettings['environment'] })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"><option value="neutral">Neutral studio</option><option value="soft">Soft studio</option><option value="none">Model lighting only</option></select>
                    </label>
                    <label className="text-sm font-semibold text-slate-700">Exposure · {model3DSettings.exposure.toFixed(2)}<input type="range" min="0.25" max="2.5" step="0.05" value={model3DSettings.exposure} onChange={(event) => updateModel3D({ exposure: Number(event.target.value) })} className="mt-1 w-full" /></label>
                    <label className="text-sm font-semibold text-slate-700">Contact shadow · {model3DSettings.shadowIntensity.toFixed(2)}<input type="range" min="0" max="2" step="0.05" value={model3DSettings.shadowIntensity} onChange={(event) => updateModel3D({ shadowIntensity: Number(event.target.value) })} className="mt-1 w-full" /></label>
                    <label className="text-sm font-semibold text-slate-700">Shadow softness · {model3DSettings.shadowSoftness.toFixed(2)}<input type="range" min="0" max="1" step="0.05" value={model3DSettings.shadowSoftness} onChange={(event) => updateModel3D({ shadowSoftness: Number(event.target.value) })} className="mt-1 w-full" /></label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={model3DSettings.autoRotate} onChange={(event) => updateModel3D({ autoRotate: event.target.checked })} />Auto-rotate model</label>
                    {model3DSettings.autoRotate && <label className="text-sm font-semibold text-slate-700">Rotation speed · {model3DSettings.rotationPerSecond}°/s<input type="range" min="1" max="90" step="1" value={model3DSettings.rotationPerSecond} onChange={(event) => updateModel3D({ rotationPerSecond: Number(event.target.value) })} className="mt-1 w-full" /></label>}
                    <label className="text-sm font-semibold text-slate-700">Animation speed · {model3DSettings.animationSpeed}×<select value={model3DSettings.animationSpeed} onChange={(event) => updateModel3D({ animationSpeed: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">{[0.25, 0.5, 1, 1.5, 2, 3].map((speed) => <option key={speed} value={speed}>{speed}×</option>)}</select></label>
                    <div>
                      <div className="flex items-center justify-between gap-2"><p className="text-sm font-bold text-slate-800">Model labels</p><span className="text-xs text-slate-500">{model3DSettings.hotspots.length}</span></div>
                      <p className="mt-1 text-xs text-slate-600">Use the crosshair in the model controls, then double-click its surface.</p>
                      <div className="mt-2 grid gap-2">{model3DSettings.hotspots.map((hotspot) => <div key={hotspot.id} className="flex items-center gap-2"><input value={hotspot.label} onChange={(event) => updateModel3D({ hotspots: model3DSettings.hotspots.map((item) => item.id === hotspot.id ? { ...item, label: event.target.value } : item) })} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"/><button type="button" onClick={() => updateModel3D({ hotspots: model3DSettings.hotspots.filter((item) => item.id !== hotspot.id) })} className="rounded-lg border border-red-200 bg-white px-2 py-1.5 text-xs font-bold text-red-700">Remove</button></div>)}</div>
                    </div>
                    <p className="text-[11px] leading-4 text-slate-500">Material variants and embedded animations appear automatically when the GLB provides them. A generic exploded view cannot be safely generated for arbitrary models; use an embedded “explode” animation when authored into the model.</p>
                  </div>
                )}
              </>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(['x', 'y', 'width', 'height'] as const).map((key) => (
                <label key={key} className="block text-xs font-semibold uppercase text-slate-600">
                  {key}
                  <input type="number" min={key === 'width' ? 80 : key === 'height' ? 60 : 0} max={key === 'x' || key === 'width' ? 1920 : 1080} value={Number(selected.position[key]) || 0} onChange={(event) => updatePosition(key, Number(event.target.value))} disabled={selected.position.locked === true} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal disabled:bg-slate-100" />
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Text colour
                <input type="color" value={typeof selected.content.color === 'string' ? selected.content.color : '#173b65'} onChange={(event) => updateContent('color', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white p-1" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Layer
                <input type="number" min="0" max="100" value={Number(selected.position.zIndex) || 0} onChange={(event) => updatePosition('zIndex', Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
              </label>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={selected.position.locked === true} onChange={(event) => updatePosition('locked', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Lock position and size
            </label>
            <p className="mt-4 text-xs text-slate-500">{layout ? `Position and size start from the validated ${selectedSlot.id} slot geometry.` : 'Use the canvas Move and resize controls to position this screen element.'} Changes are automatically saved to the working draft.</p>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
