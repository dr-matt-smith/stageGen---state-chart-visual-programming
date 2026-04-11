'use strict';

import { NODE_DEFAULTS, NODE_MIN_SIZE, ZOOM_STEP } from './config.js';
import { S } from './state.js';
import { canvasContainer, canvasEl, minimapEl, mmVP, btnHandTool, zoomSlider } from './dom-refs.js';
import { applyTransform, zoomAround, clientToWorld, relativeToContainer, fitAll, updateCursor } from './transform.js';
import { refreshMinimap, getMinimapScales, updateMinimapViewport } from './minimap.js';
import { createNode, moveNode, resizeNode, resetNodeSize } from './nodes/node-model.js';
import { activateNode, deactivateNode, selectGroup, clearGroup,
         startSelectionRect, updateSelectionRect, finishSelectionRect, deleteNode } from './nodes/node-selection.js';
import { startEditing, commitEditing } from './nodes/node-editing.js';
import { createConnection } from './connections/conn-model.js';
import { selectConn, deselectConn } from './connections/conn-selection.js';
import { cancelConnEditing } from './connections/conn-editing.js';
import { getBorderPoint } from './connections/geometry.js';
import { renderConnGroup, updateConnection } from './connections/conn-render.js';
import { recalcPairOffsets } from './connections/conn-model.js';
import { updateInspector, showJsonExport, showJsonLoad, showLoadExample, setRenderLeftPanel, setOnJsonLoaded } from './inspector.js';
import { S as _S2, initDefaults } from './state.js';
import { renderLeftPanel, selectObject, deselectObject, enterClassMode, enterObjectMode,
         addObject, addClass, addEnumClass,
         deleteObject, deleteClass, deleteEnumClass, selectClassInPanel, selectEnumInPanel,
         saveActiveObjectChart, setWireNodeEvents } from './left-panel.js';
import { startRuntime, stopRuntime, isRunning, setRuntimeCallbacks, getRuntimeContexts } from './runtime.js';

// ── Toolbar: Fit All ─────────────────────────────────────────────────────────

document.getElementById('btn-fit-all').addEventListener('click', fitAll);

// ── Toolbar: zoom buttons ────────────────────────────────────────────────────

document.getElementById('btn-zoom-in').addEventListener('click', () => {
  const { clientWidth: cw, clientHeight: ch } = canvasContainer;
  zoomAround(S.zoom + ZOOM_STEP, cw / 2, ch / 2);
});

document.getElementById('btn-zoom-out').addEventListener('click', () => {
  const { clientWidth: cw, clientHeight: ch } = canvasContainer;
  zoomAround(S.zoom - ZOOM_STEP, cw / 2, ch / 2);
});

// ── Zoom slider ──────────────────────────────────────────────────────────────

zoomSlider.addEventListener('input', () => {
  const newZoom = parseInt(zoomSlider.value, 10) / 100;
  const { clientWidth: cw, clientHeight: ch } = canvasContainer;
  zoomAround(newZoom, cw / 2, ch / 2);
});

// ── Toolbar: hand tool ───────────────────────────────────────────────────────

btnHandTool.addEventListener('click', () => {
  S.activeTool = S.activeTool === 'hand' ? 'select' : 'hand';
  btnHandTool.classList.toggle('active', S.activeTool === 'hand');
  updateCursor();
});

// ── Toolbar: palette buttons (drag-to-create) ───────────────────────────────

function setupPaletteBtn(btnId, type) {
  const btn = document.getElementById(btnId);
  btn.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    S.creatingNode     = true;
    S.creatingNodeType = type;
    const def = NODE_DEFAULTS[type];
    S.ghostEl = document.createElement('div');
    S.ghostEl.className = `diagram-node ${type}-node node-ghost`;
    S.ghostEl.style.width  = `${def.w}px`;
    S.ghostEl.style.height = `${def.h}px`;
    if (type === 'choice') {
      S.ghostEl.innerHTML =
        '<svg class="choice-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
          '<polygon points="50,2 98,50 50,98 2,50"/>' +
        '</svg>' +
        '<span class="node-label">?</span>';
    } else if (type === 'state') {
      S.ghostEl.innerHTML = `<span class="node-label">State ${S.nextId}</span>`;
    }
    positionGhost(e.clientX, e.clientY);
    document.body.appendChild(S.ghostEl);
  });
  btn.addEventListener('dragstart', (e) => e.preventDefault());
}

