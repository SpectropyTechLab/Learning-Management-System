import { useEffect, useMemo, useRef, useState } from 'react';

type Word = { word: string; clue: string };
type PlacedWord = Word & { row: number; column: number; vertical: boolean; number: number };
type Layout = { cells: Map<string, string>; words: PlacedWord[]; rows: number; columns: number };

const cellKey = (row: number, column: number) => `${row},${column}`;

function buildCrossword(words: Word[]): Layout {
  const sorted = words.filter(({ word }) => word.length > 1).sort((a, b) => b.word.length - a.word.length);
  const cells = new Map<string, string>();
  const placed: Omit<PlacedWord, 'number'>[] = [];
  const put = (entry: Word, row: number, column: number, vertical: boolean) => {
    [...entry.word].forEach((letter, index) => cells.set(cellKey(row + (vertical ? index : 0), column + (vertical ? 0 : index)), letter));
    placed.push({ ...entry, row, column, vertical });
  };
  const canPlace = (word: string, row: number, column: number, vertical: boolean) => {
    const rowStep = vertical ? 1 : 0;
    const columnStep = vertical ? 0 : 1;
    if (cells.has(cellKey(row - rowStep, column - columnStep)) || cells.has(cellKey(row + rowStep * word.length, column + columnStep * word.length))) return -1;
    let crossings = 0;
    for (let index = 0; index < word.length; index += 1) {
      const targetRow = row + (vertical ? index : 0);
      const targetColumn = column + (vertical ? 0 : index);
      const existing = cells.get(cellKey(targetRow, targetColumn));
      if (existing && existing !== word[index]) return -1;
      if (existing === word[index]) crossings += 1;
      if (!existing && (cells.has(cellKey(targetRow + columnStep, targetColumn + rowStep)) || cells.has(cellKey(targetRow - columnStep, targetColumn - rowStep)))) return -1;
    }
    return crossings;
  };
  sorted.forEach((entry, entryIndex) => {
    if (!entryIndex) { put(entry, 0, 0, false); return; }
    let best: { row: number; column: number; vertical: boolean; score: number } | null = null;
    for (const current of placed) {
      for (let currentIndex = 0; currentIndex < current.word.length; currentIndex += 1) {
        for (let nextIndex = 0; nextIndex < entry.word.length; nextIndex += 1) {
          if (current.word[currentIndex] !== entry.word[nextIndex]) continue;
          const vertical = !current.vertical;
          const crossingRow = current.row + (current.vertical ? currentIndex : 0);
          const crossingColumn = current.column + (current.vertical ? 0 : currentIndex);
          const row = crossingRow - (vertical ? nextIndex : 0);
          const column = crossingColumn - (vertical ? 0 : nextIndex);
          const score = canPlace(entry.word, row, column, vertical);
          if (score > 0 && (!best || score > best.score)) best = { row, column, vertical, score };
        }
      }
    }
    if (best) put(entry, best.row, best.column, best.vertical);
    else put(entry, Math.max(...placed.map((word) => word.row + (word.vertical ? word.word.length : 1))) + 1, 0, false);
  });
  if (!placed.length) return { cells, words: [], rows: 0, columns: 0 };
  const occupied = [...cells.keys()].map((key) => key.split(',').map(Number));
  const minimumRow = Math.min(...occupied.map(([row]) => row));
  const minimumColumn = Math.min(...occupied.map(([, column]) => column));
  const normalizedCells = new Map<string, string>();
  occupied.forEach(([row, column]) => normalizedCells.set(cellKey(row - minimumRow, column - minimumColumn), cells.get(cellKey(row, column)) || ''));
  const normalized = placed.map((word) => ({ ...word, row: word.row - minimumRow, column: word.column - minimumColumn }));
  const starts = [...new Set(normalized.map((word) => cellKey(word.row, word.column)))];
  const numbered = normalized.map((word) => ({ ...word, number: starts.indexOf(cellKey(word.row, word.column)) + 1 }));
  return {
    cells: normalizedCells,
    words: numbered,
    rows: Math.max(...occupied.map(([row]) => row)) - minimumRow + 1,
    columns: Math.max(...occupied.map(([, column]) => column)) - minimumColumn + 1,
  };
}

