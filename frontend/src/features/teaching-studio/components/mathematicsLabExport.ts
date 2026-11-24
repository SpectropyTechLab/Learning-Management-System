import type { MathematicsLabProject } from './mathematicsLabModel';

const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
export const buildMathematicsLabHtml = (project: MathematicsLabProject) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>${project.title.replace(/[<>&"]/g, '')}</title><style>*{box-sizing:border-box}html,body,iframe{margin:0;width:100%;height:100%;overflow:hidden;border:0;background:#000}</style></head>
<body><iframe id="spectropy-lab" title="${project.title.replace(/[<>&"]/g, '')}" allow="fullscreen" sandbox="allow-scripts allow-forms allow-same-origin allow-pointer-lock allow-presentation allow-modals"></iframe><script>window.__LAB_PROJECT__=${safeJson(project)};document.getElementById('spectropy-lab').src=new URL('/studio-labs/mathematics/mathematics-lab.html?embed=1&lab=${encodeURIComponent(project.labId)}',document.baseURI).href;</script></body></html>`;
