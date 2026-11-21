const GREEK_NAMES: Record<string, string> = {
  alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma', delta: '\\delta',
  epsilon: '\\epsilon', theta: '\\theta', lambda: '\\lambda', mu: '\\mu',
  rho: '\\rho', sigma: '\\sigma', tau: '\\tau', phi: '\\phi', omega: '\\omega',
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
  'ε': '\\epsilon', 'θ': '\\theta', 'λ': '\\lambda', 'μ': '\\mu',
  'ρ': '\\rho', 'σ': '\\sigma', 'τ': '\\tau', 'φ': '\\phi', 'ω': '\\omega',
  'Δ': '\\Delta',
};

const matchingOuterParentheses = (source: string) => {
  if (!source.startsWith('(') || !source.endsWith(')')) return false;
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '(') depth += 1;
    if (source[index] === ')') depth -= 1;
    if (depth === 0 && index < source.length - 1) return false;
  }
  return depth === 0;
};

const findTopLevelDivision = (source: string) => {
  let depth = 0;
  for (let index = source.length - 1; index >= 0; index -= 1) {
    if (source[index] === ')') depth += 1;
    if (source[index] === '(') depth -= 1;
    if (depth === 0 && source[index] === '/') {
      const left = source.slice(0, index).trim();
      const right = source.slice(index + 1).trim();
      // In expressions such as "1/2 g t^2", only 1/2 is the fraction.
      if (left === '1' && /^2(?:\s|$)/.test(right)) continue;
      // Do not turn a single division inside a larger sum into one giant fraction.
      if (/[+\-](?![^()]*\))/.test(right)) continue;
      return index;
    }
  }
  return -1;
};

const functionArguments = (source: string) => {
  let output = source;
  const functions: Record<string, string> = {
    sin: '\\sin', cos: '\\cos', tan: '\\tan', asin: '\\arcsin',
    abs: '\\operatorname{abs}', min: '\\min', max: '\\max',
    exp: '\\exp', ln: '\\ln', mod: '\\operatorname{mod}',
  };
  Object.entries(functions).forEach(([name, latex]) => {
    output = output.replace(new RegExp(`\\b${name}\\s*\\\\left\\(`, 'g'), `${latex}\\left(`);
  });
  return output;
};

const convertPlainExpression = (source: string): string => {
  let value = source.trim();
  value = value.replace(/deg\s*\(([^()]*)\)/g, '$1');
  value = value.replace(/sqrt\s*\(([^()]*)\)/g, (_match, inner: string) => `\\sqrt{${convertPlainExpression(inner)}}`);
  value = value.replace(/\b1\s*\/\s*2\b/g, String.raw`\frac{1}{2}`);
  value = value.replace(/\)/g, String.raw`\right)`);
  value = value.replace(/\(/g, String.raw`\left(`);
  value = functionArguments(value);
  value = value.replace(/\brad2deg\s*\\left\(/g, String.raw`\operatorname{rad2deg}\left(`);
  value = value.replace(/\^\s*\(?([\-\d.]+)\)?/g, '^{$1}');
  value = value.replace(/\*/g, String.raw`\cdot `);
  value = value.replace(/<=/g, String.raw`\le `).replace(/>=/g, String.raw`\ge `);
  value = value.replace(/\bpi\b/g, String.raw`\pi`);
  Object.entries(GREEK_NAMES).forEach(([name, latex]) => {
    const pattern = /^[A-Za-z]+$/.test(name) ? new RegExp(`\\b${name}\\b`, 'g') : new RegExp(name, 'g');
    value = value.replace(pattern, latex);
  });
  return value;
};

export const physicsIdentifierToLatex = (source: string) => {
  const value = source.trim();
  if (GREEK_NAMES[value]) return GREEK_NAMES[value];
  if (/^v[xy]$/.test(value)) return `v_{${value.slice(1)}}`;
  if (/^[A-Za-z]+\d+$/.test(value)) {
    const match = value.match(/^([A-Za-z]+)(\d+)$/);
    if (match) return `${match[1]}_{${match[2]}}`;
  }
  return value.replace(/_/g, String.raw`\_`);
};

export const physicsExpressionToLatex = (source: string): string => {
  const value = source.trim() || '0';
  const division = findTopLevelDivision(value);
  if (division >= 0) {
    let numerator = value.slice(0, division).trim();
    let denominator = value.slice(division + 1).trim();
    if (matchingOuterParentheses(numerator)) numerator = numerator.slice(1, -1);
    if (matchingOuterParentheses(denominator)) denominator = denominator.slice(1, -1);
    return `\\frac{${physicsExpressionToLatex(numerator)}}{${physicsExpressionToLatex(denominator)}}`;
  }
  return convertPlainExpression(value);
};

export const physicsEquationToLatex = (output: string, expression: string) =>
  `${physicsIdentifierToLatex(output)} = ${physicsExpressionToLatex(expression)}`;
