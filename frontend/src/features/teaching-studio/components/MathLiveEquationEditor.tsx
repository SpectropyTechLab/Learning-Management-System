import { useEffect, useRef } from 'react';
import { Keyboard, Menu } from 'lucide-react';
import type { MathfieldElement } from 'mathlive';
import 'mathlive/fonts.css';
import { stripEquationEditingPlaceholders } from './studioEquationPlaceholders';
import { equationControlTarget, shouldCloseEquationKeyboard } from './studioEquationControlModel';

type EquationControlDetail = { elementId: string; action: 'keyboard' | 'menu' | 'insert'; x?: number; y?: number; latex?: string };
type EquationControlWindow = Window & {
  __studioPendingEquationControl?: EquationControlDetail;
  __studioActiveEquationElementId?: string;
  __studioKeyboardEquationElementId?: string;
};

function equationMenuIsOpen(mathfield: MathfieldElement) {
  const internal = mathfield as unknown as {
    _mathfield?: { menu?: { state?: string } };
  };
  return internal._mathfield?.menu?.state === 'open';
}

const nextAnimationFrame = () => new Promise<void>((resolve) => {
  window.requestAnimationFrame(() => resolve());
});

const removeKeyboardCloseButton = () => document.getElementById('studio-equation-keyboard-close')?.remove();

const showKeyboardCloseButton = (mathfield: MathfieldElement, elementId: string) => {
  removeKeyboardCloseButton();
  window.requestAnimationFrame(() => {
    const keyboard = document.querySelector<HTMLElement>('.ML__keyboard.is-visible');
    if (!keyboard) return;
    const close = document.createElement('button');
    close.id = 'studio-equation-keyboard-close';
    close.type = 'button';
    close.className = 'studio-equation-keyboard-close';
    close.title = 'Close equation keyboard';
    close.setAttribute('aria-label', 'Close equation keyboard');
    close.textContent = '\u00d7';
    close.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    close.addEventListener('click', (event) => {
      event.stopPropagation();
      mathfield.executeCommand('hideVirtualKeyboard');
      window.mathVirtualKeyboard?.hide({ animate: true });
      delete (window as EquationControlWindow).__studioKeyboardEquationElementId;
      removeKeyboardCloseButton();
    });
    const keyboardPlate = keyboard.querySelector<HTMLElement>('.MLK__plate');
    if (!keyboardPlate) return;
    keyboardPlate.appendChild(close);
  });
};

async function runEquationControl(mathfield: MathfieldElement, detail: EquationControlDetail) {
  if (detail.action === 'insert' && detail.latex) {
    mathfield.focus();
    mathfield.executeCommand(['insert', detail.latex]);
    return true;
  }
  const controlWindow = window as EquationControlWindow;
  if (detail.action === 'keyboard' && shouldCloseEquationKeyboard(Boolean(window.mathVirtualKeyboard?.visible), controlWindow.__studioKeyboardEquationElementId, detail.elementId)) {
    mathfield.executeCommand('hideVirtualKeyboard');
    window.mathVirtualKeyboard.hide({ animate: true });
    delete controlWindow.__studioKeyboardEquationElementId;
    removeKeyboardCloseButton();
    return true;
  }
  if (detail.action === 'keyboard' && equationMenuIsOpen(mathfield)) {
    mathfield.executeCommand('toggleContextMenu');
  }
  if (detail.action === 'menu' && equationMenuIsOpen(mathfield)) {
    mathfield.executeCommand('toggleContextMenu');
    return true;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (!mathfield.isConnected) {
      await nextAnimationFrame();
      continue;
    }
    mathfield.focus({ preventScroll: true });
    await nextAnimationFrame();
    if (!mathfield.isConnected) continue;
    mathfield.focus({ preventScroll: true });
    if (detail.action === 'keyboard') {
      mathfield.executeCommand('showVirtualKeyboard');
      window.mathVirtualKeyboard?.show({ animate: true });
      controlWindow.__studioKeyboardEquationElementId = detail.elementId;
      showKeyboardCloseButton(mathfield, detail.elementId);
      return true;
    }
    window.mathVirtualKeyboard?.hide({ animate: true });
    delete controlWindow.__studioKeyboardEquationElementId;
    removeKeyboardCloseButton();
    const opened = mathfield.showMenu({
      location: { x: detail.x ?? 0, y: detail.y ?? 0 },
      modifiers: { alt: false, control: false, meta: false, shift: false },
    });
    if (opened || equationMenuIsOpen(mathfield)) return true;
    await nextAnimationFrame();
  }
  return false;
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
  requestControlFirst?: boolean;
}

