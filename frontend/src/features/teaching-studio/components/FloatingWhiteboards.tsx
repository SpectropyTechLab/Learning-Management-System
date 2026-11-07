import { useEffect, useRef, useState } from 'react';
import { Eraser, GripHorizontal, Highlighter, Minus, PenLine, Plus, RotateCcw, Trash2, X } from 'lucide-react';

type Point = { x: number; y: number };
type Stroke = { id: string; color: string; width: number; opacity: number; points: Point[] };
type Board = { id: string; title: string; x: number; y: number; width: number; height: number; minimized: boolean; strokes: Stroke[] };
type Tool = 'pen' | 'highlighter' | 'eraser';

const freshBoard = (offset = 0): Board => ({
  id: crypto.randomUUID(), title: 'Teacher whiteboard', x: 80 + offset, y: 90 + offset,
  width: 620, height: 420, minimized: false, strokes: [],
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
    update(boardId, (board) => ({ ...board, strokes: [...board.strokes, { id: strokeId, color, width: tool === 'highlighter' ? width * 3 : width, opacity: tool === 'highlighter' ? 0.3 : 1, points: [point] }] }));
  };
  const moveInk = (boardId: string, event: React.PointerEvent<SVGSVGElement>) => {
    if (tool === 'eraser' && event.buttons) return startInk(boardId, event);
    if (drawing.current?.boardId !== boardId) return;
    const point = pointFrom(event);
    update(boardId, (board) => ({ ...board, strokes: board.strokes.map((stroke) => stroke.id === drawing.current?.strokeId ? { ...stroke, points: [...stroke.points, point] } : stroke) }));
  };
  const moveBoard = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const { boardId, dx, dy } = dragging.current;
    update(boardId, (board) => ({ ...board, x: Math.max(0, event.clientX - dx), y: Math.max(0, event.clientY - dy) }));
  };

  return (
    <>
      <button type="button" onClick={() => setBoards((current) => [...current, freshBoard((current.length % 4) * 28)])} className="fixed bottom-20 right-5 z-[70] inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-blue-950 shadow-xl ring-1 ring-slate-300" title="Add floating whiteboard"><Plus size={18} />Whiteboard</button>
      {boards.map((board) => (
        <div key={board.id} onPointerMove={moveBoard} onPointerUp={() => { dragging.current = null; drawing.current = null; }} className="fixed z-[80] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl" style={{ left: board.x, top: board.y, width: board.minimized ? 310 : board.width, height: board.minimized ? 48 : board.height }}>
          <div onPointerDown={(event) => { dragging.current = { boardId: board.id, dx: event.clientX - board.x, dy: event.clientY - board.y }; event.currentTarget.setPointerCapture(event.pointerId); }} className="flex h-12 cursor-move items-center gap-2 border-b bg-slate-50 px-3 text-slate-800">
            <GripHorizontal size={17} /><span className="flex-1 text-sm font-bold">{board.title}</span>
            <button type="button" title="Minimize whiteboard" onClick={() => update(board.id, (item) => ({ ...item, minimized: !item.minimized }))}>{board.minimized ? <Plus size={17} /> : <Minus size={17} />}</button>
            <button type="button" title="Close whiteboard" onClick={() => setBoards((current) => current.filter((item) => item.id !== board.id))}><X size={17} /></button>
          </div>
          {!board.minimized ? <>
            <div className="flex h-11 items-center gap-1 border-b px-2 text-slate-700">
              {([['pen', PenLine], ['highlighter', Highlighter], ['eraser', Eraser]] as const).map(([name, Icon]) => <button key={name} type="button" title={name} onClick={() => setTool(name)} className={`rounded-md p-2 ${tool === name ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}><Icon size={16} /></button>)}
              <input type="color" title="Ink colour" value={color} onChange={(event) => setColor(event.target.value)} className="h-8 w-9" />
              <input type="range" title="Ink width" min="2" max="14" value={width} onChange={(event) => setWidth(Number(event.target.value))} className="w-24" />
              <span className="flex-1" />
              <button type="button" title="Undo stroke" onClick={() => update(board.id, (item) => ({ ...item, strokes: item.strokes.slice(0, -1) }))} className="rounded-md p-2 hover:bg-slate-100"><RotateCcw size={16} /></button>
              <button type="button" title="Clear whiteboard" onClick={() => update(board.id, (item) => ({ ...item, strokes: [] }))} className="rounded-md p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
            </div>
            <svg className="h-[calc(100%-5.75rem)] w-full touch-none bg-white" onPointerDown={(event) => startInk(board.id, event)} onPointerMove={(event) => moveInk(board.id, event)} onPointerUp={() => { drawing.current = null; }}>
              <defs><pattern id={`grid-${board.id}`} width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e2e8f0" strokeWidth="1" /></pattern></defs>
              <rect width="100%" height="100%" fill={`url(#grid-${board.id})`} />
              {board.strokes.map((stroke) => <polyline key={stroke.id} points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeOpacity={stroke.opacity} strokeLinecap="round" strokeLinejoin="round" />)}
            </svg>
          </> : null}
        </div>
      ))}
    </>
  );
}
