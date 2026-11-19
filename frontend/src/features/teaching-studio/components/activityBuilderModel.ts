export type ActivityType =
  | 'mcq' | 'tf' | 'ar' | 'numeric' | 'match' | 'sort' | 'order' | 'blanks'
  | 'anagram' | 'flash' | 'wheel' | 'label' | 'sim' | 'crossword' | 'wordsearch'
  | 'hangman' | 'whack' | 'balloon' | 'maze' | 'hotspot';

export type ActivityTemplate = {
  id: ActivityType;
  label: string;
  icon: string;
  group: 'Questions' | 'Thinking' | 'Games' | 'Visual';
  description: string;
  format: string;
  sample: string;
};

export type ActivityScene = {
  id: string;
  label: string;
  subject: 'General Science' | 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology';
};

export type ActivityDocument = {
  schema: 'spectropy.activity.v1';
  version: 1;
  title: string;
  subject: string;
  grade: string;
  chapter: string;
  concept: string;
  track: string;
  bloom: string;
  difficulty: string;
  objective: string;
  activityType: ActivityType;
  content: string;
  scene: string;
  sceneSource: 'built-in' | 'resource' | 'external';
  sceneUrl: string;
  sceneMediaType: 'image' | 'video';
  sceneMediaFit: 'contain' | 'cover';
  sceneResourceName: string;
  sceneResourceId: number | null;
  sceneResourceVersionId: number | null;
  layout: 'split' | 'wide' | 'activity';
  accent: string;
  timer: number;
  points: number;
  negativeMarks: number;
  mode: string;
  teams: string;
  shuffle: boolean;
  instantReveal: boolean;
  ambientAnimation: boolean;
  teacherNotes: string;
  misconceptions: string;
};

