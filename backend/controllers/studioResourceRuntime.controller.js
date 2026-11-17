import {
  createRuntimeLaunch,
  getRuntimeDownload,
  getObjectPreviewDescriptor,
  getRuntimePreview,
  loadRuntimeAsset,
} from '../services/studioResourceRuntime.service.js';
import { handleServiceError } from '../utils/errors.js';
import { studioCdnOrigins } from '../utils/studioCdnOrigins.js';
import { createHash } from 'node:crypto';

const respond = (action) => async (req, res) => {
  try {
    // Signed URLs are short-lived credentials and must never be reused from a
    // browser, proxy or service-worker cache after their expiry.
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    return res.json({ data: await action(req) });
  } catch (error) {
    return handleServiceError(res, error, 'Studio runtime request failed');
  }
};

export const launchResourceVersion = respond((req) => createRuntimeLaunch({
  versionId: req.params.versionId,
  user: req.user,
}));

export const downloadResourceVersion = respond((req) => getRuntimeDownload({
  versionId: req.params.versionId,
  user: req.user,
}));

export const previewResourceVersion = respond((req) => getRuntimePreview({
  versionId: req.params.versionId,
  user: req.user,
}));

export const previewObjectResourceVersion = respond((req) => getObjectPreviewDescriptor({
  versionId: req.params.versionId,
  user: req.user,
}));

const frameAncestors = () => {
  const configured = String(process.env.STUDIO_RUNTIME_FRAME_ANCESTORS || process.env.CORS_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value));
  const development = process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:5100', 'http://localhost:5173'];
  return ["'self'", ...new Set([...configured, ...development])].join(' ');
};

// Runtime packages intentionally keep an opaque sandbox origin so uploaded HTML
// cannot read LMS cookies or authentication tokens. Some educational simulations
// still probe localStorage during startup, which throws in an opaque origin. This
// small in-memory Storage implementation preserves that common browser contract
// without weakening the iframe with allow-same-origin.
const runtimeStorageBootstrap = `<script data-spectropy-runtime-storage>(function(){
  function memoryStorage(){
    var values=Object.create(null);
    return {
      get length(){return Object.keys(values).length},
      key:function(index){var keys=Object.keys(values);return index>=0&&index<keys.length?keys[index]:null},
      getItem:function(key){key=String(key);return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null},
      setItem:function(key,value){values[String(key)]=String(value)},
      removeItem:function(key){delete values[String(key)]},
      clear:function(){values=Object.create(null)}
    };
  }
  ['localStorage','sessionStorage'].forEach(function(name){
    try{
      var nativeStorage=window[name],probe='__spectropy_storage_probe__';
      nativeStorage.setItem(probe,'1');nativeStorage.removeItem(probe);return;
    }catch(error){}
    try{Object.defineProperty(window,name,{configurable:true,enumerable:true,value:memoryStorage()})}catch(error){}
  });
})();</script>`;

const scormApiBootstrap = (runtime) => {
  if (!runtime || !['1.2', '2004'].includes(runtime.edition)) return '';
  const config = JSON.stringify(runtime).replaceAll('<', '\\u003c');
  return `<script data-spectropy-scorm-api>(function(){
    var config=${config},values=Object.assign({},config.initialData||{}),initialized=false,lastError='0';
    function fail(code,value){lastError=code;return value===undefined?'false':value}
    function initialize(){if(initialized)return fail('103');initialized=true;lastError='0';return 'true'}
    function getValue(name){if(!initialized)return fail('123','');lastError='0';return values[name]||''}
    function setValue(name,value){if(!initialized)return fail('132');values[String(name)]=String(value);lastError='0';return 'true'}
    function commit(event){if(!initialized)return fail('142');parent.postMessage({source:'spectropy-scorm',type:'STUDIO_SCORM_COMMIT',attemptId:config.attemptId,scoIdentifier:config.scoIdentifier,data:Object.assign({},values),event:event||'commit'},'*');lastError='0';return 'true'}
    function finish(event){if(!initialized)return fail('301');commit(event);initialized=false;return 'true'}
    function errorString(code){return code==='0'?'No error':'SCORM runtime error'}
    if(config.edition==='1.2')window.API={LMSInitialize:function(){return initialize()},LMSGetValue:getValue,LMSSetValue:setValue,LMSCommit:function(){return commit('commit')},LMSFinish:function(){return finish(values['cmi.core.exit']==='suspend'?'suspend':'terminate')},LMSGetLastError:function(){return lastError},LMSGetErrorString:errorString,LMSGetDiagnostic:errorString};
    else window.API_1484_11={Initialize:function(){return initialize()},GetValue:getValue,SetValue:setValue,Commit:function(){return commit('commit')},Terminate:function(){return finish(values['cmi.exit']==='suspend'?'suspend':'terminate')},GetLastError:function(){return lastError},GetErrorString:errorString,GetDiagnostic:errorString};
  })();</script>`;
};