setupPaletteBtn('btn-new-state',  'state');
setupPaletteBtn('btn-new-start',  'start');
setupPaletteBtn('btn-new-end',    'end');
setupPaletteBtn('btn-new-choice',     'choice');
setupPaletteBtn('btn-new-terminate', 'terminate');

function positionGhost(clientX, clientY) {
  const def = NODE_DEFAULTS[S.creatingNodeType];
  S.ghostEl.style.left = `${clientX - def.w / 2}px`;
  S.ghostEl.style.top  = `${clientY - def.h / 2}px`;
}

// ── Canvas: scroll-wheel zoom ────────────────────────────────────────────────

canvasContainer.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rel = relativeToContainer(e.clientX, e.clientY);
  const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
  zoomAround(S.zoom + delta, rel.x, rel.y);
}, { passive: false });

// ── Canvas: mousedown (pan / deselect / selection rect) ──────────────────────

canvasContainer.addEventListener('mousedown', (e) => {
  if (S.creatingNode) return;
  if (S.drawingConn)  return;

  const onEmpty = e.button === 0 && !e.target.closest('.conn-group') && !e.target.closest('.diagram-node');

  if (onEmpty) {
    if (S.selectedConn) deselectConn();
    if (S.activeNode) deactivateNode();
    if (S.selectedNodes.length) clearGroup();
  }

  if (e.button === 1) {
    e.preventDefault();
    startPan(e);
  } else if (e.button === 0 && S.activeTool === 'hand') {
    startPan(e);
  } else if (onEmpty && S.activeTool === 'select') {
    e.preventDefault();
    const world = clientToWorld(e.clientX, e.clientY);
    startSelectionRect(world.x, world.y);
  }
});

canvasContainer.addEventListener('auxclick', (e) => {
  if (e.button === 1) e.preventDefault();
});

function startPan(e) {
  S.isPanning = true;
  S.panOrigin = { x: e.clientX, y: e.clientY, panX: S.panX, panY: S.panY };
  canvasContainer.style.cursor = 'grabbing';
  e.preventDefault();
}

// ── Node: mousedown (drag + select) ─────────────────────────────────────────

function onNodeMouseDown(e) {
  if (e.button !== 0) return;
  if (S.activeTool === 'hand') return;
  if (S.creatingNode) return;
  if (S.drawingConn) return;
  if (e.target.classList.contains('resize-handle')) return;

  e.preventDefault();
  e.stopPropagation();

  if (S.editingNode && S.editingNode !== e.currentTarget._node) commitEditing();

  const id   = Number(e.currentTarget.dataset.id);
  const node = S.nodes.find(n => n.id === id);
  if (!node) return;

  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const world = clientToWorld(e.clientX, e.clientY);

  if (S.selectedNodes.length > 0 && S.selectedNodes.includes(node)) {
    S.draggingGroup = {
      offsets: S.selectedNodes.map(n => ({ node: n, ox: world.x - n.x, oy: world.y - n.y })),
    };
    S.didDragNode = false;
    for (const n of S.selectedNodes) n.el.classList.add('dragging');
    return;
  }

  if (S.selectedNodes.length > 0) clearGroup();

  activateNode(node);

  S.draggingNode = { node, offsetX: world.x - node.x, offsetY: world.y - node.y };
  S.didDragNode = false;
  node.el.classList.add('dragging');
}

// ── Node: double-click (edit label) ─────────────────────────────────────────

function onNodeDblClick(e) {
  const id   = Number(e.currentTarget.dataset.id);
  const node = S.nodes.find(n => n.id === id);
  if (!node) return;
  if (node.type !== 'state' && node.type !== 'choice') return;
  e.preventDefault();
  activateNode(node);
  startEditing(node);
}

// ── Context menu (Delete / Duplicate) ───────────────────────────────────────

let ctxMenu = null;

function removeCtxMenu() {
  if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; }
}

