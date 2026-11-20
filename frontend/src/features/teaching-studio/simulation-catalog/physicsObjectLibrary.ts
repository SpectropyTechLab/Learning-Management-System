import catalog from './data/physics.objects.generated.json' with { type: 'json' };

export type PhysicsObjectLibraryEntry = {
  id: string;
  type: string;
  name: string;
  category: string;
  dimension: '2d' | '3d';
  icon: string;
  defaultColor: string;
  defaultTrail: string;
  properties: Record<string, string>;
  iconProperties: Record<string, string | number>;
  editableFields: string[];
};

export const PHYSICS_OBJECT_LIBRARY = catalog as PhysicsObjectLibraryEntry[];
export const PHYSICS_OBJECT_CATEGORIES = [
  'General', 'Mechanics', 'Optics', 'Electromagnetics', 'Fluid Mechanics',
  'Thermal Physics', 'SHM & Waves', 'Modern Physics', 'Annotation', '3D Solids',
] as const;
