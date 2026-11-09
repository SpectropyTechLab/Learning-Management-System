import api from '@/lib/api';

export type StudioTaxonomyType = 'pedagogy' | 'bloom' | 'target_exam';

export interface StudioTaxonomyTerm {
  id: number;
  type: StudioTaxonomyType;
  code: string;
  label: string;
  client_id: number | null;
  is_active: boolean;
  source?: 'manual' | 'session_plan' | 'migration';
}

export interface StudioTaxonomyGroups {
  pedagogy: StudioTaxonomyTerm[];
  bloom: StudioTaxonomyTerm[];
  target_exam: StudioTaxonomyTerm[];
}

export interface StudioScreenTaxonomy {
  explicit: StudioTaxonomyGroups;
  effective: StudioTaxonomyGroups;
}

interface Envelope<T> {
  data: T;
}
const unwrap = <T>(response: { data: Envelope<T> }) => response.data.data;

export const splitTaxonomyValues = (value: string) => [
  ...new Set(
    value
      .split(/\s*,\s*|\s+\/\s+/)
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];

export const taxonomyValueCode = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

export const studioTaxonomyApi = {
  list: async (type?: StudioTaxonomyType) =>
    unwrap<StudioTaxonomyTerm[]>(await api.get('/studio/taxonomy', { params: { type } })),
  create: async (type: StudioTaxonomyType, value: string) =>
    unwrap<StudioTaxonomyTerm>(await api.post('/studio/taxonomy', { type, value })),
  topic: async (topicId: number) =>
    unwrap<StudioTaxonomyGroups>(await api.get(`/studio/topics/${topicId}/taxonomy`)),
  saveTopic: async (topicId: number, groups: StudioTaxonomyGroups) =>
    unwrap<StudioTaxonomyGroups>(
      await api.put(`/studio/topics/${topicId}/taxonomy`, {
        pedagogy_ids: groups.pedagogy.map((term) => term.id),
        bloom_ids: groups.bloom.map((term) => term.id),
        target_exam_ids: groups.target_exam.map((term) => term.id),
      }),
    ),
  screen: async (screenId: number) =>
    unwrap<StudioScreenTaxonomy>(await api.get(`/studio/screens/${screenId}/taxonomy`)),
  saveScreen: async (screenId: number, groups: Pick<StudioTaxonomyGroups, 'pedagogy' | 'bloom'>) =>
    unwrap<StudioScreenTaxonomy>(
      await api.put(`/studio/screens/${screenId}/taxonomy`, {
        pedagogy_ids: groups.pedagogy.map((term) => term.id),
        bloom_ids: groups.bloom.map((term) => term.id),
      }),
    ),
};