function showNodeContextMenu(node, clientX, clientY) {
  removeCtxMenu();

  ctxMenu = document.createElement('div');
  ctxMenu.className = 'node-ctx-menu';
  ctxMenu.style.left = `${clientX}px`;
  ctxMenu.style.top  = `${clientY}px`;

  const deleteBtn = document.createElement('div');
  deleteBtn.className = 'node-ctx-item';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeCtxMenu();
    deleteNode(node);
    updateInspector();
  });

  const dupBtn = document.createElement('div');
  dupBtn.className = 'node-ctx-item';
  dupBtn.textContent = 'Duplicate';
  dupBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeCtxMenu();
    duplicateNode(node);
  });

  ctxMenu.appendChild(deleteBtn);
  ctxMenu.appendChild(dupBtn);
  document.body.appendChild(ctxMenu);

  const close = (ev) => {
    if (ctxMenu && ctxMenu.contains(ev.target)) return;
    removeCtxMenu();
    document.removeEventListener('mousedown', close);
  };
  setTimeout(() => document.addEventListener('mousedown', close), 0);
}

function duplicateNode(srcNode) {
  const offset = 30;
  const newNode = createNodeWithEvents(srcNode.type, srcNode.x + offset, srcNode.y + offset);
  newNode.label = srcNode.label + ' copy';
  const labelEl = newNode.el.querySelector('.node-label');
  if (labelEl) labelEl.textContent = newNode.label;
  activateNode(newNode);
  updateInspector();
}

function onNodeContextMenu(e) {
  e.preventDefault();
  e.stopPropagation();
  const id   = Number(e.currentTarget.dataset.id);
  const node = S.nodes.find(n => n.id === id);
  if (!node) return;
  activateNode(node);
  updateInspector();
  showNodeContextMenu(node, e.clientX, e.clientY);
}

// Wire node events when nodes are created or hydrated
setWireNodeEvents((node) => {
  node.el.addEventListener('mousedown', onNodeMouseDown);
  node.el.addEventListener('dblclick',  onNodeDblClick);
  node.el.addEventListener('contextmenu', onNodeContextMenu);
  const resetBtn = node.el.querySelector('.node-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetNodeSize(node);
    });
  }
});

const _origCreateNode = createNode;

export function createNodeWithEvents(type, worldX, worldY) {
  const node = _origCreateNode(type, worldX, worldY);
  node.el.addEventListener('mousedown', onNodeMouseDown);
  node.el.addEventListener('dblclick',  onNodeDblClick);
  node.el.addEventListener('contextmenu', onNodeContextMenu);

  const resetBtn = node.el.querySelector('.node-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetNodeSize(node);
    });
  }

  return node;
}

// ── Minimap viewport: drag to scroll ────────────────────────────────────────

mmVP.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  S.draggingMinimapVP = true;
  const rect = mmVP.getBoundingClientRect();
  S.mmVPGrabOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
});

// ── Global: mousemove ────────────────────────────────────────────────────────

