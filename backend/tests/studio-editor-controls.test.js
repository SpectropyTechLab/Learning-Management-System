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
test('Studio navigation stays outside Home while tools are allocated to ribbon tabs', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const ribbonModel = readFrontend('components/studioRibbonModel.ts');
  assert.match(editor, /studioTools\.map/);
  assert.match(editor, /toggleStudioTool\(tool\.id\)/);
  assert.match(editor, /aria-label="Open Screens and Script"/);
  assert.match(editor, /aria-label="Screen navigation views"/);
  assert.doesNotMatch(editor, /id: 'editor-context', label: 'Context'/);
  assert.doesNotMatch(editor, /id: 'session-navigation', label: 'Navigation'/);
  assert.match(editor, /aria-label="Select Session"/);
  assert.match(editor, /contextBreadcrumb=/);
  assert.match(ribbonModel, /id: 'draw'/);
  assert.match(ribbonModel, /id: 'transitions'/);
  assert.match(ribbonModel, /id: 'view'/);
  assert.match(editor, /studio-context-bar hidden/);
  assert.doesNotMatch(editor, /Hide context controls|Show context and actions|contextBarOpen/);
});

test('Selected-element formatting is hosted by the ribbon instead of floating over the canvas', () => {
  const ribbon = readFrontend('components/StudioAdaptiveRibbon.tsx');
  const canvas = readFrontend('components/BlankScreenCanvas.tsx');
  assert.match(ribbon, /id="studio-contextual-toolbar-host"/);
  assert.match(canvas, /createPortal\(/);
  assert.match(canvas, /document\.getElementById\('studio-contextual-toolbar-host'\)/);
  assert.doesNotMatch(canvas, /Drag formatting toolbar|toolbarHorizontalBounds|moveToolbar/);
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

test('Screen navigation remains permanent while selected objects activate contextual ribbon without forcing an inspector', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const ribbon = readFrontend('components/StudioAdaptiveRibbon.tsx');
  const layers = readFrontend('components/StudioLayersPanel.tsx');
  assert.match(editor, /useState\(true\);/);
  assert.doesNotMatch(editor, /setLeftPanelOpen\(false\);\s*return;/);
  assert.match(editor, /setLeftPanelView\('screens'\);\s*setLeftPanelOpen\(true\)/);
  assert.match(editor, /const selectElementAndOpenControls/);
  const selectionStart = editor.indexOf('const selectElementAndOpenControls');
  const selectionEnd = editor.indexOf('const studioTools', selectionStart);
  const selectionImplementation = editor.slice(selectionStart, selectionEnd);
  assert.match(selectionImplementation, /setSelectedElementId\(elementId\)/);
  assert.match(selectionImplementation, /setSelectedLayoutSlotId/);
  assert.doesNotMatch(selectionImplementation, /setRightPanelOpen\(true\)|setPanel\(/);
  assert.match(editor, /onSelectElement=\{selectElementAndOpenControls\}/);
  assert.match(editor, /label: 'Layers'/);
  assert.match(editor, /<StudioLayersPanel/);
  assert.doesNotMatch(ribbon, /flyoutTitle|flyoutContent|absolute right-2 top-full/);
  assert.doesNotMatch(editor, /ribbonFlyout|setRibbonFlyout/);
  assert.match(layers, /Hide layer|Show layer/);
  assert.match(layers, /Lock layer|Unlock layer/);
  assert.match(layers, /Drag to reorder layer/);
  assert.match(layers, /reorderStudioLayers/);
  assert.doesNotMatch(layers, /ArrowUp|ArrowDown|Bring layer forward|Send layer backward/);
});

test('Screens and Script alone use the left pane while Screen actions live in Home', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const canvas = readFrontend('components/BlankScreenCanvas.tsx');
  const actions = [
    "id: 'add-screen'",
    "id: 'screen-metadata'",
    "id: 'rename-screen'",
    "id: 'delete-screen'",
    "id: 'edit-layout'",
    "id: 'remove-layout'",
  ].map((label) => editor.indexOf(label));
  assert.ok(actions.every((index) => index > 0));
  assert.deepEqual(actions, [...actions].sort((left, right) => left - right));
  assert.doesNotMatch(editor, /id: 'screens-and-reorder'/);
  assert.doesNotMatch(editor, /id: 'screen-script'/);
  assert.doesNotMatch(editor, /w-44 shrink-0 self-center/);
  const leftPaneStart = editor.indexOf('aria-label="Screen navigation views"');
  const leftPaneEnd = editor.indexOf('aria-label="Select Session"', leftPaneStart);
  const leftPane = editor.slice(leftPaneStart, leftPaneEnd);
  assert.match(leftPane, />Screens</);
  assert.match(leftPane, />Script</);
  assert.match(leftPane, /Close Screens and Script/);
  assert.doesNotMatch(leftPane, /Add Screen|Screen metadata|Edit layout|Remove layout/);
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

test('Editor reserves canvas space for opened inspectors', () => {
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
  assert.match(css, /\.studio-editor-workspace\.has-left-panel \.studio-editor-canvas \{\s*padding-left: min\(288px, 38vw\);/);
  assert.match(css, /\.studio-editor-workspace\.has-right-panel \.studio-editor-canvas \{\s*padding-right: min\(388px, 44vw\);/);
  assert.match(css, /\.studio-editor-workspace\.has-compact-right-panel \.studio-editor-canvas \{\s*padding-right: min\(316px, 38vw\);/);
  assert.match(css, /\.studio-editor-workspace\.has-layers-panel \.studio-editor-canvas \{\s*padding-right: min\(280px, 34vw\);/);
  assert.match(css, /\.studio-editor-slide-frame/);
  assert.match(canvas, /studio-editor-canvas-stage/);
  assert.match(css, /\.studio-editor-left-panel > nav > button/);
  assert.match(css, /background: transparent/);
  assert.match(canvas, /studio-editor-slide-frame absolute inset-3/);
  assert.match(css, /\.studio-editor-viewport \.studio-context-bar \{\s*position: relative/);
  assert.doesNotMatch(css, /\.studio-editor-viewport \.studio-context-bar \{[^}]*position: absolute/s);
});

test('Inspector icon rails shrink while their panel is open', () => {
  const css = readFrontendAsset('index.css');
  assert.match(css, /\.studio-editor-left-panel\.is-expanded > nav/);
  assert.match(css, /\.studio-editor-tools-panel\.is-expanded > nav/);
  assert.match(css, /width: 2rem;\s*height: 2rem;\s*min-height: 2rem;/);
  assert.doesNotMatch(css, /\.studio-editor-left-panel > nav \{\s*order:/);
});

test('Inspector icon hover keeps the clickable hitbox stationary', () => {
  const css = readFrontendAsset('index.css');
  const buttonHoverRule = css.match(
    /\.studio-editor-left-panel > nav > button:hover,\s*\.studio-editor-viewport \.studio-editor-tools-panel > nav > button:hover\s*\{[^}]*\}/s,
  );
  assert.ok(buttonHoverRule);
  assert.doesNotMatch(buttonHoverRule[0], /transform:/);
  assert.match(
    css,
    /\.studio-editor-left-panel > nav > button:hover svg,[\s\S]{0,180}\.studio-editor-tools-panel > nav > button:hover svg \{\s*transform: scale\(1\.16\);/,
  );
});

test('Screen Script keeps its compact cards and renders math with KaTeX', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const math = readFrontend('components/StudioScreenScriptMath.tsx');
  assert.match(editor, /screenScriptEntries/);
  assert.match(editor, /<StudioScreenScriptMath text=\{value \|\|/);
  assert.match(math, /katex\.renderToString/);
  assert.doesNotMatch(editor, /StudioScreenScriptView|selectedScreenScript/);
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

test('Empty and populated Screens use the same borderless slide surface', () => {
  const slide = readFrontend('SlideCanvas.tsx');
  const canvas = readFrontend('components/BlankScreenCanvas.tsx');
  assert.match(canvas, /const freeformLayout: Layout \| null =\s*!layout && screen/);
  assert.match(canvas, /slide=\{emptySlide\}/);
  assert.match(canvas, /studio-editor-slide-frame absolute inset-3/);
  assert.doesNotMatch(canvas, /screen\.elements\.length > 0 \|\| drawingEnabled/);
  assert.doesNotMatch(canvas, /max-w-5xl/);
  assert.doesNotMatch(slide, /stroke="#d6e3f0"/);
});

test('Insert ribbon uploads or picks filtered Resources and places them without placeholders', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const buttons = readFrontend('components/StudioInsertResourceButtons.tsx');
  const upload = readFrontend('components/StudioResourceInsertUpload.tsx');
  const library = readFrontend('components/resources/ResourceLibrary.tsx');
  const catalog = readFrontend('components/resources/AssetCatalogPanel.tsx');
  for (const label of ['Image', 'Video', 'Simulation', 'External Link', 'ZIP', 'SCORM']) {
    assert.match(buttons, new RegExp(`label: '${label}'`));
  }
  assert.match(buttons, />\s*Upload\s*</);
  assert.match(buttons, /From Resource/);
  assert.match(editor, /const placeResourceDirectly/);
  assert.match(editor, /slotId: `free-\$\{id\}`/);
  assert.match(editor, /initialType=\{insertResourceFilter \?\? ''\}/);
  assert.match(editor, /id: 'discover-assets'/);
  assert.match(editor, /assetCatalogOpen && \([\s\S]*<AssetCatalogPanel/);
  assert.match(editor, /<AssetCatalogPanel[\s\S]*mode="picker"/);
  assert.match(catalog, /const \[query, setQuery\] = useState\(''\)/);
  assert.match(catalog, /const \[submitted, setSubmitted\] = useState\(''\)/);
  assert.match(library, /if \(initialType !== undefined\) setResourceType\(initialType\)/);
  assert.match(library, /mode === 'manage' \? <div[\s\S]*Discover Assets/);
  assert.match(library, /if \(resource\.latest_version\) onPick\?\.\(resource, resource\.latest_version\)/);
  assert.match(library, /function PickerResourceActions/);
  assert.match(library, /Select version/);
  assert.match(library, /<ResourcePreview resource=\{resource\} card/);
  assert.match(library, /title=\{resource\.description \|\| resource\.latest_version\?\.original_file_name/);
  assert.doesNotMatch(library, /group-hover:opacity-100/);
  assert.match(library, /onPick\?\.\(pickerResource, version\)/);
  assert.match(upload, /Advanced options/);
  assert.match(upload, /advancedOpen \? \(/);
  assert.match(editor, /resourceUploadOpen && \([\s\S]*fixed inset-0 z-\[90\]/);
  assert.ok(upload.indexOf('Resource name') < upload.indexOf('Choose ${studioResourceTypeLabel(type)} file'));
  assert.doesNotMatch(upload, /fixed inset-0/);
  assert.match(editor, /label: 'Open Resources'/);
  assert.match(editor, /setInsertResourceFilter\(null\)/);
  assert.match(editor, /panel !== 'insert-resources'/);
  assert.match(editor, /<h2 className="font-bold text-slate-900">From Resource<\/h2>[\s\S]*?rounded-md text-slate-600 hover:bg-slate-100/);
  const ribbon = readFrontend('components/StudioAdaptiveRibbon.tsx');
  assert.match(ribbon, /group\.launcher/);
  assert.match(ribbon, /<ArrowUpRight/);
});

test('Selected media supports component fitting and non-destructive crop controls', () => {
  const toolbar = readFrontend('components/StudioElementToolbar.tsx');
  const player = readFrontend('components/resources/StudioResourcePlayer.tsx');
  const blankCanvas = readFrontend('components/BlankScreenCanvas.tsx');
  const slideCanvas = readFrontend('SlideCanvas.tsx');
  const editor = readFrontend('TeachingStudioPage.tsx');
  assert.match(toolbar, /Crop and fit/);
  assert.match(toolbar, /mediaTransform/);
  assert.match(player, /mediaTransform\?\.cropped === true && !hasEdgeCrop/);
  assert.match(player, /resourceType === 'image'[\s\S]*?\? 'fill' as const/);
  assert.match(player, /resourceType === 'image' && !hasEdgeCrop/);
  assert.match(player, /mediaTransform\?\.edgeCrop === true/);
  assert.match(blankCanvas, /continuingEdgeCrop/);
  assert.match(blankCanvas, /continuingCropGeometry/);
  assert.match(blankCanvas, /minimumLeft/);
  assert.match(blankCanvas, /overflowVisibleForObjectId=\{croppingElementId\}/);
  assert.match(blankCanvas, /cropScaleX: cropDraft\.cropScaleX \/ remainingX/);
  assert.match(blankCanvas, /position: \{ \.\.\.element\.position, \.\.\.bounds \}/);
  assert.match(blankCanvas, /Math\.max\(0\.25, Math\.min\(4/);
  assert.match(blankCanvas, /data-image-crop-active="true"/);
  assert.match(blankCanvas, /passive: false/);
  assert.match(blankCanvas, /anchorX/);
  assert.match(blankCanvas, /viewport\.scrollLeft \+=/);
  assert.match(blankCanvas, /handleCropWheel/);
  assert.match(blankCanvas, /onCommitCrop/);
  assert.match(blankCanvas, /if \(selected \|\| !cropping\) return;[\s\S]*?finishCrop\(\)/);
  assert.match(editor, /updateElementPreservingSelection/);
  assert.match(blankCanvas, /top-left/);
  assert.match(slideCanvas, /event\.shiftKey/);
  assert.match(blankCanvas, /geometryControlsHiddenForObjectId=\{croppingElementId\}/);
  assert.match(slideCanvas, /object\.id === geometryControlsHiddenForObjectId/);
  assert.match(editor, /mediaTransform: \{ fit: 'contain', scale: 1, x: 0, y: 0, cropped: false \}/);
  assert.match(editor, /960 \/ naturalWidth/);
  assert.match(editor, /540 \/ naturalHeight/);
  assert.match(editor, /getStudioResourcePreview\(version\.id\)/);
  assert.match(editor, /image\.naturalWidth/);
});

test('Multi-selection, grouping, direct crop and rotation share the persisted element model', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const canvas = readFrontend('components/BlankScreenCanvas.tsx');
  const slide = readFrontend('SlideCanvas.tsx');
  const player = readFrontend('StudioSessionPlayerPage.tsx');
  assert.match(editor, /selectedElementIds/);
  assert.match(slide, /event\.ctrlKey \|\| event\.metaKey \|\| event\.shiftKey/);
  assert.match(editor, /groupSelectedElements/);
  assert.match(editor, /position: \{ \.\.\.element\.position, groupId \}/);
  assert.match(editor, /ungroupSelectedElements/);
  assert.match(editor, /candidate\.position\.groupId === groupId/);
  assert.match(canvas, /Crop inside this container/);
  assert.match(canvas, /onMediaTransformChange/);
  assert.match(slide, /aria-label="Rotate element"/);
  assert.match(slide, /onChangeObjectRotation/);
  assert.match(slide, /rotate: `\$\{rotationFor\(object\)\}deg`/);
  assert.match(player, /rotation: Number\(element\.position_json\?\.rotation\) \|\| 0/);
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
  assert.match(slide, /onPointerDown=\{\(event\) => object && queueDirectMove\(event, object\.id, bounds, object\.locked\)\}/);
  assert.match(slide, /onPointerDownCapture=\{\(event\) => queueDirectMove\(event, object\.id, bounds, object\.locked\)\}/);
  assert.match(slide, /if \(locked \|\| !onChangeObjectBounds/);
  assert.match(slide, /\[contenteditable="true"\]/);
  const queueStart = slide.indexOf('const queueDirectMove');
  const queueEnd = slide.indexOf('useEffect(() => {', queueStart);
  assert.match(slide.slice(queueStart, queueEnd), /event\.preventDefault\(\)/);
  assert.doesNotMatch(slide.slice(queueStart, queueEnd), /stopPropagation|setInteraction/);
  assert.match(slide, /root\.style\.userSelect = 'none'/);
  assert.match(slide, /window\.getSelection\(\)\?\.removeAllRanges\(\)/);
});

test('Adaptive ribbon exposes PowerPoint-style collapse, contextual crop, shape and animation workflows', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const ribbon = readFrontend('components/StudioAdaptiveRibbon.tsx');
  const canvas = readFrontend('components/BlankScreenCanvas.tsx');

  assert.match(ribbon, /aria-label=\{collapsed \? 'Show ribbon commands' : 'Hide ribbon commands'\}/);
  assert.match(ribbon, /height: collapsed \? '2rem' : '6\.35rem'/);
  assert.match(ribbon, /if \(collapsed\) onToggleCollapsed\?\.\(\)/);

  assert.match(editor, /id: 'picture-crop'/);
  assert.match(editor, /setCropRequest\(\{ elementId: selectedElement\.id, token: Date\.now\(\) \}\)/);
  assert.match(canvas, /cropRequestToken/);
  assert.match(canvas, /Crop inside this container/);

  const shapeFormatStart = editor.indexOf("case 'shape-format':");
  const nextContextualTabStart = editor.indexOf("case 'diagram-design':", shapeFormatStart);
  const shapeFormat = editor.slice(shapeFormatStart, nextContextualTabStart);
  assert.match(shapeFormat, /RIBBON_VISIBLE_SHAPES/);
  assert.match(shapeFormat, /Shape fill/);
  assert.match(shapeFormat, /Shape outline/);
  assert.match(shapeFormat, /Shape effect/);
  assert.match(shapeFormat, /Selection Pane/);
  assert.match(shapeFormat, /Rotate/);
  assert.doesNotMatch(shapeFormat, /openRibbonTool\('shapes'\)/);

  for (const group of [
    'animation-preview',
    'animation-gallery',
    'animation-effect-options',
    'advanced-animation',
    'animation-timing',
    'animation-reorder',
  ]) assert.match(editor, new RegExp(`id: '${group}'`));
  assert.match(editor, /const openAnimationPane = \(\) => \{[\s\S]*setPanel\('animations'\);[\s\S]*setRightPanelOpen\(true\)/);
  assert.match(editor, /moveSelectedAnimation\(-1, selectedAnimationEffects\.length - 1\)/);
});

test('3D contextual controls stay in the ribbon and activate interaction inside the model', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const canvas = readFrontend('components/BlankScreenCanvas.tsx');
  const player = readFrontend('components/resources/StudioResourcePlayer.tsx');
  const model = readFrontend('components/resources/Model3DViewer.tsx');
  const start = editor.indexOf("case '3d-model':");
  const end = editor.indexOf("case 'simulation-format':", start);
  const modelRibbon = editor.slice(start, end);
  for (const capability of ['3D Model Views', 'Alt Text', 'Bring Forward', 'Send Backward', 'Selection Pane', 'Align Center', 'Group', 'Pan & Zoom', 'Auto Rotate', 'Size']) {
    assert.match(modelRibbon, new RegExp(capability.replace(/[&]/g, '\\&')));
  }
  assert.match(modelRibbon, /standardModel3DView\(view\)/);
  assert.match(modelRibbon, /setModel3DModeRequest/);
  assert.doesNotMatch(modelRibbon, /ribbonFlyout|setRibbonFlyout/);
  assert.match(canvas, /model3DModeRequestToken/);
  assert.match(player, /panZoomRequestToken=\{model3DModeRequestToken\}/);
  assert.match(model, /setPanZoomMode\(true\)/);
  assert.match(model, /setControlsVisible\(true\)/);
});
