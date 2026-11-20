const fs = require('node:fs');
const path = require('node:path');

const source = process.argv[2];
const destination = process.argv[3];
if (!source || !destination) throw new Error('Usage: node scripts/import-physics-runtime.cjs <physics.html> <destination.html>');
const html = fs.readFileSync(source, 'utf8');
if (!html.includes('const PLAYER=!!window.EMBED') || !html.includes('function drawGraph')) {
  throw new Error('The supplied file is not the expected SPECTROPY Physics Studio runtime.');
}
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, html, 'utf8');
console.log(JSON.stringify({ source, destination, bytes: Buffer.byteLength(html), runtime: 'physics' }, null, 2));
