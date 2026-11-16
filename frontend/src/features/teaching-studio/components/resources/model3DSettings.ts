export type Model3DEnvironment = 'neutral' | 'soft' | 'none';

export interface Model3DHotspot {
  id: string;
  label: string;
  position: string;
  normal: string;
}

export interface Model3DSettings {
  cameraOrbit: string;
  cameraTarget: string;
  fieldOfView: string;
  exposure: number;
  shadowIntensity: number;
  shadowSoftness: number;
  autoRotate: boolean;
  rotationPerSecond: number;
  environment: Model3DEnvironment;
  variant: string;
  animationName: string;
  animationSpeed: number;
  hotspots: Model3DHotspot[];
}

export const DEFAULT_MODEL_3D_SETTINGS: Model3DSettings = {
  cameraOrbit: '',
  cameraTarget: '',
  fieldOfView: '',
  exposure: 1.15,
  shadowIntensity: 0,
  shadowSoftness: 0.85,
  autoRotate: false,
  rotationPerSecond: 18,
  environment: 'neutral',
  variant: '',
  animationName: '',
  animationSpeed: 1,
  hotspots: [],
};

const finiteNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export const model3DSettingsFrom = (content?: Record<string, unknown> | null): Model3DSettings => {
  const raw = content?.model3d;
  const source = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  const environment = ['neutral', 'soft', 'none'].includes(String(source.environment))
    ? source.environment as Model3DEnvironment
    : DEFAULT_MODEL_3D_SETTINGS.environment;
  const hotspots = Array.isArray(source.hotspots)
    ? source.hotspots.flatMap((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
        const candidate = item as Record<string, unknown>;
        if (!candidate.id || !candidate.position || !candidate.normal) return [];
        return [{
          id: String(candidate.id),
          label: String(candidate.label || 'Model label'),
          position: String(candidate.position),
          normal: String(candidate.normal),
        }];
      })
    : [];
  return {
    cameraOrbit: typeof source.cameraOrbit === 'string' ? source.cameraOrbit : '',
    cameraTarget: typeof source.cameraTarget === 'string' ? source.cameraTarget : '',
    fieldOfView: typeof source.fieldOfView === 'string' ? source.fieldOfView : '',
    exposure: finiteNumber(source.exposure, DEFAULT_MODEL_3D_SETTINGS.exposure, 0.25, 2.5),
    shadowIntensity: finiteNumber(source.shadowIntensity, DEFAULT_MODEL_3D_SETTINGS.shadowIntensity, 0, 2),
    shadowSoftness: finiteNumber(source.shadowSoftness, DEFAULT_MODEL_3D_SETTINGS.shadowSoftness, 0, 1),
    autoRotate: source.autoRotate === true,
    rotationPerSecond: finiteNumber(source.rotationPerSecond, DEFAULT_MODEL_3D_SETTINGS.rotationPerSecond, 1, 90),
    environment,
    variant: typeof source.variant === 'string' ? source.variant : '',
    animationName: typeof source.animationName === 'string' ? source.animationName : '',
    animationSpeed: finiteNumber(source.animationSpeed, DEFAULT_MODEL_3D_SETTINGS.animationSpeed, 0.25, 3),
    hotspots,
  };
};

export const standardModel3DView = (view: string) => ({
  front: '0deg 75deg 105%',
  back: '180deg 75deg 105%',
  left: '-90deg 75deg 105%',
  right: '90deg 75deg 105%',
  top: '0deg 0deg 115%',
  isometric: '35deg 65deg 110%',
}[view] || '');
