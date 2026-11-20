import {
  Activity, AirVent, ArrowDownToLine, Atom, BadgePlus, BatteryCharging, Beaker, Binary, Blend, Bone, Box,
  BrainCircuit, ChartNoAxesCombined, CircleDot, CircleGauge, CircleOff, CircuitBoard, CloudRain,
  Coins, Combine, Crosshair, Cylinder, Diff, Divide, Dna, Droplets, Dumbbell, Equal, Expand, Eye,
  FastForward, FlaskConical, Flame, Focus, Footprints, FunctionSquare, Gauge, GitBranch,
  GlassWater, Grid3X3, HeartPulse, Infinity, IterationCcw, Leaf, Lightbulb, Magnet, Maximize2,
  Microscope, Milestone, Minus, Move3d, Navigation, Orbit, Percent, Pi, Plane, Radiation,
  RefreshCcw, Repeat2, Rocket, Route, Ruler, Scale, ScanLine, Send, ShieldPlus, Sigma,
  SlidersHorizontal, Sparkles, Sprout, SquareFunction, TableProperties, Tally5, Telescope,
  TestTubes, Thermometer, Timer, TrendingDown, TrendingUp, Triangle, Variable, Waves, Waypoints,
  Wind, Zap,
  type LucideIcon,
} from 'lucide-react';
import type { SimulationTemplate } from '../components/simulationStudioModel';

export const SIMULATION_LUCIDE_ICONS: Record<string, LucideIcon> = {
  atom: Atom, nucleus: Atom, orbital: Orbit, econfig: Binary, spectrum: Radiation,
  cannon: Send, projectile: Send, rocket: Rocket, pendulum: Timer, spring: Activity,
  wave: Waves, wavebg: Waves, orbitpath: Orbit, planet: Orbit, ball: CircleDot,
  battery: BatteryCharging, resistor: CircuitBoard, circuit: CircuitBoard, charge: Zap,
  magnet: Magnet, coil: Magnet, lens: Focus, mirror: Eye, prism: Focus,
  beaker: Beaker, flask: FlaskConical, molecule: Atom, molecules: Atom, particles: Sparkles,
  element: Atom, ptable: TableProperties, bars: ChartNoAxesCombined, thermometer: Thermometer,
  flame: Flame, phscale: Gauge, burette: TestTubes, solution: Beaker, bridge: GitBranch,
  cell: Microscope, dna: Dna, heart: HeartPulse, plant: Sprout, plantcell: Leaf,
  neuron: BrainCircuit, mitosis: Microscope, enzyme: Activity, punnett: GitBranch,
  population: ChartNoAxesCombined, pyramid: Triangle, translation: Dna, gel: Binary,
  tank: Droplets, piston: Gauge, cube3d: Box, sphere3d: CircleDot,
  fplot: ChartNoAxesCombined, axes: ChartNoAxesCombined, vector: Variable, vector3d: Variable,
  circle: CircleDot, unitcircle: CircleDot, anglemark: Ruler, segment: Ruler, line: Ruler,
  ellipse: Orbit, param: ChartNoAxesCombined, tangent: ChartNoAxesCombined,
  area: ChartNoAxesCombined, point: CircleDot, slopefield: ChartNoAxesCombined,
  lintrans: Variable, cyl3d: Box, sequence: Sigma, dice: Box, dots: Sparkles,
  probability: Sigma,
};

