import type { PhysicsLabCatalogEntry } from './physicsLabModel';
import StudioTopicIcon from './StudioTopicIcon';

export const physicsLabIconKey = (entry: Pick<PhysicsLabCatalogEntry, 'id' | 'title' | 'topic' | 'aim' | 'apparatus'>) => {
  const terms = `${entry.id} ${entry.title} ${entry.aim} ${entry.apparatus.join(' ')}`.toLowerCase();
  if (/pendulum/.test(terms)) return 'pendulum';
  if (/spring|hooke|elastic/.test(terms)) return 'spring';
  if (/inclined|friction/.test(terms)) return 'inclined';
  if (/archimedes|buoy|liquid pressure|capillary|viscos/.test(terms)) return 'buoyancy';
  if (/vernier|calliper|screw gauge|measurement|unit|dimension|length|area|volume/.test(terms)) return 'measure';
  if (/resonance|sound|frequency|wave|vibration|sonometer|slinky|doppler|oscilloscope/.test(terms)) return 'sound';
  if (/projectile|throw/.test(terms)) return 'projectile';
  if (/orbit|satellite|kepler|circular|centripetal/.test(terms)) return 'orbit';
  if (/lens|mirror|light|ray|refraction|reflection|prism|shadow|optical|eye|pinhole/.test(terms)) return 'optics';
  if (/magnet|magnetic|induction|generator/.test(terms)) return 'magnet';
  if (/circuit|resist|ohm|diode|current|voltage|charge|capacitor|bulb|electr/.test(terms)) return 'electricity';
  if (/temperature|calor|specific heat|thermal|cooling|expansion|boyle|gas/.test(terms)) return 'heat';
  if (/atom|nuclear|radioactive|electron|particle|photoelectric|mass.energy/.test(terms)) return 'atom';
  if (/angle|triangle|trigonometry|vector|coordinate|calculus|differentiat|integrat|graph|root/.test(terms)) return 'geometry';
  if (/car|motion|velocity|acceleration|distance|momentum|collision|force|energy|power|work|gravity/.test(terms)) return 'projectile';
  return entry.topic === 'sound' ? 'sound'
    : entry.topic === 'light' ? 'optics'
      : entry.topic === 'elec' ? 'electricity'
        : entry.topic === 'mag' ? 'magnet'
          : entry.topic === 'heat' ? 'heat'
            : entry.topic === 'modern' ? 'atom'
              : entry.topic === 'math' || entry.topic === 'meas' ? 'geometry'
                : 'generic';
};

export default function PhysicsLabIcon({ entry, className = '' }: { entry: PhysicsLabCatalogEntry; className?: string }) {
  return <StudioTopicIcon descriptor={entry.icon} iconKey={physicsLabIconKey(entry)} className={className} />;
}