document.addEventListener('mousemove', (e) => {
  if (S.creatingNode && S.ghostEl) {
    positionGhost(e.clientX, e.clientY);
  }

  if (S.drawingConn) {
    const world = clientToWorld(e.clientX, e.clientY);
    const p1 = getBorderPoint(S.drawingConn.fromNode, world.x, world.y);
    const mx = (p1.x + world.x) / 2;
    const my = (p1.y + world.y) / 2;
    renderConnGroup(S.drawingConn.group, p1, world, mx, my, '', false);
  }

  if (S.isPanning && S.panOrigin) {
    S.panX = S.panOrigin.panX + (e.clientX - S.panOrigin.x);
    S.panY = S.panOrigin.panY + (e.clientY - S.panOrigin.y);
    applyTransform();
  }

  if (S.draggingNode) {
    const world = clientToWorld(e.clientX, e.clientY);
    const newX = world.x - S.draggingNode.offsetX;
    const newY = world.y - S.draggingNode.offsetY;
    if (!S.didDragNode &&
        (Math.abs(newX - S.draggingNode.node.x) > 2 ||
         Math.abs(newY - S.draggingNode.node.y) > 2)) {
      S.didDragNode = true;
    }
    moveNode(S.draggingNode.node, newX, newY);
  }

  if (S.resizingNode) {
    const { node, handle, startWorldX, startWorldY, startX, startY, startW, startH } = S.resizingNode;
    const world = clientToWorld(e.clientX, e.clientY);
    const dx = world.x - startWorldX;
    const dy = world.y - startWorldY;
    const min = NODE_MIN_SIZE[node.type] || { w: 20, h: 20 };
    let newX = startX, newY = startY, newW = startW, newH = startH;
    if (handle.includes('e')) newW = Math.max(min.w, startW + dx);
    if (handle.includes('s')) newH = Math.max(min.h, startH + dy);
    if (handle.includes('w')) { newW = Math.max(min.w, startW - dx); newX = startX + startW - newW; }
    if (handle.includes('n')) { newH = Math.max(min.h, startH - dy); newY = startY + startH - newH; }
    resizeNode(node, newX, newY, newW, newH);
  }

  if (S.selectionRect) {
    const world = clientToWorld(e.clientX, e.clientY);
    updateSelectionRect(world.x, world.y);
  }

  if (S.draggingGroup) {
    const world = clientToWorld(e.clientX, e.clientY);
    for (const { node, ox, oy } of S.draggingGroup.offsets) {
      const newX = world.x - ox;
      const newY = world.y - oy;
      if (!S.didDragNode && (Math.abs(newX - node.x) > 2 || Math.abs(newY - node.y) > 2)) {
        S.didDragNode = true;
      }
      moveNode(node, newX, newY);
    }
  }

  if (S.reconnDrag) {
    const world = clientToWorld(e.clientX, e.clientY);
    const conn = S.reconnDrag.conn;
    if (S.reconnDrag.end === 'from') {
      conn.danglingFrom = { x: world.x, y: world.y };
    } else {
      conn.danglingTo = { x: world.x, y: world.y };
    }
    updateConnection(conn);
  }

  if (S.draggingMinimapVP) {
    const { b, sx, sy } = getMinimapScales();
    const mmRect = minimapEl.getBoundingClientRect();
    let mx = e.clientX - mmRect.left - S.mmVPGrabOffset.x;
    let my = e.clientY - mmRect.top  - S.mmVPGrabOffset.y;
    const vpW = parseFloat(mmVP.style.width)  || 0;
    const vpH = parseFloat(mmVP.style.height) || 0;
    mx = Math.max(0, Math.min(mx, 200 - vpW));
    my = Math.max(0, Math.min(my, 200 - vpH));
    const worldX = mx / sx + b.x;
    const worldY = my / sy + b.y;
    S.panX = -worldX * S.zoom;
    S.panY = -worldY * S.zoom;
    applyTransform();
  }
});

// ── Global: mouseup ──────────────────────────────────────────────────────────

document.addEventListener('mouseup', (e) => {
  if (S.reconnDrag) {
    const world = clientToWorld(e.clientX, e.clientY);
    const conn = S.reconnDrag.conn;
    const target = S.nodes.find(n => {
      if (S.reconnDrag.end === 'from' && conn.toId != null && n.id === conn.toId) return false;
      if (S.reconnDrag.end === 'to' && conn.fromId != null && n.id === conn.fromId) return false;
      if (S.reconnDrag.end === 'to' && n.type === 'start') return false;
      if (S.reconnDrag.end === 'from' && n.type === 'terminate') return false;
      return world.x >= n.x && world.x <= n.x + n.w && world.y >= n.y && world.y <= n.y + n.h;
    });
    if (target) {
      if (S.reconnDrag.end === 'from') { conn.fromId = target.id; conn.danglingFrom = null; }
      else { conn.toId = target.id; conn.danglingTo = null; }
      recalcPairOffsets();
    }
    S.reconnDrag = null;
    updateCursor();
    updateConnection(conn);
  }

  if (S.drawingConn) {
    const world = clientToWorld(e.clientX, e.clientY);
    const target = S.nodes.find(n => {
      if (n.id === S.drawingConn.fromNode.id) return false;
      if (n.type === 'start') return false;
      return world.x >= n.x && world.x <= n.x + n.w && world.y >= n.y && world.y <= n.y + n.h;
    });
    S.drawingConn.group.remove();
    if (target) createConnection(S.drawingConn.fromNode, target);
    S.drawingConn = null;
    updateCursor();
  }

  if (S.creatingNode) {
    if (S.ghostEl) {
      const rect = canvasContainer.getBoundingClientRect();
      const overCanvas = e.clientX >= rect.left && e.clientX <= rect.right &&
                         e.clientY >= rect.top  && e.clientY <= rect.bottom;
      if (overCanvas) {
        const def = NODE_DEFAULTS[S.creatingNodeType];
        const world = clientToWorld(e.clientX, e.clientY);
        createNodeWithEvents(S.creatingNodeType, world.x - def.w / 2, world.y - def.h / 2);
      }
      S.ghostEl.remove();
      S.ghostEl = null;
    }
    S.creatingNode = false;
    S.creatingNodeType = null;
  }

  if (S.isPanning) { S.isPanning = false; S.panOrigin = null; updateCursor(); }
  if (S.draggingNode) { S.draggingNode.node.el.classList.remove('dragging'); S.draggingNode = null; }
  if (S.resizingNode) { S.resizingNode = null; }
  if (S.selectionRect) { const world = clientToWorld(e.clientX, e.clientY); finishSelectionRect(world.x, world.y); }
  if (S.draggingGroup) {
    for (const { node } of S.draggingGroup.offsets) node.el.classList.remove('dragging');
    S.draggingGroup = null;
  }
  if (S.draggingMinimapVP) { S.draggingMinimapVP = false; }
});

