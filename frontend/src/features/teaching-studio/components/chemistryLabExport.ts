import type { ChemistryLabProject } from './chemistryLabModel';

const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

export const buildChemistryLabHtml = (project: ChemistryLabProject) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${project.title.replace(/[<>&"]/g, '')}</title><style>*{box-sizing:border-box}html,body,iframe{margin:0;width:100%;height:100%;overflow:hidden;border:0;background:#07111f}</style></head>
<body><iframe id="spectropy-lab" title="${project.title.replace(/[<>&"]/g, '')}" allow="fullscreen" sandbox="allow-scripts allow-forms allow-same-origin allow-pointer-lock allow-presentation allow-modals"></iframe>
<script>window.__LAB_PROJECT__=${safeJson(project)};const f=document.getElementById('spectropy-lab');f.src=new URL('${project.authoringProject ? '/studio-labs/chemistry/chemistry-simulation-studio.html?v=chemistry-library-icons-2' : `/studio-labs/chemistry/chemistry-lab.html?embed=1&lab=${encodeURIComponent(project.labId)}`}',document.referrer||window.location.href).href;f.addEventListener('load',()=>{if(window.__LAB_PROJECT__.authoringProject)f.contentWindow.postMessage({spx:'load',proj:window.__LAB_PROJECT__.authoringProject,readOnly:true},new URL(f.src).origin)});</script></body></html>`;
