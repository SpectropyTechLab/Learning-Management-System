import type { MotionScene } from './types';
export function mountMotion(el: HTMLElement, config: MotionScene): {draw(p:number):void;orbit(delta:number):void;dispose():void};
