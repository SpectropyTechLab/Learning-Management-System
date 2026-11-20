const fs = require('node:fs');
const path = require('node:path');
const parser = require('../frontend/node_modules/@babel/parser');

const sourceFile = process.argv[2];
const outputFile = process.argv[3];
if (!sourceFile || !outputFile) {
  throw new Error('Usage: node scripts/extract-physics-object-library.cjs <physics.html> <output.json>');
}

const html = fs.readFileSync(sourceFile, 'utf8');
const source = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((match) => match[1]).join('\n');
const ast = parser.parse(source, { sourceType: 'script', errorRecovery: true });

const text = (node, fallback = '') => node?.type === 'StringLiteral' ? node.value : fallback;
const value = (node) => {
  if (!node) return undefined;
  if (['StringLiteral', 'NumericLiteral', 'BooleanLiteral'].includes(node.type)) return node.value;
  if (node.type === 'UnaryExpression' && node.operator === '-') return -Number(value(node.argument));
  if (node.type === 'ObjectExpression') return Object.fromEntries(node.properties.flatMap((property) => {
    if (property.type !== 'ObjectProperty') return [];
    const key = property.key.type === 'Identifier' ? property.key.name : text(property.key);
    return [[key, value(property.value)]];
  }));
  return undefined;
};
const visit = (node, callback) => {
  if (!node || typeof node !== 'object') return;
  callback(node);
  for (const [key, child] of Object.entries(node)) {
    if (['loc', 'start', 'end'].includes(key)) continue;
    if (Array.isArray(child)) child.forEach((entry) => visit(entry, callback));
    else visit(child, callback);
  }
};

let baseTypes;
visit(ast.program, (node) => {
  if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier' || node.id.name !== 'TYPES') return;
  if (node.init?.type === 'ObjectExpression' && !baseTypes) baseTypes = node.init;
});
if (!baseTypes) throw new Error('Physics TYPES registry was not found.');

const definitions = { ...value(baseTypes) };
visit(ast.program, (node) => {
  if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') return;
  const isAssign = node.callee.object.type === 'Identifier' && node.callee.object.name === 'Object'
    && node.callee.property.type === 'Identifier' && node.callee.property.name === 'assign';
  if (!isAssign || node.arguments[0]?.type !== 'Identifier' || node.arguments[0].name !== 'TYPES') return;
  if (node.arguments[1]?.type === 'ObjectExpression') Object.assign(definitions, value(node.arguments[1]));
});

const categories = new Set(['General', 'Mechanics', 'Optics', 'Electromagnetics', 'Fluid Mechanics', 'Thermal Physics', 'SHM & Waves', 'Modern Physics', 'Annotation', '3D Solids']);
visit(ast.program, (node) => {
  if (node.type !== 'ObjectExpression') return;
  const candidate = value(node);
  const entries = Object.entries(candidate || {});
  if (entries.length < 5 || !entries.every(([key, category]) => key in definitions && categories.has(category))) return;
  entries.forEach(([key, category]) => { definitions[key].c = category; });
});

const iconFor = (type) => ({
  ball: '●', block: '▣', car: '🚙', rocket: '🚀', cannon: '🔭', pendulum: '◉', spring: '〰', vector: '→',
  bulb: '💡', charge: '⊕', planet: '🪐', star: '☀', surface: '▰', label: 'x=1', incline: '◩', pulley: '◉',
  disc: '◉', rope: '╲', lens: '◐', mirror: '◒', objarrow: '↥', ray: '╱', prism: '△', slab: '▭', screen: '▏',
  laser: '🔦', slit: '⋮', magnet: '🧲', coil: '〰', wire: '⊙', bfield: '⠿', efield: '⠿', capacitor: '║',
  resistor: '〽', battery: '▥', meter: '◴', tank: '▣', particles: '⠿', piston: '▥', thermometer: '🌡', flame: '🔥',
  curve: '∿', photon: '〰', electron: '−', nucleus: '⚛', atom: '⚛', dots: '⠿', note: 'Aa', ruler: '▤', anglemark: '⌒',
  orbitpath: '◌', cube3d: '◆', cyl3d: '⬭', cone3d: '▲', sphere3d: '🌐', pyr3d: '◭', prism3d: '◈', helix3d: '♒', axes3d: '⌖',
}[type] || '◇');

const catalog = Object.entries(definitions).map(([type, definition]) => ({
  id: type,
  type,
  name: definition.n || type,
  category: definition.c || 'General',
  dimension: definition.c === '3D Solids' || type.endsWith('3d') ? '3d' : '2d',
  icon: iconFor(type),
  defaultColor: ({ Optics: 'Amber', Electromagnetics: 'Copper', 'Fluid Mechanics': 'Sky', 'Thermal Physics': 'Coral', 'Modern Physics': 'Sky', '3D Solids': 'Sky' })[definition.c] || 'Amber',
  defaultTrail: 'none',
  properties: definition.p || {},
  iconProperties: definition.ic || {},
  editableFields: Object.keys(definition.p || {}),
})).sort((left, right) => [...categories].indexOf(left.category) - [...categories].indexOf(right.category) || left.name.localeCompare(right.name));

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputFile, count: catalog.length, categories: Object.fromEntries([...categories].map((category) => [category, catalog.filter((entry) => entry.category === category).length])) }, null, 2));
