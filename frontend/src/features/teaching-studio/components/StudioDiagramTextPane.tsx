import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { diagramFromOutline, outlineFromDiagram, type SmartDiagramContent } from './smartDiagramModel';

export default function StudioDiagramTextPane({ content, onChange, onClose }: { content: SmartDiagramContent; onChange: (content: SmartDiagramContent) => void; onClose: () => void }) {
  const [outline, setOutline] = useState(() => outlineFromDiagram(content.nodes));
  useEffect(() => setOutline(outlineFromDiagram(content.nodes)), [content.nodes]);
  const update = (value: string) => { setOutline(value); const nodes = diagramFromOutline(value, content.nodes); if (nodes.length) onChange({ ...content, nodes }); };
  return <aside className="absolute left-5 top-5 z-[75] flex h-[min(520px,75%)] w-72 flex-col rounded-xl border border-slate-300 bg-white shadow-2xl" aria-label="Diagram Text Pane">
    <header className="flex h-9 shrink-0 items-center justify-between border-b px-3"><span className="text-xs font-bold text-blue-950">Type your text here</span><button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded hover:bg-slate-100" aria-label="Close Text Pane"><X size={14}/></button></header>
    <textarea value={outline} onChange={(event) => update(event.target.value)} onKeyDown={(event) => { if (event.key !== 'Tab') return; event.preventDefault(); const target = event.currentTarget; const start = target.selectionStart; const end = target.selectionEnd; const lineStart = outline.lastIndexOf('\n', start - 1) + 1; const promote = event.shiftKey; const next = promote && outline.slice(lineStart, lineStart + 2) === '  ' ? outline.slice(0, lineStart) + outline.slice(lineStart + 2) : !promote ? outline.slice(0, lineStart) + '  ' + outline.slice(lineStart) : outline; update(next); requestAnimationFrame(() => { const offset = next.length - outline.length; target.selectionStart = Math.max(lineStart, start + offset); target.selectionEnd = Math.max(lineStart, end + offset); }); }} className="min-h-0 flex-1 resize-none p-3 font-mono text-xs leading-7 outline-none" aria-label="Diagram outline" />
    <p className="shrink-0 border-t bg-slate-50 px-3 py-2 text-[10px] text-slate-500">Enter adds a shape · Tab demotes · Shift+Tab promotes</p>
  </aside>;
}
