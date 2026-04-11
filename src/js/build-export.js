'use strict';

import JSZip from 'jszip';
import { S } from './state.js';
import { serialiseDiagram } from './inspector.js';
import { saveActiveObjectChart } from './left-panel.js';

/**
 * Build a runnable ZIP containing:
 *  - index.html (HTML + CSS + JS runtime + project data)
 *  - images/   (referenced image files)
 *  - sounds/   (referenced sound files)
 */
export async function buildAndDownload() {
  saveActiveObjectChart();
  const projectData = serialiseDiagram();
  const zip = new JSZip();

  // ── Collect referenced assets from live objects ────────────────────────────

  const imageRefs = new Set();
  const soundRefs = new Set();

  for (const obj of S.objects) {
    if (!obj.propertyValues) continue;
    const cls = S.classes.find(c => c.id === obj.classId);
    if (cls) {
      for (const prop of cls.properties) {
        const val = obj.propertyValues[prop.name];
        if (!val) continue;
        if (prop.type === 'Image') imageRefs.add(val);
        if (prop.type === 'Sound') soundRefs.add(val);
      }
    }
    // Also scan all propertyValues for any path-like values
    for (const val of Object.values(obj.propertyValues)) {
      if (typeof val !== 'string') continue;
      if (val.startsWith('images/')) imageRefs.add(val);
      if (val.startsWith('audio/'))  soundRefs.add(val);
    }
  }

  // ── Fetch and add asset files ─────────────────────────────────────────────

  for (const imgPath of imageRefs) {
    try {
      const resp = await fetch(imgPath);
      if (resp.ok) {
        const blob = await resp.blob();
        // Store under images/ in the ZIP (strip the source "images/" prefix)
        zip.file('images/' + imgPath.replace(/^images\//, ''), blob);
      }
    } catch { /* skip missing files */ }
  }

  for (const sndPath of soundRefs) {
    try {
      const resp = await fetch(sndPath);
      if (resp.ok) {
        const blob = await resp.blob();
        zip.file('sounds/' + sndPath.replace(/^audio\//, ''), blob);
      }
    } catch { /* skip missing files */ }
  }

  // ── Build path mapping for the standalone runtime ─────────────────────────

  const assetMap = {};
  for (const p of imageRefs) assetMap[p] = 'images/' + p.replace(/^images\//, '');
  for (const p of soundRefs) assetMap[p] = 'sounds/' + p.replace(/^audio\//, '');

  // ── Generate CSS ──────────────────────────────────────────────────────────

  const css = generateCSS();
  zip.file('css/style.css', css);

  // ── Generate index.html ───────────────────────────────────────────────────

  const html = generateHTML(projectData, assetMap);
  zip.file('index.html', html);

  // ── Download ──────────────────────────────────────────────────────────────

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (projectData.objects[0]?.name || 'project') + '.zip';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── HTML generator ──────────────────────────────────────────────────────────

function generateHTML(projectData, assetMap) {
  const dataJson = JSON.stringify(projectData);
  const mapJson = JSON.stringify(assetMap);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escH(projectData.objects[0]?.name || 'StateGen Project')}</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div id="stage"></div>
<script>
'use strict';
const PROJECT = ${dataJson};
const ASSET_MAP = ${mapJson};

// ── Runtime engine (standalone) ─────────────────────────────────────────

let running = false, tickTimer = null, contexts = [], startTime = 0;
const keyState = new Set(), keyUpState = new Set();

function createContext(obj) {
  const cls = PROJECT.classes.find(c => c.id === obj.classId);
  const props = {};
  if (cls) { for (const p of cls.properties) props[p.name] = obj.propertyValues?.[p.name] ?? p.defaultValue ?? ''; }
  return { objId: obj.id, objName: obj.name, classId: obj.classId, className: cls?.name,
           props, currentNodeId: null, nodes: obj.nodes||[], connections: obj.connections||[] };
}

function getOutgoing(ctx, nodeId) { return ctx.connections.filter(c => c.fromId === nodeId); }

function enterState(ctx, nodeId) {
  const node = ctx.nodes.find(n => n.id === nodeId);
  if (!node) return;
  ctx.currentNodeId = nodeId;
  if (node.entryBehaviours) for (const b of node.entryBehaviours) execBehaviour(ctx, b);
}

function exitState(ctx) {
  const node = ctx.nodes.find(n => n.id === ctx.currentNodeId);
  if (node?.exitBehaviours) for (const b of node.exitBehaviours) execBehaviour(ctx, b);
}

function execBehaviour(ctx, b) {
  if (!b || !b.trim()) return;
  b = b.trim();
  if (b === 'move()' && ctx.className === 'Sprite') {
    ctx.props.xPosition = String((parseFloat(ctx.props.xPosition)||0) + (parseFloat(ctx.props.dx)||0));
    ctx.props.yPosition = String((parseFloat(ctx.props.yPosition)||0) + (parseFloat(ctx.props.dy)||0));
    return;
  }
  const assign = b.match(/^(\\w+)\\s*=\\s*(.+)$/);
  if (assign) { ctx.props[assign[1]] = evalExpr(ctx, assign[2].trim()); return; }
}

function evalExpr(ctx, e) {
  if (e === 'true' || e === 'false') return e;
  if (!isNaN(e)) return e;
  if (ctx.props.hasOwnProperty(e)) return ctx.props[e];
  const m = e.match(/^(\\w+)\\s*([+\\-*/])\\s*(.+)$/);
  if (m) { const l = parseFloat(ctx.props[m[1]]??m[1])||0, r = parseFloat(ctx.props[m[3]]??m[3])||0;
    switch(m[2]){case'+':return String(l+r);case'-':return String(l-r);case'*':return String(l*r);case'/':return r?String(l/r):'0';} }
  return e;
}

function evalEvent(conn) {
  if (!conn.event) return true;
  const {type, value} = conn.event;
  if (type==='after') return (Date.now()-startTime)/1000 >= (parseFloat(value)||0);
  if (type==='when') return evalCond(null, value);
  if (type==='keyDown') return keyState.has(value);
  if (type==='keyUp') return keyUpState.has(value);
  return false;
}

function evalCond(ctx, e) {
  if (!e) return true;
  e = e.trim();
  if (e==='true') return true; if (e==='false') return false;
  const m = e.match(/^(\\w+)\\s*(==|!=|>=|<=|>|<)\\s*(.+)$/);
  if (m) { const l=parseFloat(m[1])||0, r=parseFloat(m[3].trim())||0;
    switch(m[2]){case'==':return l===r;case'!=':return l!==r;case'>':return l>r;case'<':return l<r;case'>=':return l>=r;case'<=':return l<=r;} }
  return false;
}

function tick() {
  for (const ctx of contexts) {
    if (!ctx.currentNodeId) continue;
    const node = ctx.nodes.find(n=>n.id===ctx.currentNodeId);
    if (!node || node.type==='terminate') continue;
    if (node.doBehaviours) for (const b of node.doBehaviours) execBehaviour(ctx, b);
    for (const conn of getOutgoing(ctx, ctx.currentNodeId)) {
      if (evalEvent(conn) && (!conn.guardCondition || evalCond(ctx, conn.guardCondition))) {
        if (conn.behaviours) for (const b of conn.behaviours) execBehaviour(ctx, b);
        exitState(ctx);
        enterState(ctx, conn.toId);
        break;
      }
    }
  }
  keyUpState.clear();
  renderSprites();
}

const KEY_MAP = {' ':'SPACE',Escape:'ESCAPE',Enter:'ENTER',Control:'CONTROL',
  Shift:'LEFT_SHIFT',Meta:'WINDOWS_COMMAND',Backspace:'BACKSPACE',Delete:'DELETE',
  ArrowLeft:'ARROW_LEFT',ArrowRight:'ARROW_RIGHT',ArrowUp:'ARROW_UP',ArrowDown:'ARROW_DOWN'};
function normKey(e) { return KEY_MAP[e.key] || (e.key.length===1 ? e.key.toUpperCase() : e.key); }
document.addEventListener('keydown', e => { if(running) keyState.add(normKey(e)); });
document.addEventListener('keyup', e => { if(running){ const k=normKey(e); keyState.delete(k); keyUpState.add(k); }});

function getVBounds() {
  const s = contexts.find(c=>c.className==='Stage');
  if (!s) return {xMin:-100,xMax:100,yMin:0,yMax:100,yFlip:true};
  return {xMin:parseFloat(s.props.xMinVirtual)||-100, xMax:parseFloat(s.props.xMaxVirtual)||100,
    yMin:parseFloat(s.props.yMinVirtual)||0, yMax:parseFloat(s.props.yMaxVirtual)||100,
    yFlip:s.props.minYAtBottomOfScreen!=='false'};
}
function v2s(vx, vy, sw, sh, b) {
  const xR=b.xMax-b.xMin||200, yR=b.yMax-b.yMin||100;
  const sx=(vx-b.xMin)/xR*sw;
  const sy=b.yFlip ? (1-(vy-b.yMin)/yR)*sh : ((vy-b.yMin)/yR)*sh;
  return {x:sx,y:sy};
}

function renderSprites() {
  const stage = document.getElementById('stage');
  stage.innerHTML = '';
  const sw = stage.clientWidth||800, sh = stage.clientHeight||600;
  const b = getVBounds();
  const xR=b.xMax-b.xMin||200, yR=b.yMax-b.yMin||100;
  for (const ctx of contexts) {
    if (ctx.className !== 'Sprite') continue;
    if (ctx.props.visible === 'false') continue;
    const vx = parseFloat(ctx.props.xPosition)||0, vy = parseFloat(ctx.props.yPosition)||0;
    const {x:sx,y:sy} = v2s(vx,vy,sw,sh,b);
    const el = document.createElement('div');
    el.className = 'sprite';
    el.style.left = sx + 'px';
    el.style.top  = sy + 'px';
    const sc = ctx.props.scaleToStage==='true';
    const wV = parseFloat(ctx.props.widthStagePixels)||0;
    const hV = parseFloat(ctx.props.heightStagePixels)||0;
    if (sc && wV) el.style.width = (wV/xR*sw)+'px';
    if (sc && hV) el.style.height = (hV/yR*sh)+'px';
    if (ctx.props.displayImage && ASSET_MAP[ctx.props.displayImage]) {
      const img = document.createElement('img');
      img.src = ASSET_MAP[ctx.props.displayImage];
      if (sc) { img.style.width='100%'; img.style.height='100%'; }
      el.appendChild(img);
    } else if (!sc || (!wV && !hV)) {
      if (!el.style.width) el.style.width = '32px';
      if (!el.style.height) el.style.height = '32px';
      el.style.background = '#3b82f6'; el.style.borderRadius = '4px';
    }
    stage.appendChild(el);
  }
}

// ── Start ───────────────────────────────────────────────────────────────

function start() {
  running = true; startTime = Date.now(); keyState.clear(); keyUpState.clear(); contexts = [];
  const stageEl = document.getElementById('stage');
  const stageCtx = PROJECT.objects.find(o => o.name === 'stage');
  if (stageCtx?.propertyValues?.bgTint) stageEl.style.background = stageCtx.propertyValues.bgTint;
  if (stageCtx?.propertyValues?.bgImage && ASSET_MAP[stageCtx.propertyValues.bgImage]) {
    stageEl.style.backgroundImage = "url('" + ASSET_MAP[stageCtx.propertyValues.bgImage] + "')";
    const fit = stageCtx.propertyValues.bgImageFit || 'FIT_TO_STAGE';
    if (fit==='FIT_WIDTH'){stageEl.style.backgroundSize='100% auto';stageEl.style.backgroundPosition='center top';stageEl.style.backgroundRepeat='no-repeat';}
    else if(fit==='FIT_HEIGHT'){stageEl.style.backgroundSize='auto 100%';stageEl.style.backgroundPosition='center top';stageEl.style.backgroundRepeat='no-repeat';}
    else if(fit==='CENTRE'){stageEl.style.backgroundSize='auto';stageEl.style.backgroundPosition='center center';stageEl.style.backgroundRepeat='no-repeat';}
    else{stageEl.style.backgroundSize='100% 100%';stageEl.style.backgroundPosition='center top';stageEl.style.backgroundRepeat='no-repeat';}
  }

  for (const obj of PROJECT.objects) {
    const ctx = createContext(obj);
    const startNode = ctx.nodes.find(n => n.type === 'start');
    if (startNode) { const conn = getOutgoing(ctx, startNode.id)[0]; if (conn?.toId) enterState(ctx, conn.toId); }
    contexts.push(ctx);
  }
  const gameCtx = contexts.find(c=>c.objName==='game');
  const interval = gameCtx ? (parseFloat(gameCtx.props.tickIntervalSeconds)||0.1) : 0.1;
  tickTimer = setInterval(tick, interval*1000);
  renderSprites();
}

start();
<\/script>
</body>
</html>`;
}

function escH(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── CSS generator ───────────────────────────────────────────────────────────

function generateCSS() {
  return `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #111827; font-family: sans-serif; }
#stage { position: relative; width: 100%; height: 100%; overflow: hidden; }
.sprite { position: absolute; }
.sprite img { display: block; max-width: 64px; max-height: 64px; }
`;
}
