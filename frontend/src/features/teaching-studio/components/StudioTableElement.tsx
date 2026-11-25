import { useEffect, useMemo, useState } from 'react';
import { studioAnimationStyle } from './studioAnimationRuntime';

export type StudioTableAction =
  | 'insert-row-above' | 'insert-row-below' | 'insert-column-left' | 'insert-column-right'
  | 'delete-row' | 'delete-column' | 'merge-right' | 'split-cell' | 'clear-cell';

type TableMerge = { row: number; column: number; rowSpan?: number; colSpan?: number };

type Props = {
  elementId: string;
  content: Record<string, unknown>;
  editable: boolean;
  onChange?: (changes: Record<string, unknown>) => void;
  animationBuildState?: {
    sequence: string;
    visibleItems: ReadonlySet<number>;
    activeItem: number | null;
    effect?: Record<string, unknown>;
  } | null;
};

const normalizedRows = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) return Array.from({ length: 3 }, () => Array(4).fill('')) as string[][];
  const width = Math.max(1, ...value.map((row) => Array.isArray(row) ? row.length : 0));
  return value.map((row) => Array.from({ length: width }, (_, column) => String(Array.isArray(row) ? row[column] ?? '' : '')));
};

export default function StudioTableElement({ elementId, content, editable, onChange, animationBuildState }: Props) {
  const rows = useMemo(() => normalizedRows(content.rows), [content.rows]);
  const merges = useMemo(() => Array.isArray(content.merges) ? content.merges as TableMerge[] : [], [content.merges]);
  const [activeCell, setActiveCell] = useState({ row: 0, column: 0 });
  const rowCount = rows.length;
  const columnCount = rows[0]?.length ?? 1;

  useEffect(() => {
    const handleControl = (event: Event) => {
      const detail = (event as CustomEvent<{ elementId: string; action: StudioTableAction }>).detail;
      if (!editable || detail?.elementId !== elementId || !onChange) return;
      const row = Math.min(activeCell.row, rowCount - 1);
      const column = Math.min(activeCell.column, columnCount - 1);
      const next = rows.map((values) => [...values]);
      if (detail.action === 'insert-row-above' || detail.action === 'insert-row-below') {
        next.splice(row + (detail.action === 'insert-row-below' ? 1 : 0), 0, Array(columnCount).fill(''));
        onChange({ rows: next, merges: [] }); return;
      }
      if (detail.action === 'insert-column-left' || detail.action === 'insert-column-right') {
        const insertAt = column + (detail.action === 'insert-column-right' ? 1 : 0);
        next.forEach((values) => values.splice(insertAt, 0, ''));
        onChange({ rows: next, merges: [] }); return;
      }
      if (detail.action === 'delete-row' && rowCount > 1) {
        next.splice(row, 1); setActiveCell({ row: Math.max(0, row - 1), column }); onChange({ rows: next, merges: [] }); return;
      }
      if (detail.action === 'delete-column' && columnCount > 1) {
        next.forEach((values) => values.splice(column, 1)); setActiveCell({ row, column: Math.max(0, column - 1) }); onChange({ rows: next, merges: [] }); return;
      }
      if (detail.action === 'clear-cell') {
        next[row][column] = ''; onChange({ rows: next }); return;
      }
      if (detail.action === 'merge-right' && column < columnCount - 1) {
        next[row][column] = [next[row][column], next[row][column + 1]].filter(Boolean).join(' ');
        next[row][column + 1] = '';
        onChange({ rows: next, merges: [...merges.filter((merge) => merge.row !== row || merge.column !== column), { row, column, colSpan: 2 }] }); return;
      }
      if (detail.action === 'split-cell') onChange({ merges: merges.filter((merge) => merge.row !== row || merge.column !== column) });
    };
    window.addEventListener('studio-table-control', handleControl);
    return () => window.removeEventListener('studio-table-control', handleControl);
  }, [activeCell, columnCount, editable, elementId, merges, onChange, rowCount, rows]);

  const covered = (row: number, column: number) => merges.some((merge) => {
    const rowSpan = Math.max(1, Number(merge.rowSpan) || 1);
    const colSpan = Math.max(1, Number(merge.colSpan) || 1);
    return row >= merge.row && row < merge.row + rowSpan && column >= merge.column && column < merge.column + colSpan && (row !== merge.row || column !== merge.column);
  });
  const borderWidth = Math.max(0, Number(content.borderWidth) || 1);
  const borderStyle = String(content.borderStyle || 'solid');
  const borderColor = String(content.borderColor || '#64748b');
  const cellMargin = Math.max(0, Number(content.cellMargin) || 8);
  const alignment = String(content.alignment || 'left') as 'left' | 'center' | 'right';
  const verticalAlignment = String(content.verticalAlignment || 'middle');
  const cellStyles = Array.isArray(content.cellStyles) ? content.cellStyles as Array<Array<Record<string, unknown>>> : [];

  return <div className={`h-full w-full overflow-auto ${content.effect === 'shadow' ? 'drop-shadow-lg' : ''}`} data-canvas-interactive="true">
    <table aria-label={String(content.altText || 'Imported table')} className="h-full w-full table-fixed border-collapse" style={{ color: String(content.textColor || '#0f172a'), fontSize: Number(content.fontSize) || 22 }}>
      <tbody>
        {rows.map((values, row) => <tr key={row}>
          {values.map((value, column) => {
            if (covered(row, column)) return null;
            const merge = merges.find((candidate) => candidate.row === row && candidate.column === column);
            const header = content.headerRow === true && row === 0;
            const total = content.totalRow === true && row === rowCount - 1;
            const first = content.firstColumn === true && column === 0;
            const last = content.lastColumn === true && column === columnCount - 1;
            const bandedRow = content.bandedRows === true && row % 2 === 1;
            const bandedColumn = content.bandedColumns === true && column % 2 === 1;
            const sourceStyle = cellStyles[row]?.[column] || {};
            const backgroundColor = header || total
              ? String(sourceStyle.fill || content.headerFill || '#1d4ed8')
              : String(sourceStyle.fill || (bandedRow || bandedColumn ? content.bandFill || '#dbeafe' : content.cellFill || '#ffffff'));
            const textColor = String(sourceStyle.color || ((header || total) && !sourceStyle.fill ? content.headerTextColor || '#ffffff' : content.textColor || '#0f172a'));
            const selected = editable && activeCell.row === row && activeCell.column === column;
            const buildItem = animationBuildState?.sequence === 'by-row' ? row
              : animationBuildState?.sequence === 'by-column' ? column
                : row * columnCount + column;
            const buildVisible = !animationBuildState || animationBuildState.visibleItems.has(buildItem);
            const buildActive = animationBuildState?.activeItem === buildItem && animationBuildState.effect
              ? studioAnimationStyle({ effects: [animationBuildState.effect] })
              : {};
            return <td key={column} rowSpan={Math.max(1, Number(merge?.rowSpan) || 1)} colSpan={Math.max(1, Number(merge?.colSpan) || 1)} onClick={() => setActiveCell({ row, column })} style={{ border: `${borderWidth}px ${borderStyle} ${borderColor}`, backgroundColor, padding: cellMargin, textAlign: (sourceStyle.alignment as 'left' | 'center' | 'right') || alignment, verticalAlign: (sourceStyle.verticalAlignment as 'top' | 'middle' | 'bottom') || verticalAlignment as 'top' | 'middle' | 'bottom', fontWeight: header || total || first || last ? 700 : 400, outline: selected ? '3px solid #2563eb' : undefined, outlineOffset: -3, opacity: buildVisible ? 1 : 0, ...buildActive }}>
              <div contentEditable={editable} suppressContentEditableWarning onFocus={() => setActiveCell({ row, column })} onBlur={(event) => { const text = event.currentTarget.textContent ?? ''; if (text === value || !onChange) return; const next = rows.map((items) => [...items]); next[row][column] = text; onChange({ rows: next }); }} style={{ color: textColor, fontSize: Number(sourceStyle.fontSize) || Number(content.fontSize) || 22, fontWeight: sourceStyle.bold === true || header || total || first || last ? 700 : 400, fontStyle: sourceStyle.italic === true ? 'italic' : undefined }} className="min-h-[1.4em] w-full outline-none">{value}</div>
            </td>;
          })}
        </tr>)}
      </tbody>
    </table>
  </div>;
}
