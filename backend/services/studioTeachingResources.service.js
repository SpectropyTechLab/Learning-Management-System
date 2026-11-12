import { AppError } from '../utils/errors.js';
import { createResource } from './studioResources.service.js';

const PROVIDERS = new Set(['all', 'pubchem', 'rcsb', 'curated']);
const SUBJECTS = new Set(['', 'physics', 'chemistry', 'mathematics', 'biology']);
const ALLOWED_HOSTS = new Set([
  'pubchem.ncbi.nlm.nih.gov',
  'www.rcsb.org',
  'rcsb.org',
  '3d.nih.gov',
  'chemcollective.org',
]);

const CURATED = [
  {
    id: 'chemcollective-virtual-lab', provider: 'curated', provider_label: 'ChemCollective',
    title: 'ChemCollective Virtual Chemistry Laboratory', subject: 'chemistry', resource_kind: 'Virtual laboratory',
    description: 'Interactive aqueous-chemistry laboratory for stoichiometry, acids and bases, equilibrium, solubility, redox and thermochemistry.',
    learning_objective: 'Connect chemical calculations with observable laboratory procedures and measurements.',
    teaching_use: 'Teacher demonstration, guided investigation, pre-lab activity or student evidence task.',
    concepts: ['stoichiometry', 'molarity', 'acid base', 'equilibrium', 'redox', 'thermochemistry'],
    grades: ['9', '10', '11', '12'], exam_tracks: ['Board', 'JEE', 'NEET'], interaction: 'Interactive experiment',
    thumbnail_url: '', source_url: 'https://chemcollective.org/vlab/vlab.php', resource_type: 'external_link',
    licence: 'Free for educators and students; verify the activity terms before redistribution.', importable: true,
  },
  {
    id: 'chemcollective-activities', provider: 'curated', provider_label: 'ChemCollective',
    title: 'ChemCollective Concept Activities', subject: 'chemistry', resource_kind: 'Guided activity collection',
    description: 'Concept-ranked virtual-lab problems and activities for high-school and introductory chemistry.',
    learning_objective: 'Practise quantitative chemistry through scaffolded, concept-specific investigations.',
    teaching_use: 'Use after concept explanation for guided practice, application and assessment evidence.',
    concepts: ['mole concept', 'dilution', 'limiting reagent', 'pH', 'solubility'],
    grades: ['9', '10', '11', '12'], exam_tracks: ['Board', 'JEE', 'NEET'], interaction: 'Guided problem',
    thumbnail_url: '', source_url: 'https://chemcollective.org/activities/type_page/1', resource_type: 'external_link',
    licence: 'Free for educators and students; verify individual activity terms.', importable: true,
  },
  {
    id: 'nih-3d-bioscience', provider: 'curated', provider_label: 'NIH 3D',
    title: 'NIH 3D Bioscience Model Collection', subject: 'biology', resource_kind: 'Scientific 3D model collection',
    description: 'Scientifically focused models of cells, bacteria, viruses, proteins, DNA, anatomy and laboratory equipment.',
    learning_objective: 'Explore spatial biological structure and connect form with function.',
    teaching_use: 'Use during explanation, identification, comparison and student-led observation.',
    concepts: ['cell', 'dna', 'protein', 'virus', 'anatomy', 'biotechnology'],
    grades: ['8', '9', '10', '11', '12'], exam_tracks: ['Board', 'NEET'], interaction: 'Interactive 3D exploration',
    thumbnail_url: '', source_url: 'https://3d.nih.gov/', resource_type: 'external_link',
    licence: 'Licence varies by model; review the selected model before use.', importable: true,
  },
];

const text = (value, fallback = '') => String(value ?? fallback).trim();
const fetchJson = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

const matches = (resource, query) => {
  if (!query) return true;
  const haystack = [resource.title, resource.description, resource.learning_objective, ...(resource.concepts || [])].join(' ').toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
};

const pubChemSearch = async (query) => {
  if (!query) return [];
  const encoded = encodeURIComponent(query);
  const payload = await fetchJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/property/Title,MolecularFormula,MolecularWeight,IUPACName/JSON`);
  return (payload.PropertyTable?.Properties || []).slice(0, 12).map((compound) => ({
    id: `pubchem-${compound.CID}`, provider: 'pubchem', provider_label: 'PubChem',
    title: compound.Title || compound.IUPACName || `PubChem compound ${compound.CID}`,
    subject: 'chemistry', resource_kind: 'Molecular structure',
    description: [compound.MolecularFormula, compound.MolecularWeight ? `Molecular weight: ${compound.MolecularWeight}` : ''].filter(Boolean).join(' · '),
    learning_objective: 'Relate molecular composition and structure to chemical properties and reactions.',
    teaching_use: 'Use as a molecular visual during explanation, comparison or worked examples.',
    concepts: [query, 'molecular structure', 'chemical formula'], grades: ['9', '10', '11', '12'],
    exam_tracks: ['Board', 'JEE', 'NEET'], interaction: 'Scientific structure visual',
    thumbnail_url: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compound.CID}/PNG?image_size=500x500`,
    source_url: `https://pubchem.ncbi.nlm.nih.gov/compound/${compound.CID}`, resource_type: 'image',
    licence: 'PubChem/NCBI data usage policies apply.', importable: true,
  }));
};

