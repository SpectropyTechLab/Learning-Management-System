export type PresenterAnimationCue = {
  cueId: string;
  elementKey: string;
  effect: Record<string, unknown>;
  step: number;
  triggerElementId?: string;
  triggerMediaElementId?: string;
  triggerBookmarkSeconds?: number;
};

export type PresenterAnimationTimeline = {
  cues: PresenterAnimationCue[];
  maxStep: number;
};

export type PresenterAnimationNavigation = {
  direction: 'forward' | 'backward';
  fromStep: number;
  toStep: number;
};

type SmartDiagramLike = {
  visualType?: unknown;
  nodes?: unknown;
  revealMode?: unknown;
  reverseAnimation?: unknown;
};

type ClickerElement = {
  element_key: string;
  content_json?: Record<string, unknown> | null;
};

export type ClickerNavigationAction = 'next' | 'previous';

const nextClickerKeys = new Set([
  'ArrowRight',
  'ArrowDown',
  'PageDown',
  ' ',
  'Enter',
  'BrowserForward',
  'MediaTrackNext',
]);
const previousClickerKeys = new Set([
  'ArrowLeft',
  'ArrowUp',
  'PageUp',
  'Backspace',
  'BrowserBack',
  'MediaTrackPrevious',
]);
const nextClickerCodes = new Set([
  'ArrowRight',
  'ArrowDown',
  'PageDown',
  'Space',
  'Enter',
  'NumpadEnter',
]);
const previousClickerCodes = new Set(['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace']);

export const clickerNavigationAction = (
  event: Pick<KeyboardEvent, 'key' | 'code' | 'target'>,
): ClickerNavigationAction | null => {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return null;
  if (
    target?.closest('button, a') &&
    (event.key === 'Enter' || event.key === ' ' || event.code === 'Space')
  )
    return null;
  if (nextClickerKeys.has(event.key) || nextClickerCodes.has(event.code)) return 'next';
  if (previousClickerKeys.has(event.key) || previousClickerCodes.has(event.code)) return 'previous';
  return null;
};

const entranceEffects = new Set([
  'appear',
  'fade',
  'fly-in',
  'wipe',
  'zoom',
  'float-in',
  'split',
  'wheel',
  'random-bars',
  'grow-turn',
  'shape',
  'swivel',
  'bounce-in',
]);

const exitEffects = new Set([
  'fade-out',
  'fly-out',
  'zoom-out',
  'wipe-out',
  'float-out',
  'split-out',
  'disappear',
  'sink',
  'shape-out',
  'wheel-out',
  'random-bars-out',
  'shrink-turn',
  'swivel-out',
  'bounce-out',
]);

const effectsFor = (element: ClickerElement): Array<Record<string, unknown>> => {
  const animation = element.content_json?.animation;
  if (!animation || typeof animation !== 'object' || Array.isArray(animation)) return [];
  const value = animation as Record<string, unknown>;
  const rawEffects = Array.isArray(value.effects) && value.effects.length
    ? value.effects.filter(
      (effect): effect is Record<string, unknown> =>
        Boolean(effect) && typeof effect === 'object' && !Array.isArray(effect),
    )
    : String(value.effect || 'none') === 'none' ? [] : [
    {
      effect: String(value.effect),
      duration: value.duration,
      delay: value.delay,
      start: 'on-click',
    },
  ];
  return rawEffects.flatMap((effect) => {
    const buildSequence = String(effect.buildSequence || 'as-one-object');
    if (element.content_json?.visualType === 'smart_diagram' && !['as-one-object', 'all-at-once'].includes(buildSequence)) return [];
    if (buildSequence === 'as-one-object' || buildSequence === 'all-at-once') return [effect];
    const rows = Array.isArray(element.content_json?.rows) ? element.content_json?.rows as unknown[][] : [];
    const data = element.content_json?.data && typeof element.content_json.data === 'object'
      ? element.content_json.data as Record<string, unknown>
      : element.content_json || {};
    const datasets = Array.isArray(data.datasets) ? data.datasets : [];
    const labels = Array.isArray(data.labels) ? data.labels : [];
    const children = Array.isArray(element.content_json?.children) ? element.content_json?.children : [];
    const count = buildSequence === 'by-row' ? rows.length
      : buildSequence === 'by-column' ? Math.max(0, ...rows.map((row) => Array.isArray(row) ? row.length : 0))
        : buildSequence === 'by-series' ? datasets.length
          : buildSequence === 'by-category' ? labels.length
            : buildSequence === 'one-by-one' && rows.length ? rows.reduce((sum, row) => sum + row.length, 0)
              : buildSequence === 'one-by-one' && children.length ? children.length
                : 1;
    const order = Array.from({ length: Math.max(1, count) }, (_, index) => effect.reverseOrder === true ? Math.max(0, count - index - 1) : index);
    return order.map((buildItemIndex, buildIndex) => ({
      ...effect,
      id: `${String(effect.id || 'effect')}-build-${buildIndex}`,
      start: buildIndex === 0 ? effect.start : 'on-click',
      buildItemIndex,
      buildItemCount: Math.max(1, count),
    }));
  });
};