const MATRIX_ENVIRONMENTS =
  /\\begin\{(matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|smallmatrix|cases)\}([\s\S]*?)\\end\{\1\}/g;

function restoreEmptyPlaceholders(latex: string) {
  const withMatrixPlaceholders = stripEquationEditingPlaceholders(latex).replace(
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
  requestControlFirst = false,
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
        onChangeRef.current(stripEquationEditingPlaceholders(restoredLatex));
      };
      mathfield.addEventListener('input', handleInput);
      handleFocus = () => { if (elementId) (window as EquationControlWindow).__studioActiveEquationElementId = elementId; };
      mathfield.addEventListener('focus', handleFocus);
      host.appendChild(mathfield);
      mathfieldRef.current = mathfield;
      const controlWindow = window as EquationControlWindow;
      if (elementId && controlWindow.__studioPendingEquationControl?.elementId === elementId) {
        const pendingControl = controlWindow.__studioPendingEquationControl;
        void runEquationControl(mathfield, pendingControl).then((handled) => {
          if (handled && controlWindow.__studioPendingEquationControl === pendingControl) {
            delete controlWindow.__studioPendingEquationControl;
          }
        });
      }
    });
    return () => {
      disposed = true;
      const mathfield = mathfieldRef.current;
      if (mathfield && handleInput) mathfield.removeEventListener('input', handleInput);
      if (mathfield && handleFocus) mathfield.removeEventListener('focus', handleFocus);
      const controlWindow = window as EquationControlWindow;
      if (elementId && controlWindow.__studioActiveEquationElementId === elementId) delete controlWindow.__studioActiveEquationElementId;
      if (elementId && controlWindow.__studioKeyboardEquationElementId === elementId) delete controlWindow.__studioKeyboardEquationElementId;
      if (elementId) removeKeyboardCloseButton();
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
      void runEquationControl(mathfield, detail);
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
      <button type="button" title="Toggle equation keyboard" aria-label="Toggle equation keyboard" onClick={() => { const targetId = equationControlTarget(elementId, (window as EquationControlWindow).__studioActiveEquationElementId, requestControlFirst); if (targetId) window.dispatchEvent(new CustomEvent('studio-equation-control', { detail: { elementId: targetId, action: 'keyboard' } })); else onRequestControl?.('keyboard'); }} className="studio-equation-ribbon-action"><Keyboard size={16} /><span>Keyboard</span></button>
      <button ref={menuButtonRef} type="button" title="Toggle equation menu" aria-label="Toggle equation menu" onPointerDown={(event) => event.stopPropagation()} onClick={() => { const button = menuButtonRef.current; if (!button) return; const rect = button.getBoundingClientRect(); const location = { x: rect.left + rect.width / 2, y: rect.bottom }; const targetId = equationControlTarget(elementId, (window as EquationControlWindow).__studioActiveEquationElementId, requestControlFirst); if (targetId) window.dispatchEvent(new CustomEvent('studio-equation-control', { detail: { elementId: targetId, action: 'menu', ...location } })); else onRequestControl?.('menu', location); }} className="studio-equation-ribbon-action"><Menu size={16} /><span>Menu</span></button>
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
