import { createRoot } from 'react-dom/client';
import './activityPlayer.css';
import type { ActivityDocument } from './activityBuilderModel';
import ActivityPlayerFrame from './ActivityPlayerFrame';

declare global {
  interface Window {
    __SPECTROPY_ACTIVITY__?: ActivityDocument;
  }
}

const root = document.getElementById('spectropy-activity-root');
const activity = window.__SPECTROPY_ACTIVITY__;

if (!root || !activity) {
  throw new Error('The exported activity data or player root is missing.');
}

createRoot(root).render(<ActivityPlayerFrame activity={activity} />);
