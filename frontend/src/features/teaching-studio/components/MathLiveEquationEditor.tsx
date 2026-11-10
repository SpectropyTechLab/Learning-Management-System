import { useEffect, useRef } from 'react';
import type { MathfieldElement } from 'mathlive';
import 'mathlive/fonts.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

const MATRIX_ENVIRONMENTS =
  /\\begin\{(matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|smallmatrix|cases)\}([\s\S]*?)\\end\{\1\}/g;

function restoreEmptyPlaceholders(latex: string) {
  const withMatrixPlaceholders = latex.replace(
    MATRIX_ENVIRONMENTS,
    (_environment, name: string, body: string) => {
      const rows = body.split(/\\\\/).map((row) =>
        row
          .split('&')
          .map((cell) => (cell.trim() ? cell.trim() : String.raw`\placeholder{}`))
          .join(' & '),
      );
      return `\\begin{${name}}${rows.join(String.raw` \\ `)}\\end{${name}}`;
    },
  );

  return withMatrixPlaceholders
    .replace(
      /\\(frac|dfrac|tfrac|binom|sqrt|overset|underset)\s*\{\s*\}/g,
      String.raw`\$1{\placeholder{}}`,
    )
    .replace(/([_^])\s*\{\s*\}/g, String.raw`$1{\placeholder{}}`);
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
      mathfield.placeholderSymbol = '⬚';
      mathfield.style.setProperty('--placeholder-color', '#94a3b8');
      mathfield.style.setProperty('--placeholder-opacity', '1');
      mathfield.value = restoreEmptyPlaceholders(valueRef.current);
      handleInput = () => {
        const latex = mathfield.getValue('latex');
        const restoredLatex = restoreEmptyPlaceholders(latex);
        if (restoredLatex !== latex) {
          const caretPosition = mathfield.position;
          mathfield.value = restoredLatex;
          mathfield.position = Math.min(caretPosition, mathfield.lastOffset);
        }
        onChangeRef.current(restoredLatex);
      };
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
    const restoredValue = restoreEmptyPlaceholders(value);
    if (
      mathfield &&
      restoreEmptyPlaceholders(mathfield.getValue('latex')) !== restoredValue
    ) {
      mathfield.value = restoredValue;
    }
  }, [value]);

  return (
    <div
      ref={hostRef}
      className="rounded-xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-blue-700 focus-within:ring-2 focus-within:ring-blue-100"
    />
  );
}
