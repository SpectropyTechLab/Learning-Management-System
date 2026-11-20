import biologyCatalog from './data/biology.generated.json';
import chemistryCatalog from './data/chemistry.generated.json';
import mathematicsCatalog from './data/mathematics.generated.json';
import physicsCatalog from './data/physics.generated.json';
import type { SimulationSubject, SimulationTemplate } from '../components/simulationStudioModel';

export const GENERATED_SIMULATION_TEMPLATES: readonly SimulationTemplate[] = [
  ...physicsCatalog,
  ...chemistryCatalog,
  ...biologyCatalog,
  ...mathematicsCatalog,
] as SimulationTemplate[];

export const getSimulationById = (id: string) =>
  GENERATED_SIMULATION_TEMPLATES.find((simulation) => simulation.id === id);

export const getSimulationsBySubject = (subject: SimulationSubject) =>
  GENERATED_SIMULATION_TEMPLATES.filter((simulation) => simulation.subject === subject);

export const getSimulationsByCategory = (subject: SimulationSubject, category: string) =>
  getSimulationsBySubject(subject).filter((simulation) => simulation.category === category);

export const getSimulationCategories = (subject: SimulationSubject) => [
  ...new Set(getSimulationsBySubject(subject).map((simulation) => simulation.category || 'Other')),
].sort((left, right) => left.localeCompare(right));