// ── Keyboard shortcuts ───────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const { clientWidth: cw, clientHeight: ch } = canvasContainer;
  switch (e.key) {
    case '=': case '+': zoomAround(S.zoom + ZOOM_STEP, cw / 2, ch / 2); break;
    case '-': zoomAround(S.zoom - ZOOM_STEP, cw / 2, ch / 2); break;
    case 'f': case 'F': fitAll(); break;
    case 'h': case 'H': btnHandTool.click(); break;
    case 'Escape':
      if (S.editingConn) { cancelConnEditing(); break; }
      if (S.drawingConn) { S.drawingConn.group.remove(); S.drawingConn = null; updateCursor(); break; }
      if (S.creatingNode && S.ghostEl) { S.ghostEl.remove(); S.ghostEl = null; S.creatingNode = false; S.creatingNodeType = null; break; }
      if (S.selectedNodes.length) { clearGroup(); break; }
      if (S.selectedConn) { deselectConn(); break; }
      if (S.activeNode) { deactivateNode(); break; }
      break;
  }
});

// ── Window resize ────────────────────────────────────────────────────────────

window.addEventListener('resize', updateMinimapViewport);

// ── Minimap minimize / restore ───────────────────────────────────────────────

const minimizeBtn = document.getElementById('minimap-minimize');
const restoreBtn  = document.getElementById('minimap-restore');

minimizeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  minimapEl.style.display = 'none';
  restoreBtn.style.display = 'block';
});

restoreBtn.addEventListener('click', () => {
  restoreBtn.style.display = 'none';
  minimapEl.style.display = '';
  refreshMinimap();
});

// ── Inspector ────────────────────────────────────────────────────────────────

S.onSelectionChange = updateInspector;
document.getElementById('btn-export-json').addEventListener('click', showJsonExport);
document.getElementById('btn-load-json').addEventListener('click', showJsonLoad);

import { exampleFiles } from './asset-manifest.js';
document.getElementById('btn-load-example').addEventListener('click', () => showLoadExample(exampleFiles));

import { buildAndDownload } from './build-export.js';
document.getElementById('btn-build').addEventListener('click', () => {
  buildAndDownload().catch(err => alert('Build failed: ' + err.message));
});