const prependRuntimeBootstrap = (html, scormRuntime) => {
  const bootstrap = `${runtimeStorageBootstrap}${scormApiBootstrap(scormRuntime)}`;
  if (/<head(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}${bootstrap}`);
  }
  if (/<html(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(/<html(?:\s[^>]*)?>/i, (root) => `${root}<head>${bootstrap}</head>`);
  }
  return `${bootstrap}${html}`;
};

export const serveRuntimeAsset = async (req, res) => {
  // A sandboxed iframe has an opaque origin. Apply these headers before token
  // validation so error responses are visible instead of being replaced by
  // ERR_BLOCKED_BY_RESPONSE.NotSameOrigin in browser developer tools.
  res.removeHeader('X-Frame-Options');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.headers?.origin === 'null') res.setHeader('Access-Control-Allow-Origin', 'null');
  try {
    const asset = await loadRuntimeAsset({
      launchToken: req.params.launchToken,
      requestedPath: req.params[0],
    });
    const cdnSources = studioCdnOrigins().join(' ');
    // Protect the signed launch document from arbitrary framing. Internal
    // package documents may be framed by the sandboxed launch document, whose
    // browser origin is intentionally opaque and therefore cannot match a
    // frame-ancestors source expression.
    const frameAncestorsDirective = asset.isEntryPoint
      ? `; frame-ancestors ${frameAncestors()}`
      : '';
    res.setHeader(
      'Content-Security-Policy',
      `sandbox allow-scripts allow-popups allow-top-navigation-by-user-activation allow-pointer-lock allow-forms allow-modals allow-downloads allow-presentation; ` +
      `default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${cdnSources}; ` +
      `style-src 'self' 'unsafe-inline' ${cdnSources}; img-src 'self' data: blob: ${cdnSources}; ` +
      `media-src 'self' data: blob: ${cdnSources}; font-src 'self' data: ${cdnSources}; ` +
      `connect-src 'self' ${cdnSources}; frame-src 'self' ${cdnSources}; ` +
      `worker-src 'self' blob: ${cdnSources}; object-src 'none'; ` +
      `base-uri 'none'; form-action 'none'${frameAncestorsDirective}`
    );
    const bridge = `<script data-spectropy-runtime-bridge>(function(){
      var parentWindow=window.parent,dispatching=false;
      function send(type,payload){try{parentWindow.postMessage(Object.assign({source:'spectropy-runtime',type:type},payload||{}),'*')}catch(e){}}
      window.addEventListener('keydown',function(event){
        if(dispatching)return;
        var key=event.key;
        if(['ArrowRight','ArrowLeft','PageDown','PageUp',' ','Enter','Backspace'].indexOf(key)>=0){
          send('STUDIO_CLICKER_INPUT',{key:key,shiftKey:event.shiftKey});
        }
      },true);
      var pointerFrame=0,lastPointer=null;
      window.addEventListener('pointermove',function(event){
        lastPointer={x:Math.max(0,Math.min(1,event.clientX/Math.max(1,window.innerWidth))),y:Math.max(0,Math.min(1,event.clientY/Math.max(1,window.innerHeight)))};
        if(pointerFrame)return;
        pointerFrame=requestAnimationFrame(function(){pointerFrame=0;send('STUDIO_RUNTIME_POINTER',{point:lastPointer})});
      },true);
      window.addEventListener('pointerleave',function(){send('STUDIO_RUNTIME_POINTER',{point:null})},true);
      window.addEventListener('message',function(event){
        var data=event.data||{};
        if(data.source!=='spectropy-player'||data.type!=='STUDIO_RUNTIME_COMMAND')return;
        var direction=data.direction==='previous'?'previous':'next';
        dispatching=true;
        window.dispatchEvent(new CustomEvent('spectropy:'+direction,{detail:data}));
        document.dispatchEvent(new KeyboardEvent('keydown',{key:direction==='next'?'ArrowRight':'ArrowLeft',bubbles:true}));
        dispatching=false;
        setTimeout(function(){
          var candidates=Array.prototype.slice.call(document.querySelectorAll('[data-action="next"],#nextBtn,.next-btn,button[aria-label*="Next" i]'));
          if(direction==='next'&&candidates.length&&candidates.every(function(node){return node.disabled||node.getAttribute('aria-disabled')==='true'||node.hidden;}))send('STUDIO_RUNTIME_COMPLETE');
        },80);
      });
      window.addEventListener('spectropy:complete',function(){send('STUDIO_RUNTIME_COMPLETE')});
      send('STUDIO_RUNTIME_READY',{capabilities:['clicker-forwarding','runtime-command','sandbox-storage-fallback']});
    })();</script>`;
    const html = /^text\/html\b/i.test(asset.mimeType);
    const htmlText = html ? asset.buffer.toString('utf8') : '';
    const bootstrappedHtml = html ? prependRuntimeBootstrap(htmlText, asset.scormRuntime) : '';
    const bridgedHtml = !html ? '' : /<\/body>/i.test(bootstrappedHtml)
      ? bootstrappedHtml.replace(/<\/body>/i, `${bridge}</body>`)
      : /<\/html>/i.test(bootstrappedHtml)
        ? bootstrappedHtml.replace(/<\/html>/i, `${bridge}</html>`)
        : `${bootstrappedHtml}${bridge}`;
    const responseBuffer = html ? Buffer.from(bridgedHtml) : asset.buffer;
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Content-Length', String(responseBuffer.length));
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('ETag', `"${createHash('sha256').update(responseBuffer).digest('hex')}"`);
    return res.status(200).send(responseBuffer);
  } catch (error) {
    return handleServiceError(res, error, 'Unable to serve Studio runtime asset');
  }
};