export const ACTIVITY_TEMPLATES: readonly ActivityTemplate[] = [
  { id: 'mcq', label: 'Quiz · MCQ', icon: '❓', group: 'Questions', description: 'Single-correct multiple choice.', format: 'Question | correct | wrong 1 | wrong 2 | wrong 3 | explanation', sample: 'A body thrown upward reaches its maximum height. Its acceleration is | g downward | zero | g upward | dependent on mass | Gravity still acts at the top.\nThe SI unit of impulse is | N s | N/s | J s | kg m/s² | Impulse equals change in momentum.' },
  { id: 'tf', label: 'True / False', icon: '⚖️', group: 'Questions', description: 'Fast statement checks.', format: 'Statement | T or F | explanation', sample: 'Acceleration is a vector quantity. | T | It has magnitude and direction.\nSpeed can be negative. | F | Speed is a scalar magnitude.' },
  { id: 'ar', label: 'Assertion – Reason', icon: '🧩', group: 'Thinking', description: 'Reason about linked scientific claims.', format: 'Assertion | Reason | A/B/C/D | explanation', sample: 'Metals conduct electricity. | Metals contain mobile electrons. | A | Mobile electrons carry charge.' },
  { id: 'numeric', label: 'Numerical Value', icon: '🔢', group: 'Questions', description: 'Numeric answer with tolerance.', format: 'Question | answer | tolerance | unit | solution', sample: 'Find the speed for 100 m in 20 s. | 5 | 0.01 | m/s | speed = distance ÷ time' },
  { id: 'match', label: 'Match Up', icon: '🔗', group: 'Thinking', description: 'Match terms with meanings.', format: 'Left item | Right item', sample: 'Velocity | Displacement per unit time\nForce | Mass × acceleration\nPower | Work per unit time' },
  { id: 'sort', label: 'Group Sort', icon: '🗂️', group: 'Thinking', description: 'Sort items into categories.', format: 'Group | item 1, item 2, item 3', sample: 'Scalar | speed, mass, time\nVector | velocity, force, displacement' },
  { id: 'order', label: 'Rank Order', icon: '↕️', group: 'Thinking', description: 'Put steps in the correct order.', format: 'One item per line in correct order', sample: 'Ask a question\nForm a hypothesis\nTest the hypothesis\nAnalyse results\nDraw a conclusion' },
  { id: 'blanks', label: 'Fill in the Blanks', icon: '✏️', group: 'Questions', description: 'Complete missing words.', format: 'Sentence with [answers] in square brackets', sample: 'Force equals [mass] multiplied by [acceleration].\nThe SI unit of force is the [newton].' },
  { id: 'anagram', label: 'Anagram', icon: '🔤', group: 'Games', description: 'Unscramble a term from a clue.', format: 'WORD | clue', sample: 'GRAVITY | Force that attracts masses\nNEUTRON | Neutral particle in a nucleus' },
  { id: 'flash', label: 'Flashcards', icon: '🃏', group: 'Questions', description: 'Front and back recall cards.', format: 'Front | Back', sample: 'Newton’s second law | F = ma\nOhm’s law | V = IR' },
  { id: 'wheel', label: 'Spin the Wheel', icon: '🎡', group: 'Games', description: 'Randomly choose a prompt.', format: 'One segment per line', sample: 'Explain inertia\nGive an example of friction\nDefine momentum\nState Ohm’s law' },
  { id: 'label', label: 'Labelled Diagram', icon: '📍', group: 'Visual', description: 'Place labels on a scene.', format: 'Label | x% | y%', sample: 'Nucleus | 50 | 48\nCell membrane | 82 | 52\nCytoplasm | 65 | 68' },
  { id: 'sim', label: 'Interactive Simulation', icon: '🧪', group: 'Visual', description: 'Prediction and observation activity.', format: 'Prediction question | expected answer', sample: 'How does a larger launch angle change the path? | The height increases until the optimum range angle is passed.' },
  { id: 'crossword', label: 'Crossword', icon: '✚', group: 'Games', description: 'Word-and-clue puzzle.', format: 'WORD | clue', sample: 'ATOM | Smallest unit of an element\nFORCE | A push or pull\nMASS | Amount of matter' },
  { id: 'wordsearch', label: 'Word Search', icon: '🔍', group: 'Games', description: 'Find subject terms.', format: 'WORD | optional hint', sample: 'ENERGY | Ability to do work\nPOWER | Rate of doing work\nFORCE | Push or pull' },
  { id: 'hangman', label: 'Hangman', icon: '🔠', group: 'Games', description: 'Guess a term from a clue.', format: 'WORD | clue', sample: 'PHOTOSYNTHESIS | Plants use light to make food\nMITOCHONDRIA | Powerhouse of the cell' },
  { id: 'whack', label: 'Whack-a-mole', icon: '🔨', group: 'Games', description: 'Hit only correct answers.', format: 'Prompt | correct answers, comma separated | wrong answers, comma separated', sample: 'Hit the vectors | velocity, force, displacement | speed, mass, time' },
  { id: 'balloon', label: 'Balloon Pop', icon: '🎈', group: 'Games', description: 'Pop a matching definition.', format: 'Term | Definition', sample: 'Inertia | Resistance to a change in motion\nMomentum | Mass multiplied by velocity' },
  { id: 'maze', label: 'Maze Chase', icon: '🌀', group: 'Games', description: 'Choose the correct exit.', format: 'Question | correct | wrong 1 | wrong 2 | wrong 3', sample: 'What is the unit of power? | watt | joule | newton | pascal' },
  { id: 'hotspot', label: 'Odd One Out', icon: '🎯', group: 'Thinking', description: 'Find the item that does not belong.', format: 'item 1, item 2, item 3, item 4 | odd item | reason', sample: 'velocity, acceleration, force, mass | mass | The others are vectors.' },
] as const;

export const ACTIVITY_SCENES: readonly ActivityScene[] = [
  { id: 'grid', label: 'Blueprint grid', subject: 'General Science' },
  { id: 'formula', label: 'Floating formulas', subject: 'General Science' },
  { id: 'hex', label: 'Hexagon lattice', subject: 'General Science' },
  { id: 'particles', label: 'Particle network', subject: 'General Science' },
  { id: 'chalk', label: 'Classroom board sketches', subject: 'General Science' },
  { id: 'space', label: 'Deep space & orbits', subject: 'Physics' },
  { id: 'optics', label: 'Optics bench', subject: 'Physics' },
  { id: 'circuit', label: 'Circuit board', subject: 'Physics' },
  { id: 'field', label: 'Magnetic field lines', subject: 'Physics' },
  { id: 'incline', label: 'Inclined plane', subject: 'Physics' },
  { id: 'wavebg', label: 'Wave tank', subject: 'Physics' },
  { id: 'lab', label: 'Chemistry laboratory', subject: 'Chemistry' },
  { id: 'ptable', label: 'Periodic table', subject: 'Chemistry' },
  { id: 'molecule', label: 'Molecular model', subject: 'Chemistry' },
  { id: 'atom', label: 'Bohr atom', subject: 'Chemistry' },
  { id: 'beaker', label: 'Titration setup', subject: 'Chemistry' },
  { id: 'coord', label: 'Coordinate plane', subject: 'Mathematics' },
  { id: 'numline', label: 'Number line', subject: 'Mathematics' },
  { id: 'geo', label: 'Geometry board', subject: 'Mathematics' },
  { id: 'circle', label: 'Unit circle', subject: 'Mathematics' },
  { id: 'prob', label: 'Dice & probability', subject: 'Mathematics' },
  { id: 'cell', label: 'Animal cell', subject: 'Biology' },
  { id: 'plant', label: 'Plant cell', subject: 'Biology' },
  { id: 'dna', label: 'DNA double helix', subject: 'Biology' },
  { id: 'heart', label: 'Human heart', subject: 'Biology' },
  { id: 'eco', label: 'Food chain & ecosystem', subject: 'Biology' },
  { id: 'neuron', label: 'Neuron', subject: 'Biology' },
] as const;

