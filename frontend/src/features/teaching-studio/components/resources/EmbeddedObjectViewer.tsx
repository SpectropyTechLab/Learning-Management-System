import { useState } from 'react';
import { Download, ExternalLink, FileSpreadsheet } from 'lucide-react';
import type { StudioObjectPreviewDescriptor } from '../../api/studioResourcesApi';

interface Props {
  descriptor: StudioObjectPreviewDescriptor;
  className?: string;
}

export default function EmbeddedObjectViewer({ descriptor, className = '' }: Props) {
  const [sheetIndex, setSheetIndex] = useState(0);
  if (descriptor.mode === 'pdf' && descriptor.url) {
    return <iframe title={descriptor.name} src={descriptor.url} className={`h-full w-full border-0 bg-white ${className}`} />;
  }
  if (descriptor.mode === 'interactive' && descriptor.url) {
    return (
      <div className={`relative h-full w-full bg-white ${className}`}>
        <iframe title={descriptor.name} src={descriptor.url} sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts" className="h-full w-full border-0" />
        <a href={descriptor.url} target="_blank" rel="noreferrer" className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-slate-950/80 px-3 py-2 text-xs font-semibold text-white"><ExternalLink size={14} />Open source</a>
      </div>
    );
  }
  if (descriptor.mode === 'text') {
    return <article className={`h-full overflow-auto whitespace-pre-wrap bg-white p-6 text-sm leading-6 text-slate-800 ${className}`}>{descriptor.text || 'This document contains no readable text.'}{descriptor.truncated ? '\n\nPreview shortened. Download the original for the complete document.' : ''}</article>;
  }
  if (descriptor.mode === 'workbook') {
    const sheet = descriptor.sheets?.[sheetIndex];
    return (
      <div className={`flex h-full min-h-0 flex-col bg-white ${className}`}>
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b bg-slate-50 p-2">
          {(descriptor.sheets || []).map((item, index) => <button key={`${item.name}-${index}`} type="button" onClick={() => setSheetIndex(index)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${index === sheetIndex ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700'}`}>{item.name}</button>)}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {sheet ? <table className="min-w-full border-collapse text-xs"><tbody>{sheet.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="max-w-80 border border-slate-200 px-2 py-1.5 align-top">{String(cell ?? '')}</td>)}</tr>)}</tbody></table> : <div className="grid h-full place-items-center text-slate-500"><FileSpreadsheet size={38} /><span>No worksheet data</span></div>}
        </div>
      </div>
    );
  }
  return (
    <div className={`grid place-items-center bg-slate-100 p-6 text-center ${className}`}>
      <div><p className="font-semibold text-slate-900">{descriptor.original_file_name || descriptor.name}</p><p className="mt-1 text-sm text-slate-600">This file opens in its compatible application.</p>{descriptor.url ? <a href={descriptor.url} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white"><Download size={16} />Download original</a> : null}</div>
    </div>
  );
}
