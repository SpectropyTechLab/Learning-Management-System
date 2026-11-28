const dir = (option = 'right') => ({
  left: 'l', right: 'r', top: 'u', bottom: 'd',
  'top-left': 'lu', 'top-right': 'ru', 'bottom-left': 'ld', 'bottom-right': 'rd',
})[option] || 'r';

const baseEffectXml = (transition) => {
  const effect = String(transition?.effect || 'none');
  const option = String(transition?.option || transition?.direction || 'right');
  if (effect === 'fade') return `<p:fade${option === 'through-black' ? ' thruBlk="1"' : ''}/>`;
  if (effect === 'push') return `<p:push dir="${dir(option)}"/>`;
  if (effect === 'wipe') return `<p:wipe dir="${dir(option)}"/>`;
  if (effect === 'split') return `<p:split orient="${option.startsWith('horizontal') ? 'horz' : 'vert'}" dir="${option.endsWith('in') ? 'in' : 'out'}"/>`;
  if (effect === 'cut') return `<p:cut${option === 'through-black' ? ' thruBlk="1"' : ''}/>`;
  if (effect === 'random-bars') return `<p:randomBar dir="${option === 'vertical' ? 'vert' : 'horz'}"/>`;
  if (effect === 'shape') return `<p:${['diamond', 'plus'].includes(option) ? option : 'circle'}/>`;
  if (effect === 'cover') return `<p:cover dir="${dir(option)}"/>`;
  if (effect === 'uncover' || effect === 'reveal') return `<p:pull dir="${dir(option.replace(/^(smooth|black)-/, ''))}"/>`;
  if (effect === 'dissolve') return '<p:dissolve/>';
  if (effect === 'checkerboard') return `<p:checker dir="${option === 'vertical' ? 'vert' : 'horz'}"/>`;
  if (effect === 'blinds') return `<p:blinds dir="${option === 'vertical' ? 'vert' : 'horz'}"/>`;
  if (effect === 'clock') return option === 'wedge' ? '<p:wedge/>' : `<p:wheel spokes="1"/>`;
  if (effect === 'comb') return `<p:comb dir="${option === 'vertical' ? 'vert' : 'horz'}"/>`;
  if (effect === 'zoom') return '<p:zoom dir="in"/>';
  return null;
};

const p14EffectXml = (transition) => {
  const effect = String(transition?.effect || '');
  const option = String(transition?.option || transition?.direction || 'right');
  const leftRight = option.includes('left') ? 'l' : 'r';
  const direct = {
    cube: `<p14:prism dir="${dir(option)}"/>`, doors: `<p14:doors dir="${option === 'horizontal' ? 'horz' : 'vert'}"/>`,
    window: `<p14:window dir="${option === 'horizontal' ? 'horz' : 'vert'}"/>`, 'ferris-wheel': `<p14:ferris dir="${leftRight}"/>`,
    gallery: `<p14:gallery dir="${leftRight}"/>`, conveyor: `<p14:conveyor dir="${leftRight}"/>`, pan: `<p14:pan dir="${dir(option)}"/>`,
    glitter: `<p14:glitter dir="${dir(option.replace(/^(diamond|hexagon)-/, ''))}" pattern="${option.startsWith('hexagon') ? 'hexagon' : 'diamond'}"/>`,
    'fly-through': `<p14:flythrough dir="${option.startsWith('out') ? 'out' : 'in'}" hasBounce="${option.includes('bounce') ? '1' : '0'}"/>`,
    flash: '<p14:flash/>', shred: `<p14:shred pattern="${option.startsWith('rectangle') ? 'rectangle' : 'strip'}" dir="${option.endsWith('out') ? 'out' : 'in'}"/>`,
    switch: `<p14:switch dir="${leftRight}"/>`, flip: `<p14:flip dir="${leftRight}"/>`, ripple: '<p14:ripple/>',
    honeycomb: '<p14:honeycomb/>', vortex: `<p14:vortex dir="${dir(option)}"/>`, rotate: `<p14:warp dir="${option.includes('out') ? 'out' : 'in'}"/>`,
  };
  return direct[effect] || null;
};

const presetNames = {
  'fall-over': 'fallOver', drape: 'drape', curtains: 'curtains', wind: 'wind', prestige: 'prestige',
  fracture: 'fracture', crush: 'crush', 'peel-off': 'peelOff', 'page-curl': 'pageCurlSingle', airplane: 'airplane', origami: 'origami',
};