const diagramEffectsFor = (element: ClickerElement): Array<Record<string, unknown>> => {
  const content = element.content_json as SmartDiagramLike | undefined;
  if (content?.visualType !== 'smart_diagram' || !Array.isArray(content.nodes)) return [];
  const savedAnimation = element.content_json?.animation && typeof element.content_json.animation === 'object' && !Array.isArray(element.content_json.animation)
    ? element.content_json.animation as Record<string, unknown>
    : undefined;
  const firstAnimation = Array.isArray(savedAnimation?.effects) && savedAnimation.effects[0] && typeof savedAnimation.effects[0] === 'object'
    ? savedAnimation.effects[0] as Record<string, unknown>
    : undefined;
  const nodes = content.nodes.filter((node): node is Record<string, unknown> => Boolean(node) && typeof node === 'object' && !Array.isArray(node));
  const ordered = content.reverseAnimation === true || firstAnimation?.reverseOrder === true ? [...nodes].reverse() : nodes;
  const orderedByLevel = [...ordered].sort((left, right) => (Number(left.level) || 0) - (Number(right.level) || 0));
  const mode = String(firstAnimation?.buildSequence || content.revealMode || 'as-one-object');
  const groups = mode === 'as-one-object' || mode === 'all-at-once'
    ? [ordered]
    : mode === 'level-at-once'
    || mode === 'by-level-at-once'
    ? [...new Set(ordered.map((node) => Number(node.level) || 0))].sort((a, b) => a - b).map((level) => ordered.filter((node) => (Number(node.level) || 0) === level))
    : mode === 'by-branch'
      ? ordered.filter((node) => !node.parentId).map((root) => ordered.filter((node) => node === root || node.parentId === root.id))
      : (mode === 'level-one-by-one' || mode === 'by-level-one-by-one' ? orderedByLevel : ordered).map((node) => [node]);
  return groups.map((group, index) => ({
    ...(firstAnimation || {}),
    id: `${String(firstAnimation?.id || 'diagram')}-node-build-${index}`,
    effect: String(firstAnimation?.effect || 'appear'),
    start: index === 0 ? String(firstAnimation?.start || 'on-click') : 'on-click',
    duration: Number(firstAnimation?.duration) || 0.25,
    delay: index === 0 ? Number(firstAnimation?.delay) || 0 : 0,
    diagramNodeIds: group.map((node) => String(node.id || '')).filter(Boolean),
    diagramReveal: true,
  }));
};

