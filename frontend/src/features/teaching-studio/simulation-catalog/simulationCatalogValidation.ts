import type { SimulationTemplate } from '../components/simulationStudioModel';

export type SimulationCatalogIssue = { simulationId: string; message: string };

export const validateSimulationCatalog = (
  catalog: readonly SimulationTemplate[],
): SimulationCatalogIssue[] => {
  const issues: SimulationCatalogIssue[] = [];
  const ids = new Set<string>();
  catalog.forEach((simulation) => {
    if (ids.has(simulation.id)) issues.push({ simulationId: simulation.id, message: 'Duplicate simulation id.' });
    ids.add(simulation.id);
    if (!simulation.title.trim()) issues.push({ simulationId: simulation.id, message: 'Title is required.' });
    if (!simulation.category?.trim()) issues.push({ simulationId: simulation.id, message: 'Category is required.' });
    if (!simulation.iconKey?.trim()) issues.push({ simulationId: simulation.id, message: 'Icon key is required.' });
    const variableIds = new Set<string>();
    (simulation.variables || []).forEach((variable) => {
      if (variableIds.has(variable.id)) issues.push({ simulationId: simulation.id, message: `Duplicate variable id: ${variable.id}.` });
      variableIds.add(variable.id);
      if (variable.min > variable.max || variable.value < variable.min || variable.value > variable.max || variable.step <= 0) {
        issues.push({ simulationId: simulation.id, message: `Invalid range for variable ${variable.id}.` });
      }
    });
  });
  return issues;
};

