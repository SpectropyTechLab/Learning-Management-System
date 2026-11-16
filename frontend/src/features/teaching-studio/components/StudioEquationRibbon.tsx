import { Copy, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import type { StudioScreen } from '../types';
import MathLiveEquationEditor from './MathLiveEquationEditor';

interface Props {
  screen: StudioScreen | null;
  selectedElementId: string | null;
  readOnly: boolean;
  onDuplicate: (elementId: string) => void;
  onRemove: (elementId: string) => void;
  onRequestControl: (action: 'keyboard' | 'menu', location?: { x: number; y: number }) => void;
}

export default function StudioEquationRibbon({
  screen,
  selectedElementId,
  readOnly,
  onDuplicate,
  onRemove,
  onRequestControl,
}: Props) {
  const equations = useMemo(
    () => (screen?.elements ?? []).filter((element) => element.type === 'math'),
    [screen?.elements],
  );
  const selected = equations.find((element) => element.id === selectedElementId) ?? null;
  return (
    <div className="flex h-full min-w-max items-center gap-1 px-1" aria-label="Equation editing controls">
      <MathLiveEquationEditor value="" onChange={() => undefined} ariaLabel="Equation canvas controls" compact controlsOnly elementId={selected?.id} onRequestControl={onRequestControl} />
      <button type="button" disabled={!selected || readOnly} onClick={() => selected && onDuplicate(selected.id)} className="studio-equation-ribbon-action" title="Duplicate selected equation"><Copy size={15} /><span>Duplicate</span></button>
      <button type="button" disabled={!selected || readOnly} onClick={() => selected && onRemove(selected.id)} className="studio-equation-ribbon-action text-red-700" title="Delete selected equation"><Trash2 size={15} /><span>Delete</span></button>
    </div>
  );
}