export const buildPresenterAnimationTimeline = (
  elements: ClickerElement[],
): PresenterAnimationTimeline => {
  let currentStep = 0;
  const cues: PresenterAnimationCue[] = [];
  let fallbackOrder = 0;
  const ordered = elements.flatMap((element) => {
    const objectEffects = effectsFor(element).map((effect, index) => ({
      elementKey: element.element_key,
      effect,
      effectIndex: index,
      explicitOrder: Number(effect.sequenceOrder),
      fallbackOrder: fallbackOrder++,
    }));
    const diagramEffects = diagramEffectsFor(element).map((effect, index) => ({
      elementKey: element.element_key,
      effect,
      effectIndex: objectEffects.length + index,
      explicitOrder: Number.NaN,
      fallbackOrder: fallbackOrder++,
    }));
    return [...objectEffects, ...diagramEffects];
  }).sort((left, right) => {
    const leftOrdered = Number.isFinite(left.explicitOrder);
    const rightOrdered = Number.isFinite(right.explicitOrder);
    if (leftOrdered && rightOrdered && left.explicitOrder !== right.explicitOrder) return left.explicitOrder - right.explicitOrder;
    if (leftOrdered !== rightOrdered) return leftOrdered ? -1 : 1;
    return left.fallbackOrder - right.fallbackOrder;
  });
  let previousStart = 0;
  let previousEnd = 0;
  for (const item of ordered) {
    const start = String(item.effect.start || (item.effectIndex === 0 ? 'on-click' : 'after-previous'));
    const ownDelay = Math.max(0, Number(item.effect.delay) || 0);
    const duration = Math.max(0.001, Number(item.effect.duration) || 0.8);
    if (start === 'on-click') {
      currentStep += 1;
      previousStart = ownDelay;
      previousEnd = previousStart + duration;
    } else if (start === 'with-previous') {
      previousStart += ownDelay;
      previousEnd = Math.max(previousEnd, previousStart + duration);
    } else if (start === 'after-previous') {
      previousStart = previousEnd + ownDelay;
      previousEnd = previousStart + duration;
    }
    const cueId = String(item.effect.id || `${item.elementKey}-effect-${item.effectIndex}`);
    cues.push({
      cueId,
      elementKey: item.elementKey,
      effect: { ...item.effect, start, runtimeDelay: Math.round((start === 'trigger' ? ownDelay : previousStart) * 1000) / 1000 },
      step: start === 'trigger' ? -1 : currentStep,
      triggerElementId: start === 'trigger' ? String(item.effect.triggerElementId || '') || undefined : undefined,
      triggerMediaElementId: start === 'trigger' ? String(item.effect.triggerMediaElementId || '') || undefined : undefined,
      triggerBookmarkSeconds: start === 'trigger' && Number.isFinite(Number(item.effect.triggerBookmarkSeconds))
        ? Number(item.effect.triggerBookmarkSeconds)
        : undefined,
    });
  }
  return { cues, maxStep: currentStep };
};

export const presenterTriggerCueIds = (
  timeline: PresenterAnimationTimeline,
  triggerElementId: string,
) => timeline.cues
  .filter((cue) => cue.step === -1 && cue.triggerElementId === triggerElementId)
  .map((cue) => cue.cueId);

export const presenterMediaBookmarkCueIds = (
  timeline: PresenterAnimationTimeline,
  mediaElementId: string,
  previousSeconds: number,
  currentSeconds: number,
) => timeline.cues
  .filter((cue) => cue.step === -1
    && cue.triggerMediaElementId === mediaElementId
    && cue.triggerBookmarkSeconds !== undefined
    && cue.triggerBookmarkSeconds > previousSeconds
    && cue.triggerBookmarkSeconds <= currentSeconds)
  .map((cue) => cue.cueId);

export const presenterDiagramVisibleNodes = (
  timeline: PresenterAnimationTimeline,
  elementKey: string,
  step: number,
  allNodeIds: string[],
) => {
  const diagramCues = timeline.cues.filter((cue) => cue.elementKey === elementKey && cue.effect.diagramReveal === true);
  if (diagramCues.length === 0) return new Set(allNodeIds);
  return new Set(diagramCues.filter((cue) => cue.step <= step).flatMap((cue) => Array.isArray(cue.effect.diagramNodeIds) ? cue.effect.diagramNodeIds.map(String) : []));
};

export const presenterComponentBuildState = (
  timeline: PresenterAnimationTimeline,
  elementKey: string,
  step: number,
  triggeredCueIds: ReadonlySet<string> = new Set(),
) => {
  const cues = timeline.cues.filter((cue) => cue.elementKey === elementKey && Number.isFinite(Number(cue.effect.buildItemIndex)));
  if (!cues.length) return null;
  const visibleItems = new Set(cues
    .filter((cue) => cue.step === -1 ? triggeredCueIds.has(cue.cueId) : cue.step <= step)
    .map((cue) => Number(cue.effect.buildItemIndex)));
  const active = cues.find((cue) => cue.step === step || triggeredCueIds.has(cue.cueId));
  return {
    sequence: String(cues[0].effect.buildSequence || 'one-by-one'),
    visibleItems,
    activeItem: active ? Number(active.effect.buildItemIndex) : null,
    effect: active?.effect,
  };
};

