import { useEffect, useRef, useState } from 'react';
import { Circle, Eraser, Grid3X3, GripHorizontal, Highlighter, Minus, PenLine, Pencil, Plus, Redo2, RotateCcw, Slash, Square, Trash2, X } from 'lucide-react';

type Point = { x: number; y: number };
type Tool = 'pen' | 'pencil' | 'highlighter' | 'eraser' | 'line' | 'rectangle' | 'ellipse';
type Stroke = { id: string; kind?: Exclude<Tool, 'eraser'>; color: string; width: number; opacity: number; points: Point[] };
type Board = { id: string; title: string; x: number; y: number; width: number; height: number; minimized: boolean; grid?: boolean; strokes: Stroke[]; redo?: Stroke[] };

const freshBoard = (offset = 0): Board => ({
  id: crypto.randomUUID(), title: 'Teacher whiteboard', x: 80 + offset, y: 90 + offset,
  width: 680, height: 480, minimized: false, grid: true, strokes: [], redo: [],
});

export default function FloatingWhiteboards({ sessionId }: { sessionId: number }) {
  const storageKey = `spectropy:teacher-whiteboards:${sessionId}`;
  const [boards, setBoards] = useState<Board[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || '[]') as Board[]; } catch { return []; }
  });
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ef4444');
  const [width, setWidth] = useState(5);
  const drawing = useRef<{ boardId: string; strokeId: string } | null>(null);
  const dragging = useRef<{ boardId: string; dx: number; dy: number } | null>(null);
  const resizing = useRef<{ boardId: string; startX: number; startY: number; width: number; height: number } | null>(null);

  useEffect(() => { sessionStorage.setItem(storageKey, JSON.stringify(boards)); }, [boards, storageKey]);
  const update = (boardId: string, updater: (board: Board) => Board) =>
    setBoards((current) => current.map((board) => board.id === boardId ? updater(board) : board));
  const pointFrom = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const startInk = (boardId: string, event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFrom(event);
    if (tool === 'eraser') {
      update(boardId, (board) => ({ ...board, strokes: board.strokes.filter((stroke) => !stroke.points.some((item) => Math.hypot(item.x - point.x, item.y - point.y) < Math.max(12, stroke.width * 2))) }));
      return;
    }
    const strokeId = crypto.randomUUID();
    drawing.current = { boardId, strokeId };
    update(boardId, (board) => ({ ...board, redo: [], strokes: [...board.strokes, { id: strokeId, kind: tool, color, width: tool === 'highlighter' ? width * 3 : tool === 'pencil' ? Math.max(2, width - 2) : width, opacity: tool === 'highlighter' ? 0.3 : 1, points: [point, point] }] }));
  };
  const moveInk = (boardId: string, event: React.PointerEvent<SVGSVGElement>) => {
    if (tool === 'eraser' && event.buttons) return startInk(boardId, event);
    if (drawing.current?.boardId !== boardId) return;
    const point = pointFrom(event);
    update(boardId, (board) => ({ ...board, strokes: board.strokes.map((stroke) => stroke.id === drawing.current?.strokeId ? { ...stroke, points: ['line', 'rectangle', 'ellipse'].includes(stroke.kind || '') ? [stroke.points[0], point] : [...stroke.points, point] } : stroke) }));
  };
  const moveBoard = (event: React.PointerEvent<HTMLDivElement>) => {
    if (resizing.current) {
      const state = resizing.current;
      update(state.boardId, (board) => ({
        ...board,
        width: Math.max(420, Math.min(window.innerWidth - board.x - 12, state.width + event.clientX - state.startX)),
        height: Math.max(300, Math.min(window.innerHeight - board.y - 12, state.height + event.clientY - state.startY)),
      }));
      return;
    }
    if (!dragging.current) return;
    const { boardId, dx, dy } = dragging.current;
    update(boardId, (board) => ({ ...board, x: Math.max(0, event.clientX - dx), y: Math.max(0, event.clientY - dy) }));
  };

  return (
    <>
      <button type="button" onClick={() => setBoards((current) => [...current, freshBoard((current.length % 4) * 28)])} className="fixed bottom-20 right-5 z-[70] inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-blue-950 shadow-xl ring-1 ring-slate-300" title="Add floating whiteboard"><Plus size={18} />Whiteboard</button>
      {boards.map((board) => (
        <div key={board.id} onPointerMove={moveBoard} onPointerUp={() => { dragging.current = null; resizing.current = null; drawing.current = null; }} className="fixed z-[80] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl" style={{ left: board.x, top: board.y, width: board.minimized ? 310 : board.width, height: board.minimized ? 48 : board.height }}>
          <div onPointerDown={(event) => { if ((event.target as HTMLElement).closest('button')) return; dragging.current = { boardId: board.id, dx: event.clientX - board.x, dy: event.clientY - board.y }; event.currentTarget.setPointerCapture(event.pointerId); }} className="flex h-12 cursor-move items-center gap-2 border-b bg-slate-50 px-3 text-slate-800">
            <GripHorizontal size={17} /><span className="flex-1 text-sm font-bold">{board.title}</span>
            <button type="button" title={board.minimized ? 'Restore whiteboard' : 'Minimize whiteboard'} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); update(board.id, (item) => ({ ...item, minimized: !item.minimized })); }} className="rounded-md p-2 hover:bg-slate-200">{board.minimized ? <Plus size={17} /> : <Minus size={17} />}</button>
            <button type="button" title="Close whiteboard" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setBoards((current) => current.filter((item) => item.id !== board.id)); }} className="rounded-md p-2 hover:bg-red-100 hover:text-red-700"><X size={17} /></button>
          </div>
          {!board.minimized ? <div className="flex h-[calc(100%-3rem)] min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5 text-slate-700">
              {([['pen', PenLine], ['pencil', Pencil], ['highlighter', Highlighter], ['line', Slash], ['rectangle', Square], ['ellipse', Circle], ['eraser', Eraser]] as const).map(([name, Icon]) => <button key={name} type="button" title={name} onClick={() => setTool(name)} className={`rounded-md p-2 ${tool === name ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}><Icon size={16} /></button>)}
              <input type="color" title="Ink colour" value={color} onChange={(event) => setColor(event.target.value)} className="h-8 w-9" />
              <input type="range" title="Ink width" min="2" max="14" value={width} onChange={(event) => setWidth(Number(event.target.value))} className="w-24" />
              <span className="flex-1" />
              <button type="button" title="Toggle grid" onClick={() => update(board.id, (item) => ({ ...item, grid: item.grid === false }))} className={`rounded-md p-2 ${board.grid === false ? 'hover:bg-slate-100' : 'bg-slate-200'}`}><Grid3X3 size={16} /></button>
              <button type="button" title="Undo" disabled={!board.strokes.length} onClick={() => update(board.id, (item) => ({ ...item, strokes: item.strokes.slice(0, -1), redo: [...(item.redo || []), item.strokes.at(-1)!] }))} className="rounded-md p-2 hover:bg-slate-100 disabled:opacity-30"><RotateCcw size={16} /></button>
              <button type="button" title="Redo" disabled={!board.redo?.length} onClick={() => update(board.id, (item) => ({ ...item, strokes: [...item.strokes, item.redo!.at(-1)!], redo: item.redo!.slice(0, -1) }))} className="rounded-md p-2 hover:bg-slate-100 disabled:opacity-30"><Redo2 size={16} /></button>
              <button type="button" title="Clear whiteboard" onClick={() => update(board.id, (item) => ({ ...item, redo: [...(item.redo || []), ...item.strokes], strokes: [] }))} className="rounded-md p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
            </div>
            <svg className="min-h-0 w-full flex-1 touch-none bg-white" onPointerDown={(event) => startInk(board.id, event)} onPointerMove={(event) => moveInk(board.id, event)} onPointerUp={() => { drawing.current = null; }}>
              <defs><pattern id={`grid-${board.id}`} width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e2e8f0" strokeWidth="1" /></pattern></defs>
              <rect width="100%" height="100%" fill={board.grid === false ? '#ffffff' : `url(#grid-${board.id})`} />
              {board.strokes.map((stroke) => {
                const start = stroke.points[0]; const end = stroke.points.at(-1) || start;
                if (stroke.kind === 'line') return <line key={stroke.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={stroke.color} strokeWidth={stroke.width} strokeOpacity={stroke.opacity} strokeLinecap="round" />;
                if (stroke.kind === 'rectangle') return <rect key={stroke.id} x={Math.min(start.x, end.x)} y={Math.min(start.y, end.y)} width={Math.abs(end.x - start.x)} height={Math.abs(end.y - start.y)} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeOpacity={stroke.opacity} />;
                if (stroke.kind === 'ellipse') return <ellipse key={stroke.id} cx={(start.x + end.x) / 2} cy={(start.y + end.y) / 2} rx={Math.abs(end.x - start.x) / 2} ry={Math.abs(end.y - start.y) / 2} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeOpacity={stroke.opacity} />;
                return <polyline key={stroke.id} points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeOpacity={stroke.opacity} strokeLinecap="round" strokeLinejoin="round" />;
              })}
            </svg>
            <div role="separator" aria-label="Resize whiteboard" title="Drag to resize whiteboard" onPointerDown={(event) => { event.stopPropagation(); resizing.current = { boardId: board.id, startX: event.clientX, startY: event.clientY, width: board.width, height: board.height }; event.currentTarget.setPointerCapture(event.pointerId); }} className="absolute bottom-0 right-0 z-20 h-6 w-6 cursor-nwse-resize rounded-tl-lg bg-blue-900/90 after:absolute after:bottom-1 after:right-1 after:h-2 after:w-2 after:border-b-2 after:border-r-2 after:border-white" />
          </div> : null}
        </div>
      ))}
    </>
  );
}
