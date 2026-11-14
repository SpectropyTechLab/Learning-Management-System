import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readFrontend = (relativePath) =>
  fs.readFileSync(
    new URL(`../../frontend/src/features/teaching-studio/${relativePath}`, import.meta.url),
    'utf8',
  );
const readFrontendAsset = (relativePath) =>
  fs.readFileSync(new URL(`../../frontend/src/assets/${relativePath}`, import.meta.url), 'utf8');

test('AutoSave preserves Screen undo and redo history', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const saveStart = editor.indexOf('const saveScreenDraft');
  const saveEnd = editor.indexOf('saveDraftRef.current = saveScreenDraft');
  const saveImplementation = editor.slice(saveStart, saveEnd);
  assert.ok(saveStart > 0 && saveEnd > saveStart);
  assert.doesNotMatch(saveImplementation, /setElementPast\(\[\]\)/);
  assert.doesNotMatch(saveImplementation, /setElementFuture\(\[\]\)/);
  assert.match(editor, /setHasUnsavedChanges\(true\);\s*setSaveStatus\('pending'\)/);
  assert.match(editor, /key === 'y' \|\| \(key === 'z' && event\.shiftKey\)/);
});
test('Studio tools and context ribbon use compact toggle controls', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  assert.match(editor, /studioTools\.map/);
  assert.match(editor, /toggleStudioTool\(tool\.id\)/);
  assert.match(editor, /flex w-11 shrink-0 flex-col/);
  assert.match(editor, /leftPanelView !== 'script' \|\| !open/);
  assert.match(editor, /studio-context-bar shrink-0/);
  assert.doesNotMatch(editor, /Hide context controls|Show context and actions|contextBarOpen/);
});

test('Cursor-aware lists and element hyperlinks reach authoring and playback', () => {
  const toolbar = readFrontend('components/StudioElementToolbar.tsx');
  const canvasText = readFrontend('components/StudioCanvasTextElement.tsx');
  const canvas = readFrontend('components/BlankScreenCanvas.tsx');
  const player = readFrontend('StudioSessionPlayerPage.tsx');
  assert.match(toolbar, /Bullet and numbering styles/);
  assert.match(toolbar, /dispatchStudioTextCommand/);
  assert.match(canvasText, /insertUnorderedList/);
  assert.match(canvasText, /insertOrderedList/);
  assert.match(canvasText, /sanitizeStudioRichText/);
  assert.match(canvas, /StudioHyperlinkOverlay/);
  assert.match(player, /StudioHyperlinkOverlay/);
});

test('Studio editor uses one stable tooltip and converts every selected line into a list item', () => {
  const iconButton = readFrontend('components/StudioIconButton.tsx');
  const canvasText = readFrontend('components/StudioCanvasTextElement.tsx');
  assert.match(iconButton, /title=\{buttonProps\.title \?\? label\}/);
  assert.doesNotMatch(iconButton, /role="tooltip"/);
  assert.match(canvasText, /selectedLines\.forEach/);
  assert.match(canvasText, /document\.createElement\('li'\)/);
  assert.match(canvasText, /selectedRange\.insertNode\(listElement\)/);
});

test('Screen navigation is a PowerPoint-style thumbnail rail with pointer reordering', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  assert.match(editor, /data-reorder-screen-id=\{screenId\}/);
  assert.match(editor, /setPointerCapture\(event\.pointerId\)/);
  assert.match(editor, /onPointerMove=\{leftPanelView === 'screens' \? moveDraggedScreen/);
  assert.match(editor, /void selectScreen\(screenId\)/);
  assert.match(editor, /void saveScreenOrder\(reorderIdsRef\.current\)/);
  assert.doesNotMatch(editor, /reorderOpen/);
  assert.doesNotMatch(editor, /studio-context-secondary/);
});

test('Reorder toggles closed and selected objects automatically open their applicable inspector', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  assert.match(editor, /leftPanelOpen && leftPanelView === 'screens'/);
  assert.match(editor, /setLeftPanelOpen\(false\);\s*return;/);
  assert.match(editor, /const selectElementAndOpenControls/);
  assert.match(editor, /isSmartDiagramContent\(element\?\.content\)/);
  assert.match(editor, /element\?\.type === 'math'/);
  assert.match(editor, /element\?\.type === 'shape'/);
  assert.match(editor, /setPanel\(nextPanel\);\s*setRightPanelOpen\(true\)/);
  assert.match(editor, /onSelectElement=\{selectElementAndOpenControls\}/);
});

