const fs = require('node:fs');
const path = require('node:path');
const parser = require('../frontend/node_modules/@babel/parser');

const sourceRoot = process.argv[2];
const outputDirectory = process.argv[3];
if (!sourceRoot || !outputDirectory) {
  throw new Error('Usage: node scripts/extract-simulation-catalog.cjs <source-directory> <output-directory>');
}

const subjects = {
  physics: { file: 'physics.html', categories: null },
  chemistry: { file: 'chemistry.html', categories: new Set(['Atomic Structure', 'Periodic Table', 'Chemical Bonding', 'States of Matter', 'Thermodynamics', 'Chemical Kinetics', 'Equilibrium', 'Acids, Bases & Electrochemistry']) },
  biology: { file: 'biology.html', categories: new Set(['Cell Biology', 'Genetics', 'Molecular Biology', 'Plant Physiology', 'Human Physiology', 'Ecology', 'Evolution', 'Biotechnology']) },
  mathematics: { file: 'maths.html', categories: new Set(['Algebra', 'Functions & Graphs', 'Trigonometry', 'Coordinate Geometry', 'Calculus', 'Vectors & 3D', 'Sequences & Series', 'Probability & Statistics']) },
};

const scriptsFromHtml = (html) => [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((match) => match[1]).join('\n');
const slug = (value) => String(value).normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'simulation';
const nativeKinds = new Map([
  ['Projectile Motion', 'projectile'], ['Free Fall', 'free-fall'], ['Kinetic Energy – Cart', 'kinetic-energy'],
  ["Ohm's Law – Bulb", 'ohm'], ['Spring–Mass SHM', 'spring'], ['Simple Pendulum', 'pendulum'],
  ['Uniform Circular Motion', 'circular'],
  ['Travelling Wave on a String', 'wave'], ['Interactive Periodic Table', 'periodic-table'],
]);
const greekNames = new Map(Object.entries({
  'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'ε': 'epsilon',
  'θ': 'theta', 'κ': 'kappa', 'λ': 'lambda', 'μ': 'mu', 'ν': 'nu',
  'ξ': 'xi', 'π': 'pi', 'ρ': 'rho', 'σ': 'sigma', 'τ': 'tau',
  'φ': 'phi', 'ϕ': 'phi', 'χ': 'chi', 'ψ': 'psi', 'ω': 'omega',
  'Δ': 'Delta', 'Θ': 'Theta', 'Ω': 'Omega',
}));
const safeKey = (source, fallback) => {
  const expanded = [...String(source)].map((character) => greekNames.get(character) || character).join('');
  const cleaned = expanded.normalize('NFKD').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  return /^[A-Za-z]/.test(cleaned) ? cleaned : fallback;
};
const parameterAliases = {
  projectile: { u: 'v', 'θ': 'a' },
  pendulum: { 'θ0': 'th' },
  circular: { 'ω': 'w' },
  wave: { 'λ': 'lam' },
};
const text = (node, fallback = '') => node?.type === 'StringLiteral' ? node.value : fallback;
const number = (node, fallback = 0) => node?.type === 'NumericLiteral' ? node.value : node?.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'NumericLiteral' ? -node.argument.value : fallback;

function lookupConst(ast, name) {
  let found;
  for (const statement of ast.program.body) {
    if (statement.type !== 'VariableDeclaration') continue;
    for (const declaration of statement.declarations) {
      if (declaration.id.type === 'Identifier' && declaration.id.name === name) found = declaration.init;
    }
  }
  return found;
}

function value(node, ast) {
  if (!node) return undefined;
  if (node.type === 'StringLiteral' || node.type === 'NumericLiteral' || node.type === 'BooleanLiteral') return node.value;
  if (node.type === 'NullLiteral') return null;
  if (node.type === 'UnaryExpression' && node.operator === '-') return -Number(value(node.argument, ast));
  if (node.type === 'Identifier') {
    const declaration = lookupConst(ast, node.name);
    return declaration ? value(declaration, ast) : node.name;
  }
  if (node.type === 'ArrayExpression') return node.elements.map((entry) => value(entry, ast));
  if (node.type === 'ObjectExpression') {
    return Object.fromEntries(node.properties.flatMap((property) => {
      if (property.type !== 'ObjectProperty') return [];
      const key = property.key.type === 'Identifier' ? property.key.name : text(property.key);
      return [[key, value(property.value, ast)]];
    }));
  }
  return undefined;
}

const objectProperty = (node, key) => node?.type === 'ObjectExpression'
  ? node.properties.find((property) => property.type === 'ObjectProperty' && ((property.key.type === 'Identifier' && property.key.name === key) || text(property.key) === key))?.value
  : undefined;

function generatedObject(node, index, ast) {
  if (node?.type !== 'CallExpression') return { id: `object-${index + 1}`, name: `Object ${index + 1}`, type: 'object', visible: true };
  const callee = node.callee.type === 'Identifier' ? node.callee.name : '';
  if (callee === 'O' || callee === 'L_') {
    const type = text(node.arguments[0], 'object');
    return { id: `${slug(type)}-${index + 1}`, name: text(node.arguments[1], type || `Object ${index + 1}`), type, visible: true, properties: { color: text(node.arguments[2]), ...(value(node.arguments[3], ast) || {}), ...(value(node.arguments[4], ast) || {}) } };
  }
  if (callee === 'BOD') {
    const options = node.arguments[1];
    return { id: `body-${index + 1}`, name: text(objectProperty(options, 'label'), `Body ${index + 1}`), type: text(objectProperty(options, 'type'), 'body'), visible: true, properties: { ...(value(node.arguments[0], ast) || {}), ...(value(options, ast) || {}) } };
  }
  return { id: `${slug(callee)}-${index + 1}`, name: `${callee || 'Object'} ${index + 1}`, type: callee || 'object', visible: true };
}

function generatedParts(model, ast) {
  const generator = objectProperty(model, 'gen');
  const body = generator?.type === 'ArrowFunctionExpression'
    ? generator.body.type === 'ObjectExpression' ? generator.body : generator.body.body.find((statement) => statement.type === 'ReturnStatement')?.argument
    : undefined;
  const source = body?.type === 'ObjectExpression' ? body : model;
  const equations = value(objectProperty(source, 'eqs'), ast) || [];
  const states = value(objectProperty(source, 'ode'), ast) || [];
  const graphOutputs = value(objectProperty(source, 'gs'), ast) || [];
  const objectNodes = objectProperty(source, 'objs');
  const objects = objectNodes?.type === 'ArrayExpression' ? objectNodes.elements.map((node, index) => generatedObject(node, index, ast)) : [];
  return { equations, states, graphOutputs, objects };
}

function buildTemplate({ subject, category, id, name, description, icon, parameters, parameterStyle = 'model', parts, background, duration, runtime }) {
  const kind = nativeKinds.get(name) || `${subject}-${slug(id || name)}`;
  const usedEquationIds = new Set();
  const equations = [...parts.equations, ...parts.states].map((entry, index) => {
    const output = String(entry?.[0] ?? `output_${index + 1}`);
    let equationId = safeKey(`${output}_${index + 1}`, `equation_${index + 1}`);
    while (usedEquationIds.has(equationId)) equationId += '-copy';
    usedEquationIds.add(equationId);
    const isState = index >= parts.equations.length;
    return { id: equationId, output: safeKey(output, `output_${index + 1}`), expression: String(entry?.[1] ?? '0'), enabled: true, role: isState ? 'state' : 'derived', ...(isState ? { initialValue: String(entry?.[2] ?? '0') } : {}) };
  });
  const results = [
    ...parts.equations.map((entry, index) => ({ id: `equation-result-${index + 1}`, label: String(entry?.[0] ?? `Result ${index + 1}`), expression: String(entry?.[1] ?? '0'), unit: '', precision: 3, display: parts.graphOutputs.includes(entry?.[0]) ? 'graph' : 'card', visible: true })),
    ...parts.states.map((entry, index) => ({ id: `state-result-${index + 1}`, label: String(entry?.[0] ?? `State ${index + 1}`), expression: String(entry?.[0] ?? '0'), unit: '', precision: 3, display: parts.graphOutputs.includes(entry?.[0]) ? 'graph' : 'label', visible: true })),
  ];
  const usedKeys = new Set();
  const controls = parameters.map((entry, index) => {
    const key = String(entry?.[0] ?? `variable_${index + 1}`);
    const alias = parameterAliases[kind]?.[key];
    let internalKey = alias || safeKey(key, `variable_${index + 1}`);
    while (usedKeys.has(internalKey)) internalKey = `${internalKey}_${index + 1}`;
    usedKeys.add(internalKey);
    if (parameterStyle === 'physics') {
      return { key: internalKey, sourceKey: key, label: key, defaultValue: Number(entry?.[4] ?? 0), min: Number(entry?.[1] ?? 0), max: Number(entry?.[2] ?? 100), step: Math.max(Number(entry?.[3] ?? 1), 0.0001), unit: String(entry?.[5] ?? '') };
    }
    return { key: internalKey, sourceKey: key, label: String(entry?.[1] ?? key), defaultValue: Number(entry?.[2] ?? 0), min: Number(entry?.[3] ?? 0), max: Number(entry?.[4] ?? 100), step: Math.max(Number(entry?.[5] ?? 1), 0.0001), unit: String(entry?.[6] ?? '') };
  });
  return {
    id: `${subject}-${slug(id || name)}`,
    subject,
    kind,
    title: name,
    description: description || name,
    icon: icon || 'sparkles',
    iconKey: icon || slug(`${category}-${name}`),
    category,
    parameters: controls.map(({ sourceKey, ...entry }) => entry),
    variables: controls.map((entry) => ({ id: entry.key, symbol: entry.sourceKey, label: entry.label, value: entry.defaultValue, min: entry.min, max: entry.max, step: entry.step, unit: entry.unit, learnerEditable: true })),
    equations,
    objects: parts.objects,
    results,
    playback: { duration: Number(duration || 10), loop: true },
    view: { background: background === 'paper' ? '#f8fafc' : background === 'space' ? '#020617' : '#09111d' },
    metadata: { source: 'SPECTROPY Activity Studio HTML', sourceId: id, category, graphOutputs: parts.graphOutputs, ...(runtime ? { physicsRuntime: runtime } : {}) },
  };
}

function extractPhysics(ast) {
  const declaration = lookupConst(ast, 'NEW');
  if (declaration?.type !== 'ArrayExpression') throw new Error('Physics NEW catalog was not found.');
  const legacyDeclaration = lookupConst(ast, 'PRESETS');
  const graphSeries = value(lookupConst(ast, 'GS'), ast) || {};
  const legacyModels = new Map((legacyDeclaration?.type === 'ArrayExpression' ? legacyDeclaration.elements : []).flatMap((entry) => {
    if (entry?.type !== 'ObjectExpression') return [];
    const name = text(objectProperty(entry, 'name'));
    return name ? [[name, entry]] : [];
  }));
  return declaration.elements.flatMap((entry) => {
    if (entry?.type !== 'CallExpression' || entry.callee.type !== 'Identifier' || entry.callee.name !== 'TP') return [];
    const category = text(entry.arguments[0], 'Physics');
    const name = text(entry.arguments[1]);
    let model = entry.arguments[2];
    if (model?.type === 'MemberExpression' && model.object.type === 'Identifier' && model.object.name === 'OLD') {
      const legacyName = model.computed ? text(model.property) : model.property.type === 'Identifier' ? model.property.name : '';
      model = legacyModels.get(legacyName);
    }
    if (!name || model?.type !== 'ObjectExpression') return [];
    const parts = generatedParts(model, ast);
    const registeredSeries = graphSeries[name];
    if (Array.isArray(registeredSeries)) parts.graphOutputs = registeredSeries;
    const runtime = {
      bg: text(objectProperty(model, 'bg'), 'neutral'), unit: value(objectProperty(model, 'unit'), ast) || '',
      x: text(objectProperty(model, 'x')), tv: text(objectProperty(model, 'tv')),
      px: text(objectProperty(model, 'px')), py: text(objectProperty(model, 'py')),
      layout: text(objectProperty(model, 'layout')), view: value(objectProperty(model, 'view'), ast),
      graph: value(objectProperty(model, 'G'), ast), events: value(objectProperty(model, 'ev'), ast) || [],
    };
    return [buildTemplate({ subject: 'physics', category, id: name, name, description: text(objectProperty(model, 'desc'), name), icon: text(objectProperty(model, 'icon'), 'sparkles'), parameters: value(objectProperty(model, 'vars'), ast) || [], parameterStyle: 'physics', parts, background: text(objectProperty(model, 'bg')), duration: number(objectProperty(model, 'tmax'), 10), runtime })];
  });
}

function extractModels(ast, subject, allowedCategories) {
  const calls = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'MD') calls.push(node);
    for (const [key, child] of Object.entries(node)) {
      if (['loc', 'start', 'end'].includes(key)) continue;
      if (Array.isArray(child)) child.forEach(visit); else visit(child);
    }
  };
  visit(ast.program);
  return calls.flatMap((call) => {
    const categories = value(call.arguments[0], ast);
    const categoryList = Array.isArray(categories) ? categories : [categories];
    const category = categoryList.find((candidate) => allowedCategories.has(candidate));
    if (!category) return [];
    const id = text(call.arguments[1]); const name = text(call.arguments[2]); const model = call.arguments[3];
    if (!id || !name || model?.type !== 'ObjectExpression') return [];
    return [buildTemplate({ subject, category, id, name, description: text(objectProperty(model, 'desc'), name), icon: text(objectProperty(model, 'icon'), 'sparkles'), parameters: value(objectProperty(model, 'prm'), ast) || [], parts: generatedParts(model, ast), background: text(objectProperty(model, 'bg')), duration: number(objectProperty(model, 'tmax'), 10) })];
  });
}

const catalog = [];
for (const [subject, config] of Object.entries(subjects)) {
  const html = fs.readFileSync(path.join(sourceRoot, config.file), 'utf8');
  const ast = parser.parse(scriptsFromHtml(html), { sourceType: 'script', errorRecovery: true });
  catalog.push(...(subject === 'physics' ? extractPhysics(ast) : extractModels(ast, subject, config.categories)));
}

fs.mkdirSync(outputDirectory, { recursive: true });
for (const subject of Object.keys(subjects)) {
  const fileName = subject === 'mathematics' ? 'mathematics.generated.json' : `${subject}.generated.json`;
  fs.writeFileSync(path.join(outputDirectory, fileName), `${JSON.stringify(catalog.filter((entry) => entry.subject === subject), null, 2)}\n`, 'utf8');
}
const summary = Object.fromEntries(Object.keys(subjects).map((subject) => [subject, catalog.filter((entry) => entry.subject === subject).length]));
console.log(JSON.stringify({ outputDirectory, total: catalog.length, subjects: summary }, null, 2));
