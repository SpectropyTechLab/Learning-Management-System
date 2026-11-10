import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface StudioIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  icon: ReactNode;
  tone?: 'default' | 'primary' | 'danger';
  active?: boolean;
}

export default function StudioIconButton({
  label,
  icon,
  tone = 'default',
  active = false,
  className = '',
  ...buttonProps
}: StudioIconButtonProps) {
  const toneClass = tone === 'primary'
    ? 'border-blue-900 bg-blue-900 text-white hover:bg-blue-800'
    : tone === 'danger'
      ? 'border-red-200 text-red-700 hover:bg-red-50'
      : active
        ? 'border-blue-900 bg-blue-50 text-blue-900'
        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100';

  return (
    <button
      type="button"
      aria-label={label}
      title={buttonProps.title ?? label}
      {...buttonProps}
      className={`studio-icon-button group relative inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10 ${toneClass} ${className}`}
    >
      {icon}
    </button>
  );
}
