import { useMemo } from 'react';
import { sanitizeHtml } from '@/utils/htmlSanitizer';
import type { CurriculumDocumentPreview } from '../api/studioDocumentsApi';

interface Props {
  preview: CurriculumDocumentPreview;
  className?: string;
}

export default function CurriculumDocumentViewer({ preview, className = '' }: Props) {
  const safeHtml = useMemo(() => {
    const sanitized = sanitizeHtml(preview.html || '');
    if (!sanitized || typeof document === 'undefined') return sanitized;
    const template = document.createElement('template');
    template.innerHTML = sanitized;
    template.content.querySelectorAll('table').forEach((table) => {
      const scrollContainer = document.createElement('div');
      scrollContainer.className = 'curriculum-table-scroll';
      table.replaceWith(scrollContainer);
      scrollContainer.appendChild(table);
    });
    return template.innerHTML;
  }, [preview.html]);

  if (!safeHtml) {
    return (
      <pre className={`whitespace-pre-wrap font-sans text-sm leading-6 text-slate-800 ${className}`}>
        {preview.text || 'The document contains no extractable content.'}
      </pre>
    );
  }

  return (
    <article
      className={`curriculum-document-viewer min-w-0 text-sm leading-6 text-slate-800
        [&_h1]:mb-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:text-slate-950
        [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:border-b [&_h2]:border-slate-200 [&_h2]:pb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-950
        [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900
        [&_h4]:mb-2 [&_h4]:mt-5 [&_h4]:font-semibold [&_h4]:text-slate-900
        [&_p]:my-3 [&_.document-subtitle]:text-base [&_.document-subtitle]:text-slate-600
        [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1
        [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:bg-slate-50 [&_blockquote]:px-4 [&_blockquote]:py-2
        [&_a]:font-medium [&_a]:text-blue-700 [&_a]:underline [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full
        [&_.curriculum-table-scroll]:my-5 [&_.curriculum-table-scroll]:w-full [&_.curriculum-table-scroll]:overflow-x-auto [&_.curriculum-table-scroll]:rounded-lg [&_.curriculum-table-scroll]:border [&_.curriculum-table-scroll]:border-slate-300
        [&_table]:w-full [&_table]:min-w-[640px] [&_table]:border-collapse [&_table]:whitespace-normal
        [&_tr]:border-b [&_tr]:border-slate-200 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-slate-900
        [&_td]:border [&_td]:border-slate-300 [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-top [&_td_p]:my-0 [&_tr:nth-child(even)_td]:bg-slate-50/70
        [&_tr:first-child_td]:bg-slate-100 [&_tr:first-child_td]:font-semibold [&_tr:first-child_td]:text-slate-900
        ${className}`}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
