import { Activity, Aperture, ArrowDown, ArrowRight, ArrowUp, Ban, Barcode, Blend, Bold, Circle, CircleDot, CornerDownRight, Expand, Eye, HeartPulse, Infinity as InfinityIcon, LogOut, Minimize, Move, MoveDown, PanelLeft, Palette, Redo2, RotateCcw, RotateCw, Search, Split, Underline, Waves, Zap } from 'lucide-react';

export default function StudioAnimationIcon({ effect, size = 18, className }: { effect: string; size?: number; className?: string }) {
  const props = { size, className, strokeWidth: 1.8 };
  switch (effect) {
    case 'none': return <Ban {...props}/>;
    case 'appear': return <Eye {...props}/>;
    case 'fade': return <Blend {...props}/>;
    case 'fly-in': return <ArrowRight {...props}/>;
    case 'wipe': return <PanelLeft {...props}/>;
    case 'zoom': return <Search {...props}/>;
    case 'float-in': return <ArrowUp {...props}/>;
    case 'split': return <Split {...props}/>;
    case 'wheel': return <Aperture {...props}/>;
    case 'random-bars': return <Barcode {...props}/>;
    case 'grow-turn': return <RotateCw {...props}/>;
    case 'pulse': return <HeartPulse {...props}/>;
    case 'spin': return <RotateCcw {...props}/>;
    case 'grow': return <Expand {...props}/>;
    case 'bounce': return <ArrowDown {...props}/>;
    case 'teeter': return <Activity {...props}/>;
    case 'flash': return <Zap {...props}/>;
    case 'wave': return <Waves {...props}/>;
    case 'color-pulse': return <Palette {...props}/>;
    case 'bold-flash': return <Bold {...props}/>;
    case 'underline': return <Underline {...props}/>;
    case 'fade-out': return <LogOut {...props}/>;
    case 'fly-out': return <ArrowRight {...props}/>;
    case 'zoom-out': return <Minimize {...props}/>;
    case 'wipe-out': return <PanelLeft {...props}/>;
    case 'float-out': return <MoveDown {...props}/>;
    case 'split-out': return <Split {...props}/>;
    case 'disappear': return <CircleDot {...props}/>;
    case 'sink': return <ArrowDown {...props}/>;
    case 'path-line': return <Move {...props}/>;
    case 'path-arc': return <Redo2 {...props}/>;
    case 'path-turn': return <CornerDownRight {...props}/>;
    case 'path-circle': return <Circle {...props}/>;
    case 'path-loop': return <InfinityIcon {...props}/>;
    case 'path-zigzag': return <Zap {...props}/>;
    default: return <Activity {...props}/>;
  }
}