const rcsbSearch = async (query) => {
  if (!query) return [];
  const payload = await fetchJson('https://search.rcsb.org/rcsbsearch/v2/query', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: { type: 'terminal', service: 'full_text', parameters: { value: query } },
      return_type: 'entry', request_options: { paginate: { start: 0, rows: 12 } },
    }),
  });
  return (payload.result_set || []).map((row) => ({
    id: `rcsb-${row.identifier}`, provider: 'rcsb', provider_label: 'RCSB Protein Data Bank',
    title: `${row.identifier}: ${query}`, subject: 'biology', resource_kind: 'Interactive biomolecular structure',
    description: 'Experimentally determined or computed biomolecular structure available in the RCSB Mol* viewer.',
    learning_objective: 'Connect three-dimensional biomolecular structure with biological function.',
    teaching_use: 'Use for protein, DNA, enzyme, ligand and biotechnology explanations.',
    concepts: [query, 'protein structure', 'biomolecule'], grades: ['10', '11', '12'],
    exam_tracks: ['Board', 'NEET'], interaction: 'Interactive 3D scientific viewer', thumbnail_url: '',
    source_url: `https://www.rcsb.org/structure/${encodeURIComponent(row.identifier)}`,
    resource_type: 'external_link', licence: 'RCSB PDB data and usage policies apply.', importable: true,
  }));
};

export const searchTeachingResources = async ({ query = {}, user }) => {
  if (!['super_admin', 'content_authorizer'].includes(user?.role)) throw new AppError('Access denied', 403);
  const search = text(query.q).slice(0, 100);
  const provider = text(query.provider, 'all').toLowerCase();
  const subject = text(query.subject).toLowerCase();
  if (!PROVIDERS.has(provider)) throw new AppError('Unsupported teaching-resource provider');
  if (!SUBJECTS.has(subject)) throw new AppError('Unsupported subject');

  const tasks = [];
  if ((provider === 'all' || provider === 'pubchem') && (!subject || subject === 'chemistry')) tasks.push(['pubchem', pubChemSearch(search)]);
  if ((provider === 'all' || provider === 'rcsb') && (!subject || subject === 'biology')) tasks.push(['rcsb', rcsbSearch(search)]);
  const settled = await Promise.allSettled(tasks.map(([, promise]) => promise));
  const live = settled.flatMap((entry) => entry.status === 'fulfilled' ? entry.value : []);
  const curated = provider === 'all' || provider === 'curated'
    ? CURATED.filter((item) => (!subject || item.subject === subject) && matches(item, search))
    : [];
  return {
    query: search,
    results: [...curated, ...live],
    unavailable_providers: tasks.filter((_, index) => settled[index].status === 'rejected').map(([name]) => name),
  };
};

export const importTeachingResource = async ({ body = {}, user }) => {
  const sourceUrl = text(body.source_url);
  let parsed;
  try { parsed = new URL(sourceUrl); } catch { throw new AppError('Invalid teaching resource URL'); }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new AppError('Only approved teaching-resource providers can be imported', 400);
  }
  const resourceType = body.resource_type === 'image' ? 'image' : 'external_link';
  const assetUrl = resourceType === 'image' ? text(body.thumbnail_url) : sourceUrl;
  return createResource({
    user,
    body: {
      name: text(body.title, 'Teaching resource').slice(0, 250),
      description: text(body.description).slice(0, 2000),
      resource_type: resourceType,
      external_url: assetUrl,
      metadata_json: JSON.stringify({
        teaching_resource: {
          provider: text(body.provider_label || body.provider), source_url: sourceUrl,
          subject: text(body.subject), resource_kind: text(body.resource_kind),
          learning_objective: text(body.learning_objective), teaching_use: text(body.teaching_use),
          concepts: Array.isArray(body.concepts) ? body.concepts : [],
          grades: Array.isArray(body.grades) ? body.grades : [],
          exam_tracks: Array.isArray(body.exam_tracks) ? body.exam_tracks : [],
          licence: text(body.licence), imported_at: new Date().toISOString(),
        },
      }),
    },
  });
};
