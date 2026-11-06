export const studioAnimationClass = (effect: string) =>
  ({
    appear: 'studio-animate-appear',
    fade: 'studio-animate-fade',
    'fly-in': 'studio-animate-fly-in',
    wipe: 'studio-animate-wipe',
    zoom: 'studio-animate-zoom',
    bounce: 'studio-animate-bounce',
    pulse: 'studio-animate-pulse',
    spin: 'studio-animate-spin',
    grow: 'studio-animate-grow',
    'fade-out': 'studio-animate-fade-out',
    'fly-out': 'studio-animate-fly-out',
    'zoom-out': 'studio-animate-zoom-out',
  })[effect] || '';