const transitionAttributes = (transition, includeDuration) => {
  const durationMs = Math.round(Math.max(.1, Math.min(20, Number(transition?.duration) || .7)) * 1000);
  const afterMs = Math.round(Math.max(0, Number(transition?.advanceAfterSeconds) || 0) * 1000);
  const attributes = [`spd="${durationMs <= 450 ? 'fast' : durationMs >= 1100 ? 'slow' : 'med'}"`];
  if (includeDuration) attributes.push(`p14:dur="${durationMs}"`);
  attributes.push(`advClick="${transition?.advanceOnClick === false ? '0' : '1'}"`);
  if (transition?.advanceAfterEnabled === true) attributes.push(`advTm="${afterMs}"`);
  return attributes.join(' ');
};

const transitionNode = (transition, effectXml, includeDuration, soundXml = '') =>
  `<p:transition ${transitionAttributes(transition, includeDuration)}>${effectXml}${soundXml}</p:transition>`;

export const pptxTransitionXml = (transition, preservedSoundXml = '') => {
  const effect = String(transition?.effect || 'none');
  if (effect === 'none') return '';
  const standard = baseEffectXml(transition);
  const p14 = p14EffectXml(transition);
  const preset = presetNames[effect]
    ? `<p15:prstTrans prst="${presetNames[effect]}" invX="${String(transition?.option || '').includes('left') ? '1' : '0'}"/>`
    : null;
  const morph = effect === 'morph'
    ? `<p159:morph option="${({ objects: 'byObject', words: 'byWord', characters: 'byChar' })[String(transition?.option || 'objects')] || 'byObject'}"/>`
    : null;
  const soundXml = transition?.sound === 'custom' ? preservedSoundXml : transition?.sound === 'stop' ? '<p:endSnd/>' : '';
  const fallback = transitionNode(transition, standard || '<p:fade/>', false, soundXml);
  const choice = transitionNode(transition, standard || p14 || preset || morph || '<p:fade/>', true, soundXml);
  const requires = morph ? 'p159' : preset ? 'p15' : 'p14';
  return `<mc:AlternateContent><mc:Choice Requires="${requires}">${choice}</mc:Choice><mc:Fallback>${fallback}</mc:Fallback></mc:AlternateContent>`;
};

const ensureNamespace = (xml, prefix, uri) => xml.includes(`xmlns:${prefix}=`)
  ? xml
  : xml.replace(/<p:sld\b/, `<p:sld xmlns:${prefix}="${uri}"`);

export const replacePptxSlideTransitionXml = (sourceXml, transition, hidden = false, customSoundXml = '') => {
  let xml = String(sourceXml);
  // Imported custom sounds already have a valid package relationship. Keep the
  // action while replacing transition timing/effect XML so round trips do not
  // silently strip the sound from the source deck.
  const preservedSoundXml = transition?.sound === 'custom'
    ? (customSoundXml || xml.match(/<p:sndAc\b[\s\S]*?<\/p:sndAc>/i)?.[0] || '')
    : '';
  xml = xml.replace(/<mc:AlternateContent\b[^>]*>[\s\S]*?<p:transition\b[\s\S]*?<\/mc:AlternateContent>/gi, '');
  xml = xml.replace(/<p:transition\b[^>]*>[\s\S]*?<\/p:transition>|<p:transition\b[^>]*\/>/gi, '');
  xml = ensureNamespace(xml, 'mc', 'http://schemas.openxmlformats.org/markup-compatibility/2006');
  xml = ensureNamespace(xml, 'p14', 'http://schemas.microsoft.com/office/powerpoint/2010/main');
  xml = ensureNamespace(xml, 'p15', 'http://schemas.microsoft.com/office/powerpoint/2012/main');
  xml = ensureNamespace(xml, 'p159', 'http://schemas.microsoft.com/office/powerpoint/2015/09/main');
  xml = xml.replace(/<p:sld\b([^>]*)>/, (match, attrs) => {
    const withoutShow = attrs.replace(/\s+show="[^"]*"/g, '');
    return `<p:sld${withoutShow}${hidden ? ' show="0"' : ''}>`;
  });
  const transitionXml = pptxTransitionXml(transition, preservedSoundXml);
  if (!transitionXml) return xml;
  const insertionPoint = /<p:timing\b|<p:extLst\b|<\/p:sld>/i;
  return xml.replace(insertionPoint, (match) => `${transitionXml}${match}`);
};
