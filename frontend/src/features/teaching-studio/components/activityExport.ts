import type { ActivityDocument } from './activityBuilderModel.ts';

const safeTitle = (value: string) => value.replace(/[<>&"]/g, '');
const safeInlineScript = (value: string) => value.replace(/<\/script/gi, '<\\/script');
const safeInlineStyles = (value: string) => value.replace(/<\/style/gi, '<\\/style');

export const buildStandaloneActivityHtml = async (activity: ActivityDocument) => {
  const { ACTIVITY_PLAYER_SCRIPT, ACTIVITY_PLAYER_STYLES } = await import('./activityPlayerBundle.generated.ts');
  if (!ACTIVITY_PLAYER_SCRIPT || !ACTIVITY_PLAYER_STYLES) {
    throw new Error('The Activity Player bundle is missing. Run npm run activity-player:generate.');
  }

  const data = JSON.stringify(activity).replace(/</g, '\\u003c');
  const playerScript = safeInlineScript(ACTIVITY_PLAYER_SCRIPT);
  const playerStyles = safeInlineStyles(ACTIVITY_PLAYER_STYLES);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeTitle(activity.title)}</title>
  <style>${playerStyles}</style>
</head>
<body>
  <main id="spectropy-activity-root"></main>
  <script>window.__SPECTROPY_ACTIVITY__=${data};${playerScript}</script>
</body>
</html>`;
};
