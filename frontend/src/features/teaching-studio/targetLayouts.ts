import type { Layout, ObjectType, Slot } from './layouts';

// LYT-001–014: coordinates and slot roles from Developer Guide v3, section 6.3.
// The guide supplies these wireframes; interactive behavior remains future author/player work.
const content = (id: string, label: string, x: number, y: number, width: number, height: number, allowed: ObjectType[]): Slot =>
  ({ id, label, bounds: { x, y, width, height }, allowed, region: 'content' });
const header: Slot = { id: 'title', label: 'Lesson title', bounds: { x: 90, y: 60, width: 1740, height: 150 }, allowed: ['title'], region: 'header' };
const footer: Slot = { id: 'footer', label: 'Teaching cue', bounds: { x: 90, y: 980, width: 1740, height: 50 }, allowed: ['footer'], region: 'footer' };

type Target = Omit<Layout, 'catalog'>;
const target = ({ slots, ...details }: Target): Layout => ({
  ...details, catalog: 'target', slots: [header, ...slots, footer],
});

export const targetLayouts: Layout[] = [
  target({ id: 'LYT-001', name: 'Hook / observation', purpose: 'Notice a pattern and make a prediction before formal explanation.', compatibility: 'Any introduction; Mathematics, Physics, Chemistry, Biology, Geography.', interaction: 'Show the image, then the focus question; retain the prediction.', evidence: 'Observation and prediction.', productionChecks: 'Relevant visual, alt text, neutral caption.', slots: [
    content('visual', 'Visual / image / diagram', 90, 250, 1080, 680, ['visual']),
    content('prompt', 'Prompt / question', 1200, 250, 630, 310, ['question']),
    content('response', 'Short response', 1200, 590, 630, 340, ['response']),
  ] }),
  target({ id: 'LYT-002', name: 'Objective + prerequisite', purpose: 'Show the learning goal and a prerequisite check.', compatibility: 'All subjects; opening or readiness screen.', interaction: 'Reveal goal, run prerequisite check, then reveal success criterion.', evidence: 'Prerequisite explanation or diagnostic response.', productionChecks: 'Observable goal and relevant prerequisite; private teacher notes.', slots: [
    content('goal', 'Goal / objective', 90, 250, 1030, 280, ['text']),
    content('prerequisite', 'Prerequisite / diagnostic', 1150, 250, 680, 500, ['question']),
    content('success', 'Success evidence', 90, 560, 1030, 370, ['text']),
  ] }),
  target({ id: 'LYT-003', name: 'Model + explanation', purpose: 'Connect a model to short reasoning steps.', compatibility: 'Mathematics concept; Science representation.', interaction: 'Reveal or transform the model with the corresponding explanation.', evidence: 'Explain an invariant quantity or relationship.', productionChecks: 'Units and conditions labelled; mathematics stays editable.', slots: [
    content('model', 'Model / diagram / simulation', 90, 250, 980, 680, ['visual', 'simulation']),
    content('steps', 'Explanation steps', 1100, 250, 730, 430, ['steps', 'text']),
    content('check', 'Evidence question', 1100, 710, 730, 220, ['question']),
  ] }),
  target({ id: 'LYT-004', name: 'Worked example', purpose: 'Show each operation and the reason for it.', compatibility: 'Mathematics; quantitative Physics, Chemistry, Statistics.', interaction: 'Reveal transformations one at a time; answer after justification.', evidence: 'Justified step and independent verification.', productionChecks: 'Preserve signs, units, restrictions and method.', slots: [
    content('working', 'Step-by-step mathematics', 90, 250, 1150, 680, ['steps']),
    content('reason', 'Reason / method / condition', 1270, 250, 560, 380, ['text']),
    content('verify', 'Verification', 1270, 660, 560, 270, ['response']),
  ] }),
  target({ id: 'LYT-005', name: 'Compare representations', purpose: 'Compare two representations under the same conditions.', compatibility: 'Mathematics representations; Science model and evidence.', interaction: 'Reveal A, then B, then their correspondence.', evidence: 'Correspondence and limitation.', productionChecks: 'Matched scales and shared values.', slots: [
    content('representation_a', 'First representation', 90, 250, 850, 510, ['visual', 'graph', 'data']),
    content('representation_b', 'Second representation', 980, 250, 850, 510, ['visual', 'graph', 'data']),
    content('connection', 'Shared relationship', 90, 800, 1740, 130, ['text']),
  ] }),
  target({ id: 'LYT-006', name: 'Predict–explore–explain', purpose: 'Predict, vary a parameter, inspect evidence and explain.', compatibility: 'Interactive Mathematics and Science.', interaction: 'Collect prediction before starting; freeze at the comparison state.', evidence: 'Prediction, observation, explanation and boundary check.', productionChecks: 'Units, reset, reproducible seeds, keyboard controls and static fallback.', slots: [
    content('simulation', 'Interactive simulation', 90, 250, 1140, 680, ['simulation']),
    content('prediction', 'Prediction', 1260, 250, 570, 180, ['response']),
    content('controls', 'Parameters / units', 1260, 460, 570, 210, ['activity']),
    content('evidence', 'Observation + explanation', 1260, 700, 570, 230, ['response']),
  ] }),
  target({ id: 'LYT-007', name: 'Question + evidence', purpose: 'Keep the question, reasoning and options distinct.', compatibility: 'All subjects; formative quiz or reasoning check.', interaction: 'Show stem, collect evidence, enable choices, then show feedback.', evidence: 'Selection with a reason.', productionChecks: 'Secure-test keys stay server-side; keyboard choices and labelled feedback.', slots: [
    content('question', 'Question stem', 90, 250, 1740, 190, ['question']),
    content('evidence', 'Reasoning', 90, 470, 610, 460, ['response']),
    content('options', 'Answer choices', 730, 470, 1100, 460, ['options']),
  ] }),
  target({ id: 'LYT-008', name: 'Independent practice', purpose: 'Provide working space without an early answer reveal.', compatibility: 'Mathematics working; Science explanation and data interpretation.', interaction: 'Show task and conditions; hints on request; solution on later step.', evidence: 'Student working before feedback.', productionChecks: 'Withhold hidden answers; writing, keyboard and paper alternatives.', slots: [
    content('task', 'Practice task', 90, 250, 1740, 160, ['question']),
    content('workspace', 'Student work', 90, 440, 1140, 490, ['workspace', 'response']),
    content('conditions', 'Conditions / hints', 1260, 440, 570, 240, ['text']),
    content('checklist', 'Self-check', 1260, 710, 570, 220, ['text']),
  ] }),
  target({ id: 'LYT-009', name: 'Misconception repair', purpose: 'Identify a broken assumption, repair it and retest.', compatibility: 'All subjects; optional branch.', interaction: 'Show claim, inspect broken step, reveal alternate model, require return check.', evidence: 'Identify error, repair one line, solve a nearby item.', productionChecks: 'Preserve main lesson state and a direct Return control.', slots: [
    content('claim', 'Student claim', 90, 250, 760, 330, ['text']),
    content('repair', 'Alternate model', 890, 250, 940, 680, ['visual']),
    content('return_check', 'Transfer check', 90, 610, 760, 320, ['question']),
  ] }),
  target({ id: 'LYT-010', name: 'Collaborative activity', purpose: 'Show group task, materials, success criterion and evidence.', compatibility: 'All subjects; sorting, matching, discussion or experiment.', interaction: 'Explain task and criteria; let groups act; compare evidence.', evidence: 'Group claim with reasons and individual check.', productionChecks: 'Grouping/time limits, accessible alternatives and reset policy.', slots: [
    content('instructions', 'Task + materials', 90, 250, 500, 680, ['text']),
    content('activity', 'Interaction board', 620, 250, 1210, 450, ['activity']),
    content('evidence', 'Group evidence', 620, 730, 1210, 200, ['response']),
  ] }),
  target({ id: 'LYT-011', name: 'Watch / observe / explain', purpose: 'Use media to answer a defined observation question.', compatibility: 'Science demonstration; contextual Mathematics media.', interaction: 'Show question before manual playback; pause at evidence; debrief.', evidence: 'Timestamped observation and explanation.', productionChecks: 'Captions, reviewed clip, source and fallback; no autoplay.', slots: [
    content('media', 'Video / animation', 90, 250, 1140, 680, ['media']),
    content('focus', 'Watch question', 1260, 250, 570, 220, ['question']),
    content('task', 'Record observations', 1260, 500, 570, 220, ['response']),
    content('debrief', 'Explain / verify', 1260, 750, 570, 180, ['text']),
  ] }),
  target({ id: 'LYT-012', name: 'Data / graph inquiry', purpose: 'Connect observations, graph scales and a claim.', compatibility: 'Statistics; Science and Geography data.', interaction: 'Reveal axes and units, then data, then trend question.', evidence: 'Claim justified with values, units and uncertainty.', productionChecks: 'Exact plotting, source, scale and uncertainty.', slots: [
    content('graph', 'Graph / exact plot', 90, 250, 1080, 680, ['graph']),
    content('data', 'Table / measurements', 1200, 250, 630, 380, ['data']),
    content('claim', 'Claim + evidence', 1200, 660, 630, 270, ['response']),
  ] }),
  target({ id: 'LYT-013', name: 'Reflection / exit evidence', purpose: 'Collect a rule, explanation, doubt and next step.', compatibility: 'All subjects; lesson closure.', interaction: 'Individual thinking before discussion; next steps after evidence review.', evidence: 'Short individual evidence tagged to an objective.', productionChecks: 'Keep personal responses off public projection by default.', slots: [
    content('prompt', 'Reflection questions', 90, 250, 760, 680, ['question']),
    content('response', 'Student responses', 890, 250, 940, 480, ['response']),
    content('next_step', 'Next action', 890, 760, 940, 170, ['text']),
  ] }),
  target({ id: 'LYT-014', name: 'Summary / transfer', purpose: 'Connect the rule, conditions, representations and a fresh application.', compatibility: 'All subjects; consolidation and application.', interaction: 'Build summary from contributions; transfer task; verification last.', evidence: 'Explain method and choose it for a new context.', productionChecks: 'Keep closure focused and preserve core-first progression.', slots: [
    content('map', 'Concept / method map', 90, 250, 1120, 680, ['visual']),
    content('conditions', 'Conditions', 1240, 250, 590, 250, ['text']),
    content('transfer', 'New context', 1240, 530, 590, 400, ['question']),
  ] }),
];