// Handle loaded JSON data
setOnJsonLoaded((data) => {
  // Clear current state
  if (S.activeNode) deactivateNode();
  if (S.selectedConn) deselectConn();

  // Clear canvas DOM
  for (const n of S.nodes) { if (n.el) n.el.remove(); if (n.mmEl) n.mmEl.remove(); }
  for (const c of S.connections) { if (c.group) c.group.remove(); }

  // Reset state
  S.nodes = [];
  S.connections = [];
  S.activeNode = null;
  S.selectedConn = null;
  S.selectedNodes = [];
  S.activeObjectId = null;
  S.selectedLeftPanelItem = null;
  S.objects = [];
  S.classes = [];
  S.enumClasses = [];
  S.nextId = 1;
  S.nextConnId = 1;
  S.nextObjId = 1;
  S.nextClassId = 1;
  S.nextEnumId = 1;

  // Load data
  if (data.enumClasses) {
    for (const e of data.enumClasses) {
      e.id = S.nextEnumId++;
      S.enumClasses.push(e);
    }
  }
  if (data.classes) {
    for (const c of data.classes) {
      c.id = S.nextClassId++;
      S.classes.push(c);
    }
  }
  if (data.objects) {
    for (const o of data.objects) {
      o.id = S.nextObjId++;
      o.nodes = o.nodes || [];
      o.connections = o.connections || [];
      o.nextId = Math.max(1, ...o.nodes.map(n => n.id + 1), 1);
      o.nextConnId = Math.max(1, ...o.connections.map(c => c.id + 1), 1);
      S.objects.push(o);
    }
  }

  // Select first object — this will hydrate its nodes/connections
  if (S.objects.length > 0) {
    // Set activeObjectId to null first so selectObject doesn't skip
    S.activeObjectId = null;
    selectObject(S.objects[0].id);
  } else {
    refreshMinimap();
    applyTransform();
    updateInspector();
    renderLeftPanel();
  }
});

// ── Inspector / Settings tabs ────────────────────────────────────────────────

const inspectorPanel  = document.getElementById('inspector-panel');

// ── Theme toggle ────────────────────────────────────────────────────────────

const themeToggleBtn = document.getElementById('btn-theme-toggle');
let isDark = false;

themeToggleBtn.addEventListener('click', () => {
  isDark = !isDark;
  if (isDark) {
    delete document.documentElement.dataset.theme;
    themeToggleBtn.textContent = '\u263E Dark';
  } else {
    document.documentElement.dataset.theme = 'light';
    themeToggleBtn.textContent = '\u263C Light';
  }
});

// ── Run / Stop ──────────────────────────────────────────────────────────────

const btnRun      = document.getElementById('btn-run');
const runtimeStage = document.getElementById('runtime-stage');

btnRun.addEventListener('click', () => {
  if (isRunning()) {
    stopRuntime();
    return;
  }
  // Save active object chart before running
  saveActiveObjectChart();
  const result = startRuntime();
  if (!result.ok) {
    alert('Cannot run:\n' + result.errors.join('\n'));
    return;
  }
});

setRuntimeCallbacks(
  // onStart
  (contexts) => {
    btnRun.classList.add('running');
    btnRun.querySelector('svg').innerHTML = '<rect x="2" y="2" width="10" height="10" fill="currentColor"/>';
    btnRun.childNodes[btnRun.childNodes.length - 1].textContent = ' Stop';
    runtimeStage.style.display = '';
    // Set stage background from Stage class properties
    const stageCtx = contexts.find(c => c.className === 'Stage');
    if (stageCtx) {
      if (stageCtx.props.bgTint) runtimeStage.style.background = stageCtx.props.bgTint;
      if (stageCtx.props.bgImage) {
        runtimeStage.style.backgroundImage = `url('${stageCtx.props.bgImage}')`;
        runtimeStage.style.backgroundSize = 'cover';
      }
    }
    renderSprites(contexts);
  },
  // onTick
  (contexts) => {
    renderSprites(contexts);
  },
  // onStop
  () => {
    btnRun.classList.remove('running');
    btnRun.querySelector('svg').innerHTML = '<polygon points="2,1 12,7 2,13" fill="currentColor"/>';
    btnRun.childNodes[btnRun.childNodes.length - 1].textContent = ' Run';
    runtimeStage.style.display = 'none';
    runtimeStage.innerHTML = '';
  }
);

/**
 * Map virtual stage coordinates to screen pixels.
 * Uses configurable virtual bounds from stage object.
 * Sprites may exceed these limits (partially or fully off-screen).
 */
function virtualToScreen(vx, vy, stageW, stageH, vBounds) {
  const xMin = vBounds?.xMin ?? -100;
  const xMax = vBounds?.xMax ?? 100;
  const yMin = vBounds?.yMin ?? 0;
  const yMax = vBounds?.yMax ?? 100;
  const yFlip = vBounds?.minYAtBottom !== false; // default true = Y0 at bottom

  const xRange = xMax - xMin || 200;
  const yRange = yMax - yMin || 100;
  const sx = (vx - xMin) / xRange * stageW;
  const sy = yFlip
    ? (1 - (vy - yMin) / yRange) * stageH
    : ((vy - yMin) / yRange) * stageH;
  return { x: sx, y: sy };
}

