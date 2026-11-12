export type PresenterAnimationCue = {
  elementKey: string;
  effect: Record<string, unknown>;
  step: number;
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
]);

const effectsFor = (element: ClickerElement): Array<Record<string, unknown>> => {
  const animation = element.content_json?.animation;
  if (!animation || typeof animation !== 'object' || Array.isArray(animation)) return [];
  const value = animation as Record<string, unknown>;
  if (Array.isArray(value.effects) && value.effects.length)
    return value.effects.filter(
      (effect): effect is Record<string, unknown> =>
        Boolean(effect) && typeof effect === 'object' && !Array.isArray(effect),
    );
  const effect = String(value.effect || 'none');
  if (effect === 'none') return [];
  return [
    {
      effect,
      duration: value.duration,
      delay: value.delay,
      start: 'on-click',
    },
  ];
};

const diagramEffectsFor = (element: ClickerElement): Array<Record<string, unknown>> => {
  const content = element.content_json as SmartDiagramLike | undefined;
  if (content?.visualType !== 'smart_diagram' || !Array.isArray(content.nodes)) return [];
  const nodes = content.nodes.filter((node): node is Record<string, unknown> => Boolean(node) && typeof node === 'object' && !Array.isArray(node));
  const ordered = content.reverseAnimation === true ? [...nodes].reverse() : nodes;
  const orderedByLevel = [...ordered].sort((left, right) => (Number(left.level) || 0) - (Number(right.level) || 0));
  const mode = String(content.revealMode || 'as-one-object');
  const groups = mode === 'as-one-object' || mode === 'all-at-once'
    ? [ordered]
    : mode === 'level-at-once'
    ? [...new Set(ordered.map((node) => Number(node.level) || 0))].sort((a, b) => a - b).map((level) => ordered.filter((node) => (Number(node.level) || 0) === level))
    : (mode === 'level-one-by-one' ? orderedByLevel : ordered).map((node) => [node]);
  return groups.map((group) => ({
    effect: 'appear', start: 'on-click', duration: 0.25, delay: 0,
    diagramNodeIds: group.map((node) => String(node.id || '')).filter(Boolean),
    diagramReveal: true,
  }));
};

export const buildPresenterAnimationTimeline = (
  elements: ClickerElement[],
): PresenterAnimationTimeline => {
  let currentStep = 0;
  const cues: PresenterAnimationCue[] = [];
  for (const element of elements) {
    const effects = [...effectsFor(element), ...diagramEffectsFor(element)];
    effects.forEach((effect, index) => {
      const start = String(effect.start || (index === 0 ? 'on-click' : 'after-previous'));
      if (start === 'on-click') currentStep += 1;
      cues.push({ elementKey: element.element_key, effect: { ...effect, start }, step: currentStep });
    });
  }
  return { cues, maxStep: currentStep };
};

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

export const presenterElementState = (
  timeline: PresenterAnimationTimeline,
  elementKey: string,
  step: number,
) => {
  const cues = timeline.cues.filter((cue) => cue.elementKey === elementKey);
  const objectCues = cues.filter((cue) => cue.effect.diagramReveal !== true);
  const activeEffects = objectCues.filter((cue) => cue.step === step).map((cue) => cue.effect);
  const entrances = objectCues.filter((cue) => entranceEffects.has(String(cue.effect.effect || '')));
  const exits = objectCues.filter((cue) => exitEffects.has(String(cue.effect.effect || '')));
  const visibleAfterEntrance = entrances.length === 0 || entrances.some((cue) => cue.step <= step);
  const hiddenAfterExit = exits.some((cue) => cue.step < step);
  return {
    activeEffects,
    visible: visibleAfterEntrance && !hiddenAfterExit,
  };
};

export const presenterElementPlaybackState = (
  timeline: PresenterAnimationTimeline,
  elementKey: string,
  step: number,
  playbackCycle: number,
  navigation?: PresenterAnimationNavigation | null,
) => {
  const state = presenterElementState(timeline, elementKey, step);
  const cueStep =
    navigation && navigation.toStep === step
      ? navigation.direction === 'backward'
        ? navigation.fromStep
        : navigation.toStep
      : step;
  const activeEffects = timeline.cues
    .filter(
      (cue) =>
        cue.elementKey === elementKey &&
        cue.step === cueStep &&
        cue.effect.diagramReveal !== true,
    )
    .map((cue) => cue.effect);
  const reachedCueIndex = timeline.cues.reduce(
    (latest, cue, index) =>
      cue.elementKey === elementKey && cue.step <= step ? index : latest,
    -1,
  );
  return {
    activeEffects,
    identity: `${playbackCycle}-${elementKey}-${reachedCueIndex}`,
    reverse:
      navigation?.direction === 'backward' && navigation.toStep === step,
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
