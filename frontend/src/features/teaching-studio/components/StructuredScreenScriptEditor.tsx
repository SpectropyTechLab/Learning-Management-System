import { Plus, Trash2 } from 'lucide-react';
import type { ScreenScriptBlock, ScreenScriptContent } from '../api/studioDocumentsApi';

const requiredSections = new Set([
  'Layout Skeleton (in detail)',
  'Title',
  'Overall Screen Content',
  'Animation Timeline',
  'Teacher Narration — Dialogue & Sections',
]);

export default function StructuredScreenScriptEditor({ content, editable, onChange }: {
  content: ScreenScriptContent;
  editable: boolean;
  onChange: (content: ScreenScriptContent) => void;
}) {
  const sections = content.sections ?? [];
  const updateBlock = (sectionIndex: number, blockIndex: number, block: ScreenScriptBlock) => {
    onChange({
      ...content,
      sections: sections.map((section, index) => index !== sectionIndex ? section : {
        ...section,
        blocks: section.blocks.map((item, itemIndex) => itemIndex === blockIndex ? block : item),
      }),
    });
  };

  return <div className="space-y-4">
    {sections.map((section, sectionIndex) => (
      <details key={`${section.key}-${sectionIndex}`} open={requiredSections.has(section.label)} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer select-none bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900">
          {section.label} <span className={`ml-2 text-xs font-semibold ${requiredSections.has(section.label) ? 'text-blue-800' : 'text-slate-400'}`}>{requiredSections.has(section.label) ? 'Required' : 'Optional'}</span>
        </summary>
        <div className="space-y-4 p-4">
          {section.blocks.map((block, blockIndex) => {
            if (block.type === 'image') return <figure key={blockIndex} className="rounded-lg border bg-slate-50 p-2"><img src={block.src} alt={block.alt} className="max-h-72 w-full object-contain" /><figcaption className="mt-1 text-xs text-slate-500">{block.alt}</figcaption></figure>;
            if (block.type === 'paragraph') return <textarea key={blockIndex} readOnly={!editable} rows={3} value={block.text} onChange={(event) => updateBlock(sectionIndex, blockIndex, { ...block, text: event.target.value })} className="w-full resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-blue-700 read-only:bg-slate-50" />;
            if (block.type === 'list') return <textarea key={blockIndex} readOnly={!editable} rows={Math.max(3, block.items.length)} value={block.items.join('\n')} onChange={(event) => updateBlock(sectionIndex, blockIndex, { ...block, items: event.target.value.split(/\r?\n/) })} className="w-full resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-blue-700 read-only:bg-slate-50" />;
            return <div key={blockIndex} className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead className="bg-slate-100 text-slate-700"><tr>{block.columns.map((column, columnIndex) => <th key={columnIndex} className="min-w-40 border-b border-r border-slate-200 p-2 last:border-r-0"><input readOnly={!editable} value={column} onChange={(event) => updateBlock(sectionIndex, blockIndex, { ...block, columns: block.columns.map((value, index) => index === columnIndex ? event.target.value : value) })} className="w-full bg-transparent font-bold outline-none" /></th>)}</tr></thead>
                <tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex} className="align-top even:bg-slate-50">{block.columns.map((_, columnIndex) => <td key={columnIndex} className="border-b border-r border-slate-200 p-1 last:border-r-0"><textarea readOnly={!editable} rows={2} value={row[columnIndex] ?? ''} onChange={(event) => updateBlock(sectionIndex, blockIndex, { ...block, rows: block.rows.map((values, index) => index === rowIndex ? block.columns.map((__, cellIndex) => cellIndex === columnIndex ? event.target.value : values[cellIndex] ?? '') : values) })} className="min-w-40 w-full resize-y rounded border border-transparent bg-transparent p-1 outline-none focus:border-blue-400 read-only:cursor-default" /></td>)}{editable ? <td className="border-b p-1"><button type="button" title="Remove row" onClick={() => updateBlock(sectionIndex, blockIndex, { ...block, rows: block.rows.filter((_, index) => index !== rowIndex) })} className="rounded p-2 text-red-700 hover:bg-red-50"><Trash2 size={14} /></button></td> : null}</tr>)}</tbody>
              </table>
              {editable ? <button type="button" onClick={() => updateBlock(sectionIndex, blockIndex, { ...block, rows: [...block.rows, block.columns.map(() => '')] })} className="m-2 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-blue-800"><Plus size={13} />Add row</button> : null}
            </div>;
          })}
        </div>
      </details>
    ))}
  </div>;
}
