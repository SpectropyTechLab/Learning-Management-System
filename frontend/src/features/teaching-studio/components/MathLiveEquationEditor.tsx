import { useEffect, useRef } from 'react';
import { Keyboard, Menu } from 'lucide-react';
import type { MathfieldElement } from 'mathlive';
import 'mathlive/fonts.css';

type EquationControlDetail = { elementId: string; action: 'keyboard' | 'menu' | 'insert'; x?: number; y?: number; latex?: string };
type EquationControlWindow = Window & { __studioPendingEquationControl?: EquationControlDetail; __studioActiveEquationElementId?: string };

function runEquationControl(mathfield: MathfieldElement, detail: EquationControlDetail) {
  if (detail.action === 'insert' && detail.latex) {
    mathfield.focus();
    mathfield.executeCommand(['insert', detail.latex]);
    return;
  }
  const openWhenReady = () => {
    if (!mathfield.isConnected) return;
    mathfield.focus({ preventScroll: true });
    window.requestAnimationFrame(() => {
      if (!mathfield.isConnected) return;
      mathfield.focus({ preventScroll: true });
      if (detail.action === 'keyboard') {
        mathfield.executeCommand('showVirtualKeyboard');
        window.mathVirtualKeyboard?.show({ animate: true });
      } else {
        mathfield.showMenu({ location: { x: detail.x ?? 0, y: detail.y ?? 0 }, modifiers: { alt: false, control: false, meta: false, shift: false } });
      }
    });
  };
  window.requestAnimationFrame(openWhenReady);
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  compact?: boolean;
  controlsOnly?: boolean;
  elementId?: string;
  canvas?: boolean;
  onRequestControl?: (action: 'keyboard' | 'menu', location?: { x: number; y: number }) => void;
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
  compact = false,
  controlsOnly = false,
  elementId,
  canvas = false,
  onRequestControl,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mathfieldRef = useRef<MathfieldElement | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (controlsOnly) return;
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let handleInput: (() => void) | null = null;
    let handleFocus: (() => void) | null = null;
    void import('mathlive').then(({ MathfieldElement: Mathfield }) => {
      if (disposed) return;
      const mathfield = new Mathfield();
      mathfield.setAttribute('aria-label', ariaLabel);
      mathfield.mathVirtualKeyboardPolicy = 'manual';
      mathfield.className = `${compact ? 'studio-mathfield studio-mathfield-compact' : 'studio-mathfield'}${canvas ? ' studio-mathfield-canvas' : ''}`;
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
      handleFocus = () => { if (elementId) (window as EquationControlWindow).__studioActiveEquationElementId = elementId; };
      mathfield.addEventListener('focus', handleFocus);
      host.appendChild(mathfield);
      mathfieldRef.current = mathfield;
      const controlWindow = window as EquationControlWindow;
      if (elementId && controlWindow.__studioPendingEquationControl?.elementId === elementId) {
        runEquationControl(mathfield, controlWindow.__studioPendingEquationControl);
        delete controlWindow.__studioPendingEquationControl;
      }
    });
    return () => {
      disposed = true;
      const mathfield = mathfieldRef.current;
      if (mathfield && handleInput) mathfield.removeEventListener('input', handleInput);
      if (mathfield && handleFocus) mathfield.removeEventListener('focus', handleFocus);
      const controlWindow = window as EquationControlWindow;
      if (elementId && controlWindow.__studioActiveEquationElementId === elementId) delete controlWindow.__studioActiveEquationElementId;
      mathfield?.remove();
      mathfieldRef.current = null;
    };
  }, [ariaLabel, canvas, compact, controlsOnly, elementId]);

  useEffect(() => {
    if (controlsOnly || !elementId) return;
    const handleControl = (event: Event) => {
      const detail = (event as CustomEvent<EquationControlDetail>).detail;
      if (detail?.elementId !== elementId) return;
      const mathfield = mathfieldRef.current;
      if (!mathfield) return;
      runEquationControl(mathfield, detail);
    };
    window.addEventListener('studio-equation-control', handleControl);
    return () => window.removeEventListener('studio-equation-control', handleControl);
  }, [controlsOnly, elementId]);

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

  if (controlsOnly) return (
    <div className="relative flex items-center gap-1" aria-label="Equation input tools">
      <button type="button" title="Open equation keyboard" aria-label="Open equation keyboard" onClick={() => { const targetId = elementId ?? (window as EquationControlWindow).__studioActiveEquationElementId; if (targetId) window.dispatchEvent(new CustomEvent('studio-equation-control', { detail: { elementId: targetId, action: 'keyboard' } })); else onRequestControl?.('keyboard'); }} className="studio-equation-ribbon-action"><Keyboard size={16} /><span>Keyboard</span></button>
      <button ref={menuButtonRef} type="button" title="Open equation menu" aria-label="Open equation menu" onClick={() => { const button = menuButtonRef.current; if (!button) return; const rect = button.getBoundingClientRect(); const location = { x: rect.left + rect.width / 2, y: rect.bottom }; const targetId = elementId ?? (window as EquationControlWindow).__studioActiveEquationElementId; if (targetId) window.dispatchEvent(new CustomEvent('studio-equation-control', { detail: { elementId: targetId, action: 'menu', ...location } })); else onRequestControl?.('menu', location); }} className="studio-equation-ribbon-action"><Menu size={16} /><span>Menu</span></button>
    </div>
  );

  return (
    <div
      ref={hostRef}
      data-canvas-interactive={canvas ? 'true' : undefined}
      className={canvas ? 'h-full w-full' : `${compact ? 'rounded-md p-1' : 'rounded-xl p-2 shadow-sm'} border border-slate-300 bg-white focus-within:border-blue-700 focus-within:ring-2 focus-within:ring-blue-100`}
    />
  );
}