/** Extract virtual bounds from the stage context. */
function getVirtualBounds(contexts) {
  const stageCtx = contexts.find(c => c.className === 'Stage');
  if (!stageCtx) return null;
  return {
    xMin: parseFloat(stageCtx.props.xMinVirtual) || -100,
    xMax: parseFloat(stageCtx.props.xMaxVirtual) || 100,
    yMin: parseFloat(stageCtx.props.yMinVirtual) || 0,
    yMax: parseFloat(stageCtx.props.yMaxVirtual) || 100,
    minYAtBottom: stageCtx.props.minYAtBottomOfScreen !== 'false',
  };
}

function renderSprites(contexts) {
  runtimeStage.innerHTML = '';
  const stageW = runtimeStage.clientWidth || 800;
  const stageH = runtimeStage.clientHeight || 600;
  const vBounds = getVirtualBounds(contexts);

  for (const ctx of contexts) {
    if (ctx.className !== 'Sprite') continue;
    if (ctx.props.visible === 'false') continue;

    const vx = parseFloat(ctx.props.xPosition) || 0;
    const vy = parseFloat(ctx.props.yPosition) || 0;
    const { x: sx, y: sy } = virtualToScreen(vx, vy, stageW, stageH, vBounds);

    const el = document.createElement('div');
    el.className = 'runtime-sprite';
    el.style.left = `${sx}px`;
    el.style.top  = `${sy}px`;

    // Scale sprite if scaleToStage is true
    const scale = ctx.props.scaleToStage === 'true';
    const wVirt = parseFloat(ctx.props.widthStagePixels) || 0;
    const hVirt = parseFloat(ctx.props.heightStagePixels) || 0;
    const xRange = (vBounds?.xMax ?? 100) - (vBounds?.xMin ?? -100) || 200;
    const yRange = (vBounds?.yMax ?? 100) - (vBounds?.yMin ?? 0) || 100;
    if (scale && wVirt) el.style.width  = `${wVirt / xRange * stageW}px`;
    if (scale && hVirt) el.style.height = `${hVirt / yRange * stageH}px`;

    if (ctx.props.displayImage) {
      const img = document.createElement('img');
      img.src = ctx.props.displayImage;
      img.alt = ctx.objName;
      if (scale) { img.style.width = '100%'; img.style.height = '100%'; }
      el.appendChild(img);
    } else if (!scale || (!wVirt && !hVirt)) {
      if (!el.style.width) el.style.width = '32px';
      if (!el.style.height) el.style.height = '32px';
      el.style.background = '#3b82f6';
      el.style.borderRadius = '4px';
    }

    runtimeStage.appendChild(el);
  }
}

// ── Left panel ──────────────────────────────────────────────────────────────

initDefaults();
setRenderLeftPanel(renderLeftPanel);
renderLeftPanel();

// ── Add-object inline form ──────────────────────────────────────────────────

const addObjForm     = document.getElementById('add-object-form');
const addObjClass    = document.getElementById('add-object-class');
const addObjName     = document.getElementById('add-object-name');
const addObjOk       = document.getElementById('add-object-ok');
const addObjCancel   = document.getElementById('add-object-cancel');

function showAddObjectForm() {
  addObjClass.innerHTML = '';
  for (const cls of S.classes) {
    const opt = document.createElement('option');
    opt.value = cls.id;
    opt.textContent = cls.name;
    addObjClass.appendChild(opt);
  }
  addObjName.value = '';
  addObjForm.style.display = '';
  addObjName.focus();
}

function hideAddObjectForm() {
  addObjForm.style.display = 'none';
}

function commitAddObject() {
  const name = addObjName.value.trim();
  if (!name) return;
  const classId = Number(addObjClass.value);
  addObject(name, classId);
  hideAddObjectForm();
}