export const simulationLucideIcon = (simulation: Pick<SimulationTemplate, 'title' | 'subject'>): LucideIcon => {
  const title = simulation.title.toLowerCase();
  if (/air drag/.test(title)) return Wind;
  if (/projectile|launch/.test(title)) return Send;
  if (/bounc|collision/.test(title)) return CircleDot;
  if (/inclined|friction/.test(title)) return Triangle;
  if (/atwood/.test(title)) return Scale;
  if (/circular motion|unit circle/.test(title)) return RefreshCcw;
  if (/planetary orbit|newton gravity/.test(title)) return Orbit;
  if (/free fall/.test(title)) return ArrowDownToLine;
  if (/kinetic energy|cart/.test(title)) return FastForward;
  if (/convex lens/.test(title)) return Focus;
  if (/concave mirror/.test(title)) return Eye;
  if (/refraction|snell|tir/.test(title)) return Blend;
  if (/double slit/.test(title)) return Diff;
  if (/prism|dispersion/.test(title)) return Triangle;
  if (/magnetic field|induction|faraday/.test(title)) return Magnet;
  if (/coulomb/.test(title)) return Zap;
  if (/rc circuit|charging/.test(title)) return BatteryCharging;
  if (/ohm|bulb/.test(title)) return Lightbulb;
  if (/torricelli|draining/.test(title)) return GlassWater;
  if (/buoyancy|floating/.test(title)) return CloudRain;
  if (/terminal velocity|stokes/.test(title)) return AirVent;
  if (/hydrostatic pressure/.test(title)) return Gauge;
  if (/ideal gas|gas laws|piston/.test(title)) return Cylinder;
  if (/cooling/.test(title)) return TrendingDown;
  if (/thermal expansion/.test(title)) return Expand;
  if (/heating|calorimetry/.test(title)) return Thermometer;
  if (/spring.mass/.test(title)) return Activity;
  if (/damped|driven oscillator/.test(title)) return SlidersHorizontal;
  if (/pendulum/.test(title)) return Timer;
  if (/travelling wave/.test(title)) return Waves;
  if (/standing wave|harmonic/.test(title)) return Tally5;
  if (/beats|superposition/.test(title)) return Combine;
  if (/photoelectric/.test(title)) return Lightbulb;
  if (/radioactive|decay/.test(title)) return Radiation;
  if (/bohr/.test(title)) return Atom;
  if (/broglie/.test(title)) return Waves;

  if (/electron configuration/.test(title)) return Binary;
  if (/atomic orbital/.test(title)) return Orbit;
  if (/periodic table/.test(title)) return TableProperties;
  if (/trend graph/.test(title)) return TrendingUp;
  if (/moles|molar|avogadro/.test(title)) return Coins;
  if (/vsepr|molecular shape/.test(title)) return Move3d;
  if (/bond polarity|ionic/.test(title)) return Magnet;
  if (/maxwell.boltzmann/.test(title)) return ChartNoAxesCombined;
  if (/van der waals/.test(title)) return Gauge;
  if (/graham.*diffusion/.test(title)) return Wind;
  if (/energy profile|exo|endothermic/.test(title)) return Flame;
  if (/gibbs|spontaneity/.test(title)) return TrendingDown;
  if (/first.order reaction/.test(title)) return Timer;
  if (/rate laws|arrhenius/.test(title)) return CircleGauge;
  if (/a \+ b|reversible reaction/.test(title)) return Repeat2;
  if (/le chatelier/.test(title)) return Scale;
  if (/ice table/.test(title)) return Grid3X3;
  if (/ph scale/.test(title)) return Gauge;
  if (/titration/.test(title)) return TestTubes;
  if (/buffer/.test(title)) return ShieldPlus;
  if (/daniell|nernst/.test(title)) return BatteryCharging;
  if (/electrolysis/.test(title)) return Zap;

  if (/cell structure/.test(title)) return Microscope;
  if (/surface area/.test(title)) return Maximize2;
  if (/mitosis/.test(title)) return IterationCcw;
  if (/enzyme/.test(title)) return Activity;
  if (/osmosis|water potential|plasmolysis/.test(title)) return Droplets;
  if (/monohybrid/.test(title)) return GitBranch;
  if (/dihybrid/.test(title)) return Waypoints;
  if (/hardy.weinberg/.test(title)) return Percent;
  if (/dna double/.test(title)) return Dna;
  if (/translation|codon/.test(title)) return Binary;
  if (/photosynthesis/.test(title)) return Leaf;
  if (/cardiac|heart/.test(title)) return HeartPulse;
  if (/nerve impulse/.test(title)) return BrainCircuit;
  if (/haemoglobin|blood glucose/.test(title)) return BadgePlus;
  if (/population growth/.test(title)) return TrendingUp;
  if (/predator.prey/.test(title)) return Footprints;
  if (/ecological pyramid|energy flow/.test(title)) return Triangle;
  if (/natural selection/.test(title)) return Sprout;
  if (/pcr/.test(title)) return Repeat2;
  if (/gel electrophoresis/.test(title)) return ScanLine;

  if (/straight line/.test(title)) return Ruler;
  if (/quadratic/.test(title)) return SquareFunction;
  if (/cubic polynomial/.test(title)) return FunctionSquare;
  if (/two linear equations/.test(title)) return Crosshair;
  if (/complex numbers/.test(title)) return Plane;
  if (/transformations/.test(title)) return Move3d;
  if (/exponential.*logarithm/.test(title)) return TrendingUp;
  if (/rational function/.test(title)) return Divide;
  if (/modulus/.test(title)) return Activity;
  if (/sine graph|graphs of sin|sin\(bx/.test(title)) return Waves;
  if (/heights.*distances/.test(title)) return Telescope;
  if (/distance.*midpoint/.test(title)) return Milestone;
  if (/circle \(/.test(title)) return CircleDot;
  if (/parabola/.test(title)) return Focus;
  if (/ellipse/.test(title)) return Orbit;
  if (/hyperbola/.test(title)) return Expand;
  if (/derivative/.test(title)) return TrendingUp;
  if (/area under/.test(title)) return ChartNoAxesCombined;
  if (/maxima.*minima/.test(title)) return TrendingDown;
  if (/limit:/.test(title)) return Infinity;
  if (/differential equation/.test(title)) return Diff;
  if (/vector addition/.test(title)) return Navigation;
  if (/dot product/.test(title)) return CircleDot;
  if (/3d vector/.test(title)) return Move3d;
  if (/linear transformation/.test(title)) return Grid3X3;
  if (/mensuration/.test(title)) return Box;
  if (/arithmetic progression/.test(title)) return Sigma;
  if (/geometric progression/.test(title)) return TrendingUp;
  if (/fibonacci/.test(title)) return IterationCcw;
  if (/binomial distribution/.test(title)) return GitBranch;
  if (/normal distribution/.test(title)) return Activity;
  if (/dice/.test(title)) return Box;
  if (/coin toss/.test(title)) return Coins;
  return simulation.subject === 'physics' ? Orbit
    : simulation.subject === 'chemistry' ? FlaskConical
      : simulation.subject === 'biology' ? Microscope : Sigma;
};

const subjectColour: Record<SimulationTemplate['subject'], string> = {
  physics: 'text-blue-600', chemistry: 'text-emerald-600', biology: 'text-rose-600',
  mathematics: 'text-amber-600',
};

const keywordEmoji = (simulation: Pick<SimulationTemplate, 'title' | 'subject'>): string => {
  const title = simulation.title.toLowerCase();
  if (/air drag|terminal velocity|diffusion/.test(title)) return '💨';
  if (/projectile|launch/.test(title)) return '🚀';
  if (/bounc|collision/.test(title)) return '🏀';
  if (/inclined|friction/.test(title)) return '📐';
  if (/atwood|balance|equilibrium/.test(title)) return '⚖️';
  if (/circular|unit circle/.test(title)) return '🔄';
  if (/orbit|planet|gravity/.test(title)) return '🪐';
  if (/free fall/.test(title)) return '🪂';
  if (/kinetic|cart/.test(title)) return '🛒';
  if (/lens|mirror|refraction|snell/.test(title)) return '🔍';
  if (/slit|dispersion|prism/.test(title)) return '🌈';
  if (/magnet|induction|faraday/.test(title)) return '🧲';
  if (/coulomb|charged particle/.test(title)) return '⚡';
  if (/circuit|ohm|resist/.test(title)) return '🔌';
  if (/bulb|photoelectric/.test(title)) return '💡';
  if (/buoy|floating/.test(title)) return '🛟';
  if (/water|tank|hydrostatic|torricelli/.test(title)) return '💧';
  if (/gas|piston/.test(title)) return '🎈';
  if (/cooling|temperature|thermal|heating|calorimetry/.test(title)) return '🌡️';
  if (/spring/.test(title)) return '〰️';
  if (/pendulum|oscillat/.test(title)) return '🕰️';
  if (/wave|harmonic|beat|broglie/.test(title)) return '🌊';
  if (/radioactive|decay/.test(title)) return '☢️';

  if (/bohr|atom/.test(title)) return '⚛️';
  if (/electron configuration/.test(title)) return '🔢';
  if (/orbital/.test(title)) return '🌀';
  if (/periodic table/.test(title)) return '🧱';
  if (/trend graph|energy profile/.test(title)) return '📈';
  if (/moles|molar|avogadro/.test(title)) return '🧮';
  if (/molecular shape|vsepr|bond polarity/.test(title)) return '🧬';
  if (/maxwell.boltzmann|rate law|arrhenius/.test(title)) return '📊';
  if (/gibbs|spontaneity/.test(title)) return '♻️';
  if (/reaction|catalyst/.test(title)) return '🧪';
  if (/le chatelier|reversible/.test(title)) return '↔️';
  if (/ice table/.test(title)) return '📋';
  if (/ph scale|acid|base|buffer/.test(title)) return '🧫';
  if (/titration/.test(title)) return '⚗️';
  if (/daniell|nernst|electrolysis/.test(title)) return '🔋';

  if (/cell structure/.test(title)) return '🔬';
  if (/surface area/.test(title)) return '🧊';
  if (/mitosis/.test(title)) return '🧫';
  if (/enzyme/.test(title)) return '🧩';
  if (/osmosis|plasmolysis|water potential/.test(title)) return '💧';
  if (/monohybrid|dihybrid|punnett/.test(title)) return '🌱';
  if (/hardy.weinberg/.test(title)) return '🧮';
  if (/dna|pcr/.test(title)) return '🧬';
  if (/translation|codon/.test(title)) return '🔤';
  if (/photosynthesis/.test(title)) return '🌿';
  if (/cardiac|heart/.test(title)) return '❤️';
  if (/nerve impulse/.test(title)) return '🧠';
  if (/haemoglobin|blood glucose/.test(title)) return '🩸';
  if (/population growth/.test(title)) return '📈';
  if (/predator.prey/.test(title)) return '🐾';
  if (/ecological pyramid|energy flow/.test(title)) return '🔺';
  if (/natural selection/.test(title)) return '🦋';
  if (/gel electrophoresis/.test(title)) return '🧬';

  if (/straight line|distance|midpoint/.test(title)) return '📏';
  if (/quadratic|parabola/.test(title)) return '〽️';
  if (/cubic|function|derivative|area under|maxima|limit/.test(title)) return '📈';
  if (/linear equations|intersection/.test(title)) return '✖️';
  if (/complex number/.test(title)) return '🧭';
  if (/transformation|matrix/.test(title)) return '🔲';
  if (/modulus/.test(title)) return '📐';
  if (/sin|cos|tan|trigon|heights/.test(title)) return '📐';
  if (/circle|ellipse|hyperbola/.test(title)) return '⭕';
  if (/differential equation/.test(title)) return '∫';
  if (/vector/.test(title)) return '↗️';
  if (/3d|mensuration|solid/.test(title)) return '🧊';
  if (/progression|fibonacci|sequence/.test(title)) return '🔢';
  if (/distribution|probability/.test(title)) return '📊';
  if (/dice/.test(title)) return '🎲';
  if (/coin toss/.test(title)) return '🪙';
  return simulation.subject === 'physics' ? '⚙️'
    : simulation.subject === 'chemistry' ? '🧪'
      : simulation.subject === 'biology' ? '🔬' : '➗';
};

export function SimulationCatalogIcon({ simulation, size = 17 }: {
  simulation: Pick<SimulationTemplate, 'icon' | 'iconKey' | 'title' | 'subject'>;
  size?: number;
}) {
  return (
    <span
      className={`inline-grid place-items-center leading-none ${subjectColour[simulation.subject]}`}
      style={{ width: size, height: size, fontSize: size }}
      aria-hidden="true"
    >
      {keywordEmoji(simulation)}
    </span>
  );
}

