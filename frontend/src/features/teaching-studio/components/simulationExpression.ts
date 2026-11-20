import type { SimulationDocument } from './simulationStudioModel';

type Token = { type: 'number' | 'identifier' | 'operator' | 'paren' | 'comma'; value: string };

const tokenize = (source: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);
    const whitespace = rest.match(/^\s+/); if (whitespace) { index += whitespace[0].length; continue; }
    const number = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i); if (number) { tokens.push({ type: 'number', value: number[0] }); index += number[0].length; continue; }
    const identifier = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/); if (identifier) { tokens.push({ type: 'identifier', value: identifier[0] }); index += identifier[0].length; continue; }
    const char = source[index];
    if ('+-*/^'.includes(char)) tokens.push({ type: 'operator', value: char });
    else if ('()'.includes(char)) tokens.push({ type: 'paren', value: char });
    else if (char === ',') tokens.push({ type: 'comma', value: char });
    else throw new Error(`Unsupported character “${char}”.`);
    index += 1;
  }
  return tokens;
};

const functions: Record<string, (...values: number[]) => number> = {
  sin: (value) => Math.sin(value * Math.PI / 180), cos: (value) => Math.cos(value * Math.PI / 180), tan: (value) => Math.tan(value * Math.PI / 180),
  sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp, ln: Math.log, log: Math.log10, min: Math.min, max: Math.max,
};

export const evaluateSimulationExpression = (source: string, scope: Record<string, number>): number => {
  const tokens = tokenize(source); let cursor = 0;
  const peek = () => tokens[cursor]; const take = () => tokens[cursor++];
  const primary = (): number => {
    const token = take(); if (!token) throw new Error('Expression is incomplete.');
    if (token.type === 'number') return Number(token.value);
    if (token.type === 'identifier') {
      if (peek()?.value === '(') { take(); const args: number[] = []; if (peek()?.value !== ')') { do { args.push(additive()); if (peek()?.value !== ',') break; take(); } while (true); } if (take()?.value !== ')') throw new Error('Missing closing parenthesis.'); const fn = functions[token.value.toLowerCase()]; if (!fn) throw new Error(`Function “${token.value}” is not supported.`); return fn(...args); }
      if (token.value === 'pi') return Math.PI;
      if (!(token.value in scope)) throw new Error(`Unknown variable “${token.value}”.`);
      return scope[token.value];
    }
    if (token.value === '(') { const value = additive(); if (take()?.value !== ')') throw new Error('Missing closing parenthesis.'); return value; }
    if (token.value === '-') return -primary();
    if (token.value === '+') return primary();
    throw new Error('Expected a number, variable or function.');
  };
  const power = (): number => { let value = primary(); if (peek()?.value === '^') { take(); value **= power(); } return value; };
  const multiplicative = (): number => { let value = power(); while (peek() && ['*', '/'].includes(peek().value)) { const operator = take().value; const right = power(); value = operator === '*' ? value * right : value / right; } return value; };
  const additive = (): number => { let value = multiplicative(); while (peek() && ['+', '-'].includes(peek().value)) { const operator = take().value; const right = multiplicative(); value = operator === '+' ? value + right : value - right; } return value; };
  const value = additive(); if (cursor !== tokens.length) throw new Error(`Unexpected token “${tokens[cursor].value}”.`); if (!Number.isFinite(value)) throw new Error('Expression does not produce a finite number.'); return value;
};

export const calculateSimulationValues = (simulation: SimulationDocument, time = 0) => {
  const values: Record<string, number> = { ...simulation.parameters, t: time };
  simulation.variables.forEach((variable) => { values[variable.id] = variable.value; values[variable.symbol] = variable.value; });
  const errors: Record<string, string> = {};
  simulation.equations.filter((equation) => equation.enabled).forEach((equation) => { try { values[equation.output] = evaluateSimulationExpression(equation.expression, values); } catch (error) { errors[equation.id] = error instanceof Error ? error.message : 'Invalid expression.'; } });
  return { values, errors };
};