export const activityTemplate = (id: ActivityType) => ACTIVITY_TEMPLATES.find((item) => item.id === id) || ACTIVITY_TEMPLATES[0];

export const createActivityDocument = (type: ActivityType = 'mcq'): ActivityDocument => {
  const template = activityTemplate(type);
  return {
    schema: 'spectropy.activity.v1', version: 1, title: template.label, subject: 'Physics', grade: 'Class 9',
    chapter: '', concept: '', track: 'Foundation', bloom: type === 'ar' || type === 'sort' || type === 'hotspot' ? 'HOT · Analyse' : 'LOT · Understand',
    difficulty: 'Medium', objective: '', activityType: type, content: template.sample, scene: 'grid', sceneSource: 'built-in', sceneUrl: '', sceneMediaType: 'image', sceneMediaFit: 'cover', sceneResourceName: '', sceneResourceId: null, sceneResourceVersionId: null, layout: 'split', accent: '#2563eb',
    timer: 0, points: 4, negativeMarks: 1, mode: 'Whole class (teacher-led)', teams: 'Team A, Team B', shuffle: true,
    instantReveal: false, ambientAnimation: true, teacherNotes: '', misconceptions: '',
  };
};

export const validateActivityDocument = (input: unknown): ActivityDocument => {
  if (!input || typeof input !== 'object') throw new Error('Activity data must be an object.');
  const value = input as Partial<ActivityDocument>;
  if (value.schema !== 'spectropy.activity.v1' || value.version !== 1) throw new Error('Unsupported Activity format.');
  if (!ACTIVITY_TEMPLATES.some((item) => item.id === value.activityType)) throw new Error('Unsupported Activity type.');
  const base = createActivityDocument(value.activityType);
  return {
    ...base, ...value,
    title: String(value.title || base.title).slice(0, 160),
    content: String(value.content || ''),
    scene: ACTIVITY_SCENES.some((scene) => scene.id === value.scene) ? String(value.scene) : base.scene,
    sceneSource: ['built-in', 'resource', 'external'].includes(String(value.sceneSource)) ? value.sceneSource as ActivityDocument['sceneSource'] : base.sceneSource,
    sceneUrl: typeof value.sceneUrl === 'string' ? value.sceneUrl : '',
    sceneMediaType: value.sceneMediaType === 'video' ? 'video' : 'image',
    sceneMediaFit: value.sceneMediaFit === 'contain' ? 'contain' : 'cover',
    sceneResourceName: typeof value.sceneResourceName === 'string' ? value.sceneResourceName.slice(0, 250) : '',
    sceneResourceId: Number.isInteger(value.sceneResourceId) && Number(value.sceneResourceId) > 0 ? Number(value.sceneResourceId) : null,
    sceneResourceVersionId: Number.isInteger(value.sceneResourceVersionId) && Number(value.sceneResourceVersionId) > 0 ? Number(value.sceneResourceVersionId) : null,
    layout: ['split', 'wide', 'activity'].includes(String(value.layout)) ? value.layout as ActivityDocument['layout'] : base.layout,
    accent: typeof value.accent === 'string' && /^#[0-9a-f]{6}$/i.test(value.accent) ? value.accent : base.accent,
    timer: Math.max(0, Number(value.timer) || 0),
    points: Number(value.points) || 0,
    negativeMarks: Math.max(0, Number(value.negativeMarks) || 0),
  } as ActivityDocument;
};