export const presenterElementState = (
  timeline: PresenterAnimationTimeline,
  elementKey: string,
  step: number,
  triggeredCueIds: ReadonlySet<string> = new Set(),
) => {
  const cues = timeline.cues.filter((cue) => cue.elementKey === elementKey);
  const objectCues = cues.filter((cue) => cue.effect.diagramReveal !== true);
  const activeEffects = objectCues.filter((cue) => cue.step === step || triggeredCueIds.has(cue.cueId)).map((cue) => cue.effect);
  const entrances = objectCues.filter((cue) => entranceEffects.has(String(cue.effect.effect || '')));
  const exits = objectCues.filter((cue) => exitEffects.has(String(cue.effect.effect || '')));
  const cueReached = (cue: PresenterAnimationCue) => cue.step === -1 ? triggeredCueIds.has(cue.cueId) : cue.step <= step;
  const cuePassed = (cue: PresenterAnimationCue) => cue.step === -1 ? triggeredCueIds.has(cue.cueId) : cue.step < step;
  const visibleAfterEntrance = entrances.length === 0 || entrances.some(cueReached);
  const hiddenAfterExit = exits.some(cuePassed);
  const completedWithAfterAction = [...objectCues].reverse().find((cue) => cuePassed(cue) && String(cue.effect.afterAnimation || 'none') !== 'none');
  const afterAction = String(completedWithAfterAction?.effect.afterAnimation || 'none');
  const hiddenByAfterAction = afterAction === 'hide-after' || afterAction === 'hide-on-next-click';
  const afterStyle = afterAction === 'dim'
    ? { color: String(completedWithAfterAction?.effect.afterAnimationColor || '#94a3b8'), opacity: 0.72 }
    : {};
  return {
    activeEffects,
    afterStyle,
    visible: visibleAfterEntrance && !hiddenAfterExit && !hiddenByAfterAction,
  };
};

export const presenterElementPlaybackState = (
  timeline: PresenterAnimationTimeline,
  elementKey: string,
  step: number,
  playbackCycle: number,
  navigation?: PresenterAnimationNavigation | null,
  triggeredCueIds: ReadonlySet<string> = new Set(),
) => {
  const state = presenterElementState(timeline, elementKey, step, triggeredCueIds);
  const movingBackward = navigation?.direction === 'backward' && navigation.toStep === step;
  const cueStep = navigation && navigation.toStep === step ? navigation.toStep : step;
  const activeEffects = movingBackward ? [] : timeline.cues
    .filter(
      (cue) =>
        cue.elementKey === elementKey &&
        (cue.step === cueStep
          || triggeredCueIds.has(cue.cueId)
          || (cue.effect.repeat === 'until-end' && cue.step >= 0 && cue.step <= step)) &&
        cue.effect.diagramReveal !== true,
    )
    .map((cue) => cue.effect);
  const reachedCueIndex = timeline.cues.reduce(
    (latest, cue, index) =>
      cue.elementKey === elementKey && (cue.step <= step || triggeredCueIds.has(cue.cueId)) ? index : latest,
    -1,
  );
  return {
    activeEffects,
    afterStyle: state.afterStyle,
    identity: `${playbackCycle}-${elementKey}-${reachedCueIndex}`,
    reverse: false,
    visible: state.visible,
  };
};

export const CLICKER_SHORTCUT_GROUPS = [
  {
    title: 'Navigate and animate',
    shortcuts: [
      ['Next build / Screen', '→, Page Down, Space, Enter'],
      ['Previous build / Screen', '←, Page Up, Backspace'],
      ['First / last Screen', 'Home / End'],
      ['Replay current Screen', 'R'],
      ['Open Zoom choice', '1–9'],
    ],
  },
  {
    title: 'Present',
    shortcuts: [
      ['Full screen', 'F or F5'],
      ['Black / white Screen', 'B / W'],
      ['Restore Screen', 'Esc'],
      ['Play / pause media', 'K or media key'],
      ['Zoom', '+ / − / 0'],
    ],
  },
  {
    title: 'Teacher tools',
    shortcuts: [
      ['Pointer / laser', 'V / L'],
      ['Pen / eraser', 'P / E'],
      ['Undo / clear ink', 'Z / C'],
      ['Teaching materials', 'M'],
      ['Shortcut guide', '? or H'],
    ],
  },
] as const;
