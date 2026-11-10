import type { ReactNode } from 'react';
import { normalizeStudioHyperlink } from './studioHyperlinkModel';

export default function StudioHyperlinkOverlay({
  hyperlink,
  active,
  children,
}: {
  hyperlink: unknown;
  active: boolean;
  children: ReactNode;
}) {
  const link = normalizeStudioHyperlink(hyperlink);
  if (!link || !active) return children;
  return (
    <a
      href={link.url}
      target={link.target}
      rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
      title={link.tooltip || `Open ${link.url}`}
      aria-label={link.tooltip || `Open linked content: ${link.url}`}
      className="block h-full w-full cursor-pointer"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  );
}
