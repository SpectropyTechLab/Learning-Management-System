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
    case 'wheel': case 'wheel-out': return <Aperture {...props}/>;
    case 'random-bars': return <Barcode {...props}/>;
    case 'grow-turn': case 'shrink-turn': case 'swivel': case 'swivel-out': return <RotateCw {...props}/>;
    case 'shape': case 'shape-out': return <Circle {...props}/>;
    case 'bounce-in': case 'bounce-out': return <ArrowDown {...props}/>;
    case 'pulse': return <HeartPulse {...props}/>;
    case 'spin': return <RotateCcw {...props}/>;
    case 'grow-shrink': return <Expand {...props}/>;
    case 'teeter': return <Activity {...props}/>;
    case 'desaturate': case 'darken': case 'lighten': case 'transparency': return <Blend {...props}/>;
    case 'object-color': case 'complementary-color': case 'line-color': case 'fill-color': case 'brush-color': case 'font-color': return <Palette {...props}/>;
    case 'wave': return <Waves {...props}/>;
    case 'color-pulse': return <Palette {...props}/>;
    case 'bold-flash': case 'bold-reveal': return <Bold {...props}/>;
    case 'underline': return <Underline {...props}/>;
    case 'fade-out': return <LogOut {...props}/>;
    case 'fly-out': return <ArrowRight {...props}/>;
    case 'zoom-out': return <Minimize {...props}/>;
    case 'wipe-out': return <PanelLeft {...props}/>;
    case 'float-out': return <MoveDown {...props}/>;
    case 'split-out': return <Split {...props}/>;
    case 'disappear': return <CircleDot {...props}/>;
    case 'random-bars-out': return <Barcode {...props}/>;
    case 'sink': return <ArrowDown {...props}/>;
    case 'path-line': return <Move {...props}/>;
    case 'path-arc': return <Redo2 {...props}/>;
    case 'path-turn': return <CornerDownRight {...props}/>;
    case 'path-shape': return <Circle {...props}/>;
    case 'path-loop': return <InfinityIcon {...props}/>;
    default: return <Activity {...props}/>;
  }
}
