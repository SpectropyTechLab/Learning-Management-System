import {
  Activity, Aperture, ArrowDownFromLine, ArrowDownToLine, Axis3d, Badge, Ban, Barcode, Blend, Blinds, Bold, Box,
  ChevronsUp, Circle, CircleDashed, CircleOff, Clock3, Columns2, Contrast, CornerDownRight, Cuboid, Cylinder, Diamond,
  Droplets, Expand, Eye, EyeOff, Feather, FlipHorizontal2, GalleryHorizontalEnd, Ghost, GitBranch, Grid2X2, HeartPulse,
  Hexagon, Highlighter, Infinity as InfinityIcon, LogOut, Minimize, Moon, Move3d, MoveDown, MoveRight, Orbit, Paintbrush,
  PaintBucket, Palette, PanelLeftOpen, PanelRightClose, PanelsTopLeft, PenLine, Plane, RefreshCw, Repeat2, Replace, Rotate3d,
  RotateCw, Route, Rows3, ScanLine, Search, Send, Shrink, Sparkles, Spline, Split, Sun, TimerReset, TrendingUp, Type,
  Underline, Waves, Wind, Zap,
  type LucideIcon,
} from 'lucide-react';
import { STUDIO_ANIMATION_ICON_NAMES } from './studioAnimationCatalog';

const ICONS: Record<string, LucideIcon> = {
  Activity, Aperture, ArrowDownFromLine, ArrowDownToLine, Axis3d, Badge, Ban, Barcode, Blend, Blinds, Bold, Box,
  ChevronsUp, Circle, CircleDashed, CircleOff, Clock3, Columns2, Contrast, CornerDownRight, Cuboid, Cylinder, Diamond,
  Droplets, Expand, Eye, EyeOff, Feather, FlipHorizontal2, GalleryHorizontalEnd, Ghost, GitBranch, Grid2X2, HeartPulse,
  Hexagon, Highlighter, Infinity: InfinityIcon, LogOut, Minimize, Moon, Move3d, MoveDown, MoveRight, Orbit, Paintbrush,
  PaintBucket, Palette, PanelLeftOpen, PanelRightClose, PanelsTopLeft, PenLine, Plane, RefreshCw, Repeat2, Replace, Rotate3d,
  RotateCw, Route, Rows3, ScanLine, Search, Send, Shrink, Sparkles, Spline, Split, Sun, TimerReset, TrendingUp, Type,
  Underline, Waves, Wind, Zap,
};

export default function StudioAnimationIcon({ effect, size = 18, className, styleColour }: { effect: string; size?: number; className?: string; styleColour?: string }) {
  const Icon = ICONS[STUDIO_ANIMATION_ICON_NAMES[effect]] ?? Ban;
  return <Icon size={size} className={className} strokeWidth={1.8} style={styleColour ? { color: styleColour } : undefined}/>;
}
