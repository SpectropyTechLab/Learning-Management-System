import type { StudioElement } from '../types';

export type StudioAnimationEffect = Record<string, unknown> & {
  id: string;
  effect: string;
  sequenceOrder?: number;
};

export type StudioAnimationSequenceEntry = {
  key: string;
  elementId: string;
  element: StudioElement;
  effectIndex: number;
  effect: StudioAnimationEffect;
  fallbackOrder: number;
};

export type StudioAnimationSequenceGroup = {
  id: string;
  clickIndex: number | null;
  trigger: boolean;
  entries: Array<StudioAnimationSequenceEntry & {
    startsAt: number;
    endsAt: number;
  }>;
  duration: number;
};

export const studioElementAnimationEffects = (element: StudioElement): StudioAnimationEffect[] => {
  const animation = element.content.animation;
  if (!animation || typeof animation !== 'object' || Array.isArray(animation)) return [];
  const saved = animation as Record<string, unknown>;
  if (Array.isArray(saved.effects) && saved.effects.length) {
    return saved.effects.flatMap((candidate, index) => {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return [];
      const effect = candidate as Record<string, unknown>;
      return [{ ...effect, id: String(effect.id || `${element.id}-effect-${index}`), effect: String(effect.effect || 'appear') }];
    });
  }
  const legacy = String(saved.effect || 'none');
  return legacy === 'none' ? [] : [{ id: `${element.id}-legacy`, effect: legacy, duration: Number(saved.duration) || 0.8, delay: Number(saved.delay) || 0, start: 'on-click' }];
};

export const buildStudioAnimationSequence = (elements: StudioElement[]): StudioAnimationSequenceEntry[] => {
  let fallbackOrder = 0;
  return elements.flatMap((element) => studioElementAnimationEffects(element).map((effect, effectIndex) => ({
    key: `${element.id}:${effect.id}`,
    elementId: element.id,
    element,
    effectIndex,
    effect,
    fallbackOrder: fallbackOrder++,
  }))).sort((left, right) => {
    const leftOrder = Number(left.effect.sequenceOrder);
    const rightOrder = Number(right.effect.sequenceOrder);
    const leftHasOrder = Number.isFinite(leftOrder);
    const rightHasOrder = Number.isFinite(rightOrder);
    if (leftHasOrder && rightHasOrder && leftOrder !== rightOrder) return leftOrder - rightOrder;
    if (leftHasOrder !== rightHasOrder) return leftHasOrder ? -1 : 1;
    return left.fallbackOrder - right.fallbackOrder;
  });
};

export const buildStudioAnimationGroups = (elements: StudioElement[]): StudioAnimationSequenceGroup[] => {
  const sequence = buildStudioAnimationSequence(elements);
  const groups: StudioAnimationSequenceGroup[] = [];
  let clickIndex = 0;
  let current: StudioAnimationSequenceGroup | null = null;
  let previousStart = 0;
  let previousEnd = 0;

  for (const entry of sequence) {
    const start = String(entry.effect.start || 'on-click');
    if (start === 'trigger') {
      const delay = Math.max(0, Number(entry.effect.delay) || 0);
      const duration = Math.max(0.001, Number(entry.effect.duration) || 0.8);
      groups.push({
        id: `trigger-${entry.key}`,
        clickIndex: null,
        trigger: true,
        entries: [{ ...entry, startsAt: delay, endsAt: delay + duration }],
        duration: delay + duration,
      });
      continue;
    }
    if (!current || start === 'on-click') {
      clickIndex += 1;
      current = { id: `click-${clickIndex}`, clickIndex, trigger: false, entries: [], duration: 0 };
      groups.push(current);
      previousStart = 0;
      previousEnd = 0;
    }
    const delay = Math.max(0, Number(entry.effect.delay) || 0);
    const duration = Math.max(0.001, Number(entry.effect.duration) || 0.8);
    const startsAt = start === 'with-previous' ? previousStart + delay : start === 'after-previous' ? previousEnd + delay : delay;
    const endsAt = startsAt + duration;
    current.entries.push({ ...entry, startsAt, endsAt });
    current.duration = Math.max(current.duration, endsAt);
    previousStart = startsAt;
    previousEnd = start === 'with-previous' ? Math.max(previousEnd, endsAt) : endsAt;
  }
  return groups;
};

export const persistStudioAnimationSequence = (elements: StudioElement[], orderedKeys: string[]): StudioElement[] => {
  const sequence = buildStudioAnimationSequence(elements);
  const known = new Set(sequence.map((entry) => entry.key));
  const completeOrder = [...orderedKeys.filter((key) => known.has(key)), ...sequence.map((entry) => entry.key).filter((key) => !orderedKeys.includes(key))];
  const orderByKey = new Map(completeOrder.map((key, index) => [key, index]));
  return elements.map((element) => {
    const effects = studioElementAnimationEffects(element);
    if (!effects.length) return element;
    const nextEffects = effects.map((effect) => ({ ...effect, sequenceOrder: orderByKey.get(`${element.id}:${effect.id}`) ?? 0 }));
    const first = nextEffects[0];
    return { ...element, content: { ...element.content, animation: { ...(element.content.animation as Record<string, unknown> | undefined), effects: nextEffects, effect: first?.effect || 'none', duration: Number(first?.duration) || 0.8, delay: Number(first?.delay) || 0 } } };
  });
};