document.getElementById('btn-add-object').addEventListener('click', showAddObjectForm);
addObjOk.addEventListener('click', commitAddObject);
addObjCancel.addEventListener('click', hideAddObjectForm);
addObjName.addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') commitAddObject();
  if (e.key === 'Escape') hideAddObjectForm();
});
addObjClass.addEventListener('keydown', (e) => e.stopPropagation());

document.getElementById('btn-add-class').addEventListener('click', () => {
  const name = prompt('Class name:');
  if (!name || !name.trim()) return;
  addClass(name.trim());
});

document.getElementById('btn-add-enum').addEventListener('click', () => {
  const name = prompt('Enum class name:');
  if (!name || !name.trim()) return;
  addEnumClass(name.trim());
});

// "Edit Classes & Enums" button — switch to class/enum editing mode
document.getElementById('btn-edit-classes').addEventListener('click', () => enterClassMode());

// Clicking minimized Classes/Enums header also switches to class mode
document.getElementById('classes-header').addEventListener('click', (e) => {
  if (!document.getElementById('section-classes').classList.contains('minimized')) return;
  e.stopPropagation();
  enterClassMode();
});

document.getElementById('enums-header').addEventListener('click', (e) => {
  if (!document.getElementById('section-enums').classList.contains('minimized')) return;
  e.stopPropagation();
  enterClassMode();
});

// Clicking minimized Objects header switches back to object mode
document.getElementById('objects-header').addEventListener('click', (e) => {
  if (!document.getElementById('section-objects').classList.contains('minimized')) return;
  e.stopPropagation();
  enterObjectMode();
});

// Left divider resize
const dividerLeft = document.getElementById('divider-left');
const leftPanel   = document.getElementById('left-panel');
let draggingLeftDivider = false;

dividerLeft.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  draggingLeftDivider = true;
  dividerLeft.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
});

document.addEventListener('mousemove', (e) => {
  if (!draggingLeftDivider) return;
  const mainRect = document.getElementById('main-area').getBoundingClientRect();
  const panelW = Math.max(140, Math.min(mainRect.width * 0.3, e.clientX - mainRect.left));
  leftPanel.style.width = `${panelW}px`;
});

document.addEventListener('mouseup', () => {
  if (!draggingLeftDivider) return;
  draggingLeftDivider = false;
  dividerLeft.classList.remove('dragging');
  document.body.style.cursor = '';
});

// ── Initialise ───────────────────────────────────────────────────────────────

applyTransform();

// ── Re-exports (facade for tests) ───────────────────────────────────────────

export { S } from './state.js';
export { WORLD_W, WORLD_H, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, NODE_DEFAULTS, NODE_MIN_SIZE, PROPERTY_TYPES } from './config.js';
export { canvasContainer, canvasEl, connSvg, minimapEl } from './dom-refs.js';
export { applyTransform, zoomAround, clientToWorld, relativeToContainer, fitAll } from './transform.js';
export { refreshMinimap, getMinimapBounds, getMinimapScales } from './minimap.js';
export { createNode, moveNode, resizeNode, resetNodeSize } from './nodes/node-model.js';
export { buildNodeElement, fitLabelFontSize } from './nodes/node-element.js';
export { activateNode, deactivateNode, selectGroup, clearGroup, deleteNode } from './nodes/node-selection.js';
export { startEditing, commitEditing, cancelEditing } from './nodes/node-editing.js';
export { createConnection, deleteConnection } from './connections/conn-model.js';
export { updateConnection } from './connections/conn-render.js';
export { selectConn, deselectConn } from './connections/conn-selection.js';
export { getBorderPoint, getPairPerpendicular } from './connections/geometry.js';
export { updateInspector, serialiseDiagram, getSoundMethods, showJsonLoad, showLoadExample } from './inspector.js';
export { imageFiles, audioFiles, exampleFiles } from './asset-manifest.js';
export { initDefaults } from './state.js';
export { renderLeftPanel, selectObject, deselectObject, enterClassMode, enterObjectMode,
         addObject, addClass, addEnumClass,
         deleteObject, deleteClass, deleteEnumClass,
         selectClassInPanel, selectEnumInPanel, saveActiveObjectChart,
         duplicateObject } from './left-panel.js';
export { startRuntime, stopRuntime, isRunning, getRuntimeContexts } from './runtime.js';
export { buildAndDownload } from './build-export.js';
export { virtualToScreen };