test('Editor screen actions use the compact requested order and header owns rename and delete', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const canvas = readFrontend('components/BlankScreenCanvas.tsx');
  const actions = [
    'aria-label="Screens and reorder"',
    'aria-label="Screen Script"',
    'aria-label="Add Screen"',
    'aria-label="Screen metadata"',
    'aria-label="Edit layout"',
    'aria-label="Remove layout"',
  ].map((label) => editor.indexOf(label));
  assert.ok(actions.every((index) => index > 0));
  assert.deepEqual(actions, [...actions].sort((left, right) => left - right));
  assert.doesNotMatch(editor, /w-44 shrink-0 self-center/);
  assert.match(editor, /label="Rename Screen"/);
  assert.match(editor, /label="Delete Screen"/);
  assert.doesNotMatch(canvas, /Screen actions/);
  assert.doesNotMatch(canvas, /absolute left-16 top-16/);
});

test('Editor fullscreen keeps the live autosaving workspace and floating controls', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const css = readFrontendAsset('index.css');
  const shell = readFrontend('components/StudioShell.tsx');
  assert.match(editor, /editorViewportRef/);
  assert.match(editor, /viewport\.requestFullscreen\(\)/);
  assert.match(editor, /document\.exitFullscreen\(\)/);
  assert.match(editor, /hideHeader/);
  assert.match(editor, /Editor Fullscreen/);
  assert.match(editor, /studio-editor-focus-mode/);
  assert.match(css, /\.studio-editor-viewport \.studio-editor-left-panel/);
  assert.match(css, /backdrop-filter: blur\(14px\)/);
  assert.match(css, /\.studio-editor-viewport \.studio-context-bar/);
  assert.match(shell, /header=\{hideHeader \? undefined/);
});

test('Editor keeps floating chrome but reserves visible canvas space for opened inspectors', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const canvas = readFrontend('components/BlankScreenCanvas.tsx');
  const css = readFrontendAsset('index.css');
  assert.doesNotMatch(editor, /gridTemplateColumns:/);
  assert.match(editor, /studio-editor-workspace relative grid min-h-0 flex-1 overflow-hidden/);
  assert.match(editor, /has-left-panel/);
  assert.match(editor, /has-right-panel/);
  assert.match(css, /\.studio-editor-viewport \.studio-editor-tools-panel/);
  assert.match(css, /position: absolute/);
  assert.match(css, /\.studio-editor-workspace\.has-left-panel \.studio-editor-canvas/);
  assert.match(css, /\.studio-editor-workspace\.has-right-panel \.studio-editor-canvas/);
  assert.match(css, /\.studio-editor-slide-frame/);
  assert.match(canvas, /studio-editor-canvas-stage/);
  assert.match(css, /\.studio-editor-left-panel > nav > button/);
  assert.match(css, /background: transparent/);
  assert.match(canvas, /studio-editor-slide-frame absolute inset-3/);
  assert.match(css, /\.studio-editor-viewport \.studio-context-bar \{\s*position: relative/);
  assert.doesNotMatch(css, /\.studio-editor-viewport \.studio-context-bar \{[^}]*position: absolute/s);
});

test('Canvas zoom scales one canonical surface and elements resize from every edge', () => {
  const slide = readFrontend('SlideCanvas.tsx');
  assert.match(slide, /width: MASTER\.width,/);
  assert.match(slide, /transform: `scale\(\$\{scale\}\)`/);
  for (const direction of ['resize-nw', 'resize-n', 'resize-ne', 'resize-e', 'resize-se', 'resize-s', 'resize-sw', 'resize-w']) {
    assert.match(slide, new RegExp(direction));
  }
  assert.match(slide, /selectedWithoutBorder \? 'border-2 border-dashed border-blue-600'/);
  assert.match(slide, /showTextEditorOutlines && textObjectTypes\.has\(object\.type\) &&/);
  assert.match(slide, /selected \|\| object\.text\.trim\(\)\.length === 0/);
  assert.match(slide, /outline outline-2 outline-dotted/);
  assert.match(slide, /selected \? 'outline-blue-600' : 'outline-slate-400'/);
  const blankCanvas = readFrontend('components/BlankScreenCanvas.tsx');
  assert.match(blankCanvas, /showTextEditorOutlines=\{!previewMode\}/);
  const textElement = readFrontend('components/StudioCanvasTextElement.tsx');
  assert.match(textElement, /overflowWrap: 'anywhere'/);
  assert.match(slide, /after:h-3 after:w-3/);
  assert.match(slide, /after:border-blue-700 after:bg-white/);
});

test('Selected media supports component fitting and non-destructive crop controls', () => {
  const toolbar = readFrontend('components/StudioElementToolbar.tsx');
  const player = readFrontend('components/resources/StudioResourcePlayer.tsx');
  const editor = readFrontend('TeachingStudioPage.tsx');
  assert.match(toolbar, /Crop and fit/);
  assert.match(toolbar, /mediaTransform/);
  assert.match(player, /objectFit: mediaTransform\?\.fit === 'cover'/);
  assert.match(editor, /mediaTransform: \{ fit: 'contain', scale: 1, x: 0, y: 0 \}/);
});

