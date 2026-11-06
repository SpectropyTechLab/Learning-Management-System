import { useEffect, useRef } from 'react';
import type { MathfieldElement } from 'mathlive';
import 'mathlive/fonts.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export default function MathLiveEquationEditor({
  value,
  onChange,
  ariaLabel = 'Equation editor',
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mathfieldRef = useRef<MathfieldElement | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let handleInput: (() => void) | null = null;
    void import('mathlive').then(({ MathfieldElement: Mathfield }) => {
      if (disposed) return;
      const mathfield = new Mathfield();
      mathfield.setAttribute('aria-label', ariaLabel);
      mathfield.setAttribute('virtual-keyboard-mode', 'onfocus');
      mathfield.className = 'studio-mathfield';
      mathfield.value = valueRef.current;
      handleInput = () => onChangeRef.current(mathfield.getValue('latex'));
      mathfield.addEventListener('input', handleInput);
      host.appendChild(mathfield);
      mathfieldRef.current = mathfield;
    });
    return () => {
      disposed = true;
      const mathfield = mathfieldRef.current;
      if (mathfield && handleInput) mathfield.removeEventListener('input', handleInput);
      mathfield?.remove();
      mathfieldRef.current = null;
    };
  }, [ariaLabel]);

  useEffect(() => {
    const mathfield = mathfieldRef.current;
    valueRef.current = value;
    if (mathfield && mathfield.getValue('latex') !== value) mathfield.value = value;
  }, [value]);

  return (
    <div
      ref={hostRef}
      className="rounded-xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-blue-700 focus-within:ring-2 focus-within:ring-blue-100"
    />
  );
}
