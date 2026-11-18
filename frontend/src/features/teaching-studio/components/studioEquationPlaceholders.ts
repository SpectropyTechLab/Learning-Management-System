const MATHLIVE_PLACEHOLDER = /\\placeholder(?:\[[^\]]*\])?\{[^{}]*\}/g;

export const stripEquationEditingPlaceholders = (latex: string) =>
  latex.replace(MATHLIVE_PLACEHOLDER, '');