test('Text formatting commands apply font styles to the preserved selection', () => {
  const toolbar = readFrontend('components/StudioElementToolbar.tsx');
  const text = readFrontend('components/StudioCanvasTextElement.tsx');
  const canvas = readFrontend('components/BlankScreenCanvas.tsx');
  assert.match(toolbar, /type: 'style', property: 'fontSize'/);
  assert.match(toolbar, /const \[fontSizeDraft, setFontSizeDraft\]/);
  assert.match(toolbar, /selectionFontSize === 'mixed'/);
  assert.match(toolbar, /onChange=\{\(event\) => previewFontSize\(event\.target\.value\)\}/);
  assert.match(toolbar, /type: 'format', command: 'bold'/);
  assert.match(text, /span\.style\.setProperty\(cssProperty, command\.value\)/);
  assert.match(text, /selectedRange\.extractContents\(\)/);
  assert.match(text, /initializedEditorRef\.current === editor/);
  assert.match(text, /initializedEditorRef\.current = null;\s*savedRangeRef\.current = null/);
  assert.match(text, /editor\.innerHTML = renderedRichTextHtml \?\? editableHtml\(text\)/);
  assert.match(text, /onKeyDown=\{\(event\) => \{ event\.stopPropagation\(\)/);
  assert.match(text, /onBlur=\{handleEditorBlur\}/);
  assert.doesNotMatch(text, /onBlur=\{\(\) => \{ reportCaret\(\)/);
  assert.match(text, /document\.addEventListener\('selectionchange', captureSelectedText\)/);
  assert.match(text, /const selectedRange = rangeForCommand\(editor, command\);[\s\S]*if \(!preserveToolbarFocus\) \{\s*editor\.focus\(\)/);
  assert.match(text, /const preserveToolbarFocus = \(command\.type === 'style' \|\| command\.type === 'block-style'\)/);
  assert.match(text, /if \(preserveToolbarFocus\) savedRangeRef\.current = nextRange\.cloneRange\(\)/);
  assert.match(text, /const reusableSpan = selectedElement\?\.tagName === 'SPAN'/);
  assert.match(text, /fontSizeForRange\(editor, range\)/);
  assert.match(text, /spacingForRange\(editor, range/);
  assert.match(canvas, /selectionFontSize=\{textSelectionFontSize\?\.elementId === selectedElement\.id/);
  assert.match(canvas, /selectionSpacing=\{textSelectionSpacing\?\.elementId === selectedElement\.id/);
});

test('Text paste preserves supported formatting and autoresizes through one atomic commit', () => {
  const toolbar = readFrontend('components/StudioElementToolbar.tsx');
  const text = readFrontend('components/StudioCanvasTextElement.tsx');
  const canvas = readFrontend('components/BlankScreenCanvas.tsx');
  assert.match(text, /onPaste=\{handlePaste\}/);
  assert.match(text, /supportedRichTextTags/);
  assert.match(text, /ResizeObserver/);
  assert.match(text, /requiredHeight: measureRequiredHeight/);
  assert.match(text, /removeTrailingEditorPlaceholder\(measurement\)/);
  assert.match(text, /commitEditorAfterLayout\(formatting\)/);
  assert.match(text, /clearDescendantFormatting/);
  assert.match(toolbar, /Line and paragraph spacing/);
  assert.match(toolbar, /Before paragraph/);
  assert.match(toolbar, /After paragraph/);
  assert.match(toolbar, /spacingMenuOpen/);
  assert.match(canvas, /onChangeElement\(\{/);
  assert.match(canvas, /height: nextHeight/);
});

test('Editor keeps both inspectors open without an appearance mode control', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const shell = readFrontend('components/StudioShell.tsx');
  const account = readFrontend('components/StudioAccountMenu.tsx');
  assert.doesNotMatch(editor, /setRightPanelOpen\(false\);\s*setLeftPanelView\('screens'\)/);
  assert.doesNotMatch(editor, /setLeftPanelOpen\(false\);\s*setPanel\(nextPanel\)/);
  assert.doesNotMatch(editor, /setLeftPanelOpen\(false\);\s*setPanel\(tool\)/);
  assert.doesNotMatch(editor, /aria-label="Editor appearance"/);
  assert.doesNotMatch(shell, /prefers-color-scheme: dark/);
  assert.doesNotMatch(account, /Studio appearance/);
});

test('Session and Screen selectors force readable native option colours', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const css = readFrontendAsset('index.css');
  assert.match(editor, /studio-context-select/);
  assert.match(css, /\.studio-context-select option/);
  assert.match(css, /background: #ffffff/);
  assert.match(css, /color: #0f172a/);
});

test('Editor commands, direct canvas authoring and canvas-only zoom share one workflow', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const canvas = readFrontend('components/BlankScreenCanvas.tsx');
  const slide = readFrontend('SlideCanvas.tsx');
  assert.match(editor, /editorClipboardRef/);
  assert.match(editor, /key === 'd'/);
  assert.match(editor, /key === 'x'/);
  assert.match(editor, /addDroppedFiles/);
  assert.match(editor, /onCreateTextAt/);
  assert.match(canvas, /canvasZoom/);
  assert.match(canvas, /event\.ctrlKey/);
  assert.match(canvas, /zoomPointersRef/);
  assert.match(slide, /onCanvasDoubleClick/);
  assert.match(canvas, /mimeType\.startsWith\('video\/'\)/);
  assert.match(canvas, /mimeType\.startsWith\('audio\/'\)/);
  assert.match(canvas, /mimeType === 'application\/pdf'/);
  assert.match(canvas, /studio-editor-status-bar/);
  assert.match(canvas, /aria-label="Canvas zoom percentage"/);
  assert.match(canvas, /aria-label="Fit slide"/);
  assert.doesNotMatch(canvas, /absolute bottom-3 left-1\/2/);
});

test('Present opens a clean audience window controlled from the editor', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const player = readFrontend('StudioSessionPlayerPage.tsx');
  const shell = readFrontend('components/StudioShell.tsx');
  assert.match(editor, /openPresentation/);
  assert.match(editor, /BroadcastChannel/);
  assert.match(editor, /getScreenDetails/);
  assert.match(editor, /isExtended/);
  assert.match(editor, /presentationWindowFeatures/);
  assert.match(editor, /preferredExternal/);
  assert.match(editor, /forwardLaptopClicker/);
  assert.match(editor, /clickerNavigationAction/);
  assert.match(editor, /Audience presentation controls/);
  assert.match(player, /audienceMode/);
  assert.match(player, /presentationChannel/);
  assert.match(shell, /presentationMode/);
});

test('Backward animation preserves the slide tree and remounts only changed elements', () => {
  const player = readFrontend('StudioSessionPlayerPage.tsx');
  const canvas = readFrontend('components/BlankScreenCanvas.tsx');
  const runtime = readFrontend('components/studioClickerRuntime.ts');
  const retreatStart = player.indexOf('const retreatPresenter');
  const retreatEnd = player.indexOf('useEffect(() => {', retreatStart);
  const retreatImplementation = player.slice(retreatStart, retreatEnd);
  assert.match(player, /<PublishedCanvas key=\{screen\.screen_id\}/);
  assert.doesNotMatch(player, /<PublishedCanvas key=\{`\$\{screen\.screen_id\}-\$\{playbackCycle\}`\}/);
  assert.doesNotMatch(retreatImplementation, /setPlaybackCycle/);
  assert.match(runtime, /presenterElementPlaybackState/);
  assert.match(runtime, /reachedCueIndex/);
  assert.match(runtime, /navigation\?\.direction === 'backward'/);
  assert.match(player, /animationDirection/);
  assert.match(canvas, /presenterElementPlaybackState/);
  assert.doesNotMatch(canvas, /setPreviewCycle\(\(current\) => current \+ 1\);\s*}\s*else onPreviewPrevious/);
});

test('Slide transitions cannot override the viewport fit scale', () => {
  const slide = readFrontend('SlideCanvas.tsx');
  assert.match(slide, /data-testid="slide-transition-layer"/);
  assert.match(slide, /transform: `scale\(\$\{scale\}\)`/);
  const scaledSurface = slide.slice(slide.indexOf('data-testid="slide-surface"'), slide.indexOf('data-testid="slide-transition-layer"'));
  assert.doesNotMatch(scaledSurface, /studioTransitionStyle/);
});

test('Canvas elements support direct pointer dragging as well as resize handles', () => {
  const slide = readFrontend('SlideCanvas.tsx');
  assert.match(slide, /const queueDirectMove/);
  assert.match(slide, /Math\.hypot\(movementX, movementY\) < 6/);
  assert.match(slide, /onPointerDown=\{\(event\) => object && queueDirectMove\(event, object\.id, bounds\)\}/);
  assert.match(slide, /onPointerDownCapture=\{\(event\) => queueDirectMove\(event, object\.id, bounds\)\}/);
  assert.match(slide, /\[contenteditable="true"\]/);
  const queueStart = slide.indexOf('const queueDirectMove');
  const queueEnd = slide.indexOf('useEffect(() => {', queueStart);
  assert.match(slide.slice(queueStart, queueEnd), /event\.preventDefault\(\)/);
  assert.doesNotMatch(slide.slice(queueStart, queueEnd), /stopPropagation|setInteraction/);
  assert.match(slide, /root\.style\.userSelect = 'none'/);
  assert.match(slide, /window\.getSelection\(\)\?\.removeAllRanges\(\)/);
});