export default function ActivityCrosswordPreview({ rows, accent, revealed, onResult }: { rows: string[][]; accent: string; revealed: boolean; onResult: (correct: number, total: number) => void }) {
  const entries = useMemo(() => rows.map(([word, clue]) => ({ word: String(word || '').toUpperCase().replace(/[^A-Z]/g, ''), clue: clue || word })).filter(({ word }) => word.length > 1), [rows]);
  const signature = entries.map(({ word }) => word).join('|');
  const layout = useMemo(() => buildCrossword(entries), [signature]);
  const [values, setValues] = useState<Record<string, string>>({});
  const resultSent = useRef(false);
  useEffect(() => { setValues({}); resultSent.current = false; }, [signature]);
  const startNumbers = Object.fromEntries(layout.words.map((word) => [cellKey(word.row, word.column), word.number]));
  const solved = layout.words.filter((word) => [...word.word].every((letter, index) => values[cellKey(word.row + (word.vertical ? index : 0), word.column + (word.vertical ? 0 : index))] === letter)).length;
  useEffect(() => {
    if (!revealed || resultSent.current || !layout.words.length) return;
    resultSent.current = true;
    onResult(solved, layout.words.length);
  }, [layout.words.length, onResult, revealed, solved]);
  if (!layout.words.length) return <p className="text-slate-300">Add crossword words and clues to begin.</p>;
  const cellSize = `min(calc((100cqw - 32px) / ${layout.columns}), calc((100cqh - 32px) / ${layout.rows}), 56px)`;
  return <div className="grid h-full min-h-0 w-full grid-cols-[42%_58%]">
    <section className="grid min-h-0 place-items-center overflow-auto p-4 [container-type:size]">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${layout.columns}, ${cellSize})`, gridTemplateRows: `repeat(${layout.rows}, ${cellSize})` }}>
        {Array.from({ length: layout.rows * layout.columns }, (_, flatIndex) => {
          const row = Math.floor(flatIndex / layout.columns); const column = flatIndex % layout.columns; const key = cellKey(row, column); const answer = layout.cells.get(key);
          if (!answer) return <span key={key}/>;
          const enteredValue = values[key] || ''; const value = revealed ? answer : enteredValue; const correct = enteredValue === answer;
          return <label key={key} className={`relative overflow-hidden rounded-[3px] border-2 ${revealed ? (correct ? 'border-emerald-300 bg-emerald-500/25' : 'border-red-300 bg-red-500/25') : 'border-white/25 bg-slate-900/90'}`}>
            <span className="absolute left-0.5 top-0 text-[clamp(6px,1.2cqh,10px)] font-bold text-slate-400">{startNumbers[key] || ''}</span>
            <input value={value} disabled={revealed} maxLength={1} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1) }))} className="h-full w-full bg-transparent pt-1 text-center text-[clamp(12px,3cqh,24px)] font-black uppercase text-white outline-none focus:bg-amber-300/10" aria-label={`Crossword row ${row + 1}, column ${column + 1}`}/>
          </label>;
        })}
      </div>
    </section>
    <aside className="min-h-0 overflow-auto border-l border-white/15 p-5">
      <h3 className="text-lg font-black" style={{ color: accent }}>Crossword</h3>
      <div className="mt-4 grid gap-5 text-sm">
        <div><b className="text-slate-100">ACROSS</b><div className="mt-2 grid gap-2">{layout.words.filter((word) => !word.vertical).sort((a, b) => a.number - b.number).map((word) => <p key={`across-${word.number}`} className="text-slate-200"><b style={{ color: accent }}>{word.number}</b> {word.clue} <span className="text-slate-400">({word.word.length})</span></p>)}</div></div>
        <div><b className="text-slate-100">DOWN</b><div className="mt-2 grid gap-2">{layout.words.filter((word) => word.vertical).sort((a, b) => a.number - b.number).map((word) => <p key={`down-${word.number}`} className="text-slate-200"><b style={{ color: accent }}>{word.number}</b> {word.clue} <span className="text-slate-400">({word.word.length})</span></p>)}</div></div>
      </div>
      <p className="mt-5 text-xs text-slate-300">{solved} / {layout.words.length} words</p>
    </aside>
  </div>;
}
