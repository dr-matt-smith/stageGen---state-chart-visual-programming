'use strict';

import { S } from './state.js';
import { PROPERTY_TYPES } from './config.js';
import { imageFiles, audioFiles } from './asset-manifest.js';
import { getSoundMethods } from './inspector.js';
import { canvasEl, connSvg, mmStatesEl } from './dom-refs.js';
import { buildNodeElement, fitLabelFontSize } from './nodes/node-element.js';
import { positionMinimapNode } from './minimap.js';
import { makeConnGroup, updateConnection } from './connections/conn-render.js';
import { selectConn as selectConnFn } from './connections/conn-selection.js';
import { startConnEditing } from './connections/conn-editing.js';
import { deleteConnection } from './connections/conn-model.js';
import { recalcPairOffsets } from './connections/conn-model.js';
import { refreshMinimap } from './minimap.js';
import { applyTransform } from './transform.js';
import { updateInspector } from './inspector.js';
import { deactivateNode, clearGroup } from './nodes/node-selection.js';
import { deselectConn } from './connections/conn-selection.js';

// ── DOM refs ────────────────────────────────────────────────────────────────

const objectsList      = document.getElementById('objects-list');
const classesList      = document.getElementById('classes-list');
const enumsList        = document.getElementById('enums-list');
const sectionObjects   = document.getElementById('section-objects');
const sectionObjProps  = document.getElementById('section-object-props');
const objectPropsList  = document.getElementById('object-props-list');
const objectPropsTitle = document.getElementById('object-props-title');
const sectionClasses   = document.getElementById('section-classes');
const sectionEnums     = document.getElementById('section-enums');
const classesHeader    = document.getElementById('classes-header');
const enumsHeader      = document.getElementById('enums-header');
const canvasNoObject   = document.getElementById('canvas-no-object');
const btnEditClasses   = document.getElementById('btn-edit-classes');

// Callback for wiring node events (set by main.js)
let _wireNodeEvents = null;
export function setWireNodeEvents(fn) { _wireNodeEvents = fn; }

// ── Render ──────────────────────────────────────────────────────────────────

export function renderLeftPanel() {
  const inObjectMode = S.activeObjectId != null;

  // ── Object mode: objects + props expanded, classes/enums minimized ──
  // ── Class mode:  objects minimized, classes/enums expanded ──────────

  sectionObjProps.style.display = 'none'; // V60: object props now in Inspector

  if (inObjectMode) {
    sectionObjects.classList.remove('minimized');
    sectionClasses.classList.add('minimized');
    sectionEnums.classList.add('minimized');
    btnEditClasses.style.display = '';
  } else {
    sectionObjects.classList.add('minimized');
    sectionClasses.classList.remove('minimized');
    sectionEnums.classList.remove('minimized');
    btnEditClasses.style.display = 'none';
  }

  renderObjectsList();
  renderClassesList();
  renderEnumsList();

  // Canvas no-object overlay — hide when any class chart is displayed
  const hasChart = S.activeClassId != null;
  if (canvasNoObject) {
    canvasNoObject.style.display = hasChart ? 'none' : '';
  }

  // Toggle state toolbar enabled/disabled (only enabled when editing a class)
  const stateToolbar = document.getElementById('state-toolbar');
  if (stateToolbar) {
    if (S.editingClassChart) {
      stateToolbar.classList.remove('disabled');
    } else {
      stateToolbar.classList.add('disabled');
    }
  }
}

function renderObjectsList() {
  objectsList.innerHTML = '';
  for (const obj of S.objects) {
    const cls = S.classes.find(c => c.id === obj.classId);
    const item = document.createElement('div');
    item.className = 'left-panel-item';
    if (obj.id === S.activeObjectId) item.classList.add('active');
    item.dataset.id = obj.id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'left-panel-item-name';
    nameSpan.textContent = obj.name;
    item.appendChild(nameSpan);

    if (cls) {
      const classSpan = document.createElement('span');
      classSpan.className = 'left-panel-item-class';
      classSpan.textContent = cls.name;
      item.appendChild(classSpan);
    }

    item.addEventListener('click', () => selectObject(obj.id));
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showObjectContextMenu(obj, e.clientX, e.clientY);
    });
    objectsList.appendChild(item);
  }
}

function renderClassesList() {
  classesList.innerHTML = '';
  for (const cls of S.classes) {
    const item = document.createElement('div');
    item.className = 'left-panel-item';
    if (S.selectedLeftPanelItem &&
        S.selectedLeftPanelItem.kind === 'class' &&
        S.selectedLeftPanelItem.id === cls.id) {
      item.classList.add('active');
    }
    item.dataset.id = cls.id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'left-panel-item-name';
    nameSpan.textContent = cls.name;
    item.appendChild(nameSpan);

    if (!cls.builtIn) {
      const delBtn = document.createElement('button');
      delBtn.className = 'left-panel-delete-btn';
      delBtn.title = 'Delete class';
      delBtn.textContent = '\u00d7';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteClass(cls.id);
      });
      item.appendChild(delBtn);
    }

    item.addEventListener('click', () => selectClassInPanel(cls.id));
    classesList.appendChild(item);
  }
}

function renderEnumsList() {
  enumsList.innerHTML = '';
  for (const en of S.enumClasses) {
    const item = document.createElement('div');
    item.className = 'left-panel-item';
    if (S.selectedLeftPanelItem &&
        S.selectedLeftPanelItem.kind === 'enum' &&
        S.selectedLeftPanelItem.id === en.id) {
      item.classList.add('active');
    }
    item.dataset.id = en.id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'left-panel-item-name';
    nameSpan.textContent = en.name;
    item.appendChild(nameSpan);

    if (!en.builtIn) {
      const delBtn = document.createElement('button');
      delBtn.className = 'left-panel-delete-btn';
      delBtn.title = 'Delete enum class';
      delBtn.textContent = '\u00d7';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteEnumClass(en.id);
      });
      item.appendChild(delBtn);
    }

    item.addEventListener('click', () => selectEnumInPanel(en.id));
    enumsList.appendChild(item);
  }
}

// ── Object context menu ─────────────────────────────────────────────────────

let objCtxMenu = null;

function removeObjCtxMenu() {
  if (objCtxMenu) { objCtxMenu.remove(); objCtxMenu = null; }
}

function showObjectContextMenu(obj, clientX, clientY) {
  removeObjCtxMenu();

  objCtxMenu = document.createElement('div');
  objCtxMenu.className = 'object-ctx-menu';
  objCtxMenu.style.left = `${clientX}px`;
  objCtxMenu.style.top  = `${clientY}px`;

  // Duplicate
  const dupBtn = document.createElement('div');
  dupBtn.className = 'object-ctx-item';
  dupBtn.textContent = 'Duplicate';
  dupBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeObjCtxMenu();
    duplicateObject(obj);
  });
  objCtxMenu.appendChild(dupBtn);

  // Delete (only for non-built-in)
  if (!obj.builtIn) {
    const delBtn = document.createElement('div');
    delBtn.className = 'object-ctx-item object-ctx-delete';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeObjCtxMenu();
      if (!confirm(`Delete object "${obj.name}"?`)) return;
      deleteObject(obj.id);
    });
    objCtxMenu.appendChild(delBtn);
  }

  document.body.appendChild(objCtxMenu);

  const close = (ev) => {
    if (objCtxMenu && objCtxMenu.contains(ev.target)) return;
    removeObjCtxMenu();
    document.removeEventListener('mousedown', close);
  };
  setTimeout(() => document.addEventListener('mousedown', close), 0);
}

export function duplicateObject(srcObj) {
  const newObj = addObject(srcObj.name + ' copy', srcObj.classId);
  // Copy property values
  if (srcObj.propertyValues) {
    newObj.propertyValues = { ...srcObj.propertyValues };
  }
  renderLeftPanel();
  return newObj;
}

// ── Object properties in data panel ─────────────────────────────────────────

function renderObjectProperties() {
  const obj = S.objects.find(o => o.id === S.activeObjectId);
  if (!obj) { objectPropsList.innerHTML = ''; return; }

  const cls = S.classes.find(c => c.id === obj.classId);
  objectPropsTitle.textContent = cls ? `${obj.name} (${cls.name})` : obj.name;

  objectPropsList.innerHTML = '';

  if (!cls || cls.properties.length === 0) {
    const emptyRow = document.createElement('div');
    emptyRow.className = 'object-prop-row';
    emptyRow.style.color = 'var(--text-dim)';
    emptyRow.style.fontStyle = 'italic';
    emptyRow.textContent = 'No properties';
    objectPropsList.appendChild(emptyRow);
    return;
  }

  // Initialise property values store on the object if not present
  if (!obj.propertyValues) obj.propertyValues = {};

  for (const prop of cls.properties) {
    const row = document.createElement('div');
    row.className = 'object-prop-row';

    const label = document.createElement('span');
    label.className = 'object-prop-label';
    label.textContent = prop.name;
    row.appendChild(label);

    const valueDiv = document.createElement('div');
    valueDiv.className = 'object-prop-value';

    if (prop.type === 'Boolean') {
      const sel = document.createElement('select');
      sel.innerHTML = '<option value="false">false</option><option value="true">true</option>';
      sel.value = obj.propertyValues[prop.name] === 'true' ? 'true' : 'false';
      sel.addEventListener('change', () => { obj.propertyValues[prop.name] = sel.value; });
      sel.addEventListener('keydown', (e) => e.stopPropagation());
      valueDiv.appendChild(sel);
    } else if (prop.type === 'EnumClass') {
      const en = S.enumClasses.find(e => e.id === prop.enumClassId);
      const sel = document.createElement('select');
      if (en) {
        for (const v of en.values) {
          const opt = document.createElement('option');
          opt.value = v;
          opt.textContent = v;
          if (obj.propertyValues[prop.name] === v) opt.selected = true;
          sel.appendChild(opt);
        }
      }
      sel.addEventListener('change', () => { obj.propertyValues[prop.name] = sel.value; });
      sel.addEventListener('keydown', (e) => e.stopPropagation());
      valueDiv.appendChild(sel);
    } else if (prop.type === 'Image' || prop.type === 'Sound') {
      const files = prop.type === 'Image' ? imageFiles : audioFiles;
      const sel = document.createElement('select');
      sel.className = 'asset-dropdown';
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = `-- select ${prop.type.toLowerCase()} --`;
      sel.appendChild(emptyOpt);
      for (const f of files) {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f;
        if (obj.propertyValues[prop.name] === f) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => { obj.propertyValues[prop.name] = sel.value; });
      sel.addEventListener('keydown', (e) => e.stopPropagation());
      valueDiv.appendChild(sel);
    } else {
      const input = document.createElement('input');
      input.type = (prop.type === 'Integer' || prop.type === 'Real') ? 'number' : 'text';
      input.value = obj.propertyValues[prop.name] || '';
      input.placeholder = prop.type;
      input.addEventListener('input', () => { obj.propertyValues[prop.name] = input.value; });
      input.addEventListener('keydown', (e) => e.stopPropagation());
      valueDiv.appendChild(input);
    }

    row.appendChild(valueDiv);
    objectPropsList.appendChild(row);
  }

  // All methods: explicit + auto-generated sound methods
  const explicit = (cls.methods || []).map(m => ({ signature: m.signature }));
  const sound = getSoundMethods(cls);
  const allMethods = [...explicit, ...sound];
  if (allMethods.length > 0) {
    const methodHeader = document.createElement('div');
    methodHeader.className = 'object-prop-row';
    methodHeader.style.fontWeight = '600';
    methodHeader.style.color = 'var(--text-muted)';
    methodHeader.style.fontSize = '10px';
    methodHeader.style.textTransform = 'uppercase';
    methodHeader.style.letterSpacing = '0.04em';
    methodHeader.style.paddingTop = '8px';
    methodHeader.textContent = 'Methods';
    objectPropsList.appendChild(methodHeader);

    for (const m of allMethods) {
      const mRow = document.createElement('div');
      mRow.className = 'object-prop-row sound-method-item';
      mRow.innerHTML = `<code class="method-signature">${m.signature}</code>`;
      objectPropsList.appendChild(mRow);
    }
  }

}

// ── Chart loading helpers ───────────────────────────────────────────────────

/** Load a class's state chart onto the canvas. */
function loadClassChart(cls) {
  S.nodes = cls.nodes || [];
  S.connections = cls.connections || [];
  S.nextId = cls.nextId || 1;
  S.nextConnId = cls.nextConnId || 1;

  const needsFit = [];
  for (const n of S.nodes) {
    if (!n.el) {
      n.el = buildNodeElement(n.type, n.id);
      n.el.style.left = `${n.x}px`;
      n.el.style.top  = `${n.y}px`;
      n.el.style.width = `${n.w}px`;
      n.el.style.height = `${n.h}px`;
      const labelEl = n.el.querySelector('.node-label');
      if (labelEl && n.label) labelEl.textContent = n.label;
      n.mmEl = document.createElement('div');
      n.mmEl.className = `minimap-node minimap-${n.type}-node`;
      if (_wireNodeEvents) _wireNodeEvents(n);
      needsFit.push(n);
    }
    canvasEl.appendChild(n.el);
    mmStatesEl.appendChild(n.mmEl);
  }
  for (const n of needsFit) { fitLabelFontSize(n); positionMinimapNode(n); }

  for (const c of S.connections) {
    if (!c.group) {
      c.group = makeConnGroup();
      c.curveOffset = c.curveOffset || 0;
      c.group.querySelector('.conn-hitarea').addEventListener('click', (e) => { e.stopPropagation(); selectConnFn(c); });
      const lblEl = c.group.querySelector('.conn-label');
      lblEl.addEventListener('click', (e) => { e.stopPropagation(); selectConnFn(c); });
      lblEl.addEventListener('dblclick', (e) => { e.stopPropagation(); selectConnFn(c); startConnEditing(c); });
      c.group.querySelector('.conn-delete').addEventListener('click', (e) => { e.stopPropagation(); deleteConnection(c); });
    }
    connSvg.appendChild(c.group);
  }
  recalcPairOffsets();
}

/** Detach all node/connection DOM elements from the canvas. */
function clearCanvasDOM() {
  for (const n of S.nodes) {
    if (n.el && n.el.parentNode) n.el.remove();
    if (n.mmEl && n.mmEl.parentNode) n.mmEl.remove();
  }
  for (const c of S.connections) {
    if (c.group && c.group.parentNode) c.group.remove();
  }
  S.activeNode = null;
  S.selectedConn = null;
  S.selectedNodes = [];
}

/** Save live S.nodes/connections back to the class being edited. */
export function saveActiveClassChart() {
  if (!S.activeClassId) return;
  const cls = S.classes.find(c => c.id === S.activeClassId);
  if (!cls) return;
  cls.nodes = S.nodes;
  cls.connections = S.connections;
  cls.nextId = S.nextId;
  cls.nextConnId = S.nextConnId;
}

// For backward compatibility with existing code
export const saveActiveObjectChart = saveActiveClassChart;

/** Deselect canvas and clear it. */
function deselCanvas() {
  if (S.activeNode) deactivateNode();
  if (S.selectedConn) deselectConn();
  if (S.selectedNodes.length) clearGroup();
}

// ── Object switching ────────────────────────────────────────────────────────

/**
 * Select an object — displays its class's state chart (read-only).
 */
export function selectObject(id) {
  if (id === S.activeObjectId && S.selectedLeftPanelItem == null && !S.editingClassChart) return;

  deselCanvas();
  if (S.activeClassId) { saveActiveClassChart(); clearCanvasDOM(); }

  S.activeObjectId = id;
  S.selectedLeftPanelItem = null;
  S.editingClassChart = false;

  const obj = S.objects.find(o => o.id === id);
  if (obj) {
    const cls = S.classes.find(c => c.id === obj.classId);
    S.activeClassId = cls ? cls.id : null;
    if (cls) loadClassChart(cls);
  }

  refreshMinimap();
  applyTransform();
  updateInspector();
  renderLeftPanel();
}

/**
 * Deselect the current object — clears the canvas.
 */
export function deselectObject() {
  if (S.activeObjectId == null && S.activeClassId == null) return;

  deselCanvas();
  if (S.activeClassId) { saveActiveClassChart(); clearCanvasDOM(); }

  S.activeObjectId = null;
  S.activeClassId = null;
  S.editingClassChart = false;
  S.nodes = [];
  S.connections = [];
  S.nextId = 1;
  S.nextConnId = 1;

  refreshMinimap();
  applyTransform();
}

/**
 * Switch to class/enum editing mode (no state chart visible).
 */
export function enterClassMode() {
  deselectObject();
  S.selectedLeftPanelItem = null;
  updateInspector();
  renderLeftPanel();
}

/**
 * Switch back to object mode by selecting the first available object.
 */
export function enterObjectMode() {
  const first = S.objects[0];
  if (first) selectObject(first.id);
}

// ── Left panel item selection (for inspector) ───────────────────────────────

export function selectClassInPanel(id) {
  deselCanvas();
  if (S.activeClassId) { saveActiveClassChart(); clearCanvasDOM(); }

  S.activeObjectId = null;
  S.activeClassId = id;
  S.editingClassChart = true;
  S.selectedLeftPanelItem = { kind: 'class', id };

  // Load the class's state chart for editing
  const cls = S.classes.find(c => c.id === id);
  if (cls) loadClassChart(cls);

  refreshMinimap();
  applyTransform();
  updateInspector();
  renderLeftPanel();
}

export function selectEnumInPanel(id) {
  // Deselect current object — clears canvas
  deselectObject();

  if (S.activeNode) deactivateNode();
  if (S.selectedConn) deselectConn();
  if (S.selectedNodes.length) clearGroup();
  S.selectedLeftPanelItem = { kind: 'enum', id };
  updateInspector();
  renderLeftPanel();
}

// ── Add operations ──────────────────────────────────────────────────────────

export function addObject(name, classId) {
  const obj = {
    id: S.nextObjId++,
    name: name || `Object ${S.nextObjId - 1}`,
    classId: classId || (S.classes.length > 0 ? S.classes[0].id : null),
    builtIn: false,
    propertyValues: {},
  };
  S.objects.push(obj);
  renderLeftPanel();
  return obj;
}

export function addClass(name) {
  const cls = {
    id: S.nextClassId++,
    name: name || `Class ${S.nextClassId - 1}`,
    properties: [],
    builtIn: false,
    nodes: [], connections: [], nextId: 1, nextConnId: 1,
  };
  S.classes.push(cls);
  renderLeftPanel();
  return cls;
}

export function addEnumClass(name) {
  const en = {
    id: S.nextEnumId++,
    name: name || `Enum ${S.nextEnumId - 1}`,
    values: [],
    builtIn: false,
  };
  S.enumClasses.push(en);
  renderLeftPanel();
  return en;
}

// ── Delete operations ───────────────────────────────────────────────────────

export function deleteObject(id) {
  const obj = S.objects.find(o => o.id === id);
  if (!obj || obj.builtIn) return false;

  // If deleting the active object, switch to the first available object
  if (id === S.activeObjectId) {
    const other = S.objects.find(o => o.id !== id);
    if (other) selectObject(other.id);
  }

  S.objects.splice(S.objects.indexOf(obj), 1);
  if (S.selectedLeftPanelItem &&
      S.selectedLeftPanelItem.kind === 'object' &&
      S.selectedLeftPanelItem.id === id) {
    S.selectedLeftPanelItem = null;
  }
  renderLeftPanel();
  return true;
}

export function deleteClass(id) {
  const cls = S.classes.find(c => c.id === id);
  if (!cls || cls.builtIn) return false;
  S.classes.splice(S.classes.indexOf(cls), 1);
  if (S.selectedLeftPanelItem &&
      S.selectedLeftPanelItem.kind === 'class' &&
      S.selectedLeftPanelItem.id === id) {
    S.selectedLeftPanelItem = null;
    updateInspector();
  }
  renderLeftPanel();
  return true;
}

export function deleteEnumClass(id) {
  const en = S.enumClasses.find(e => e.id === id);
  if (!en || en.builtIn) return false;
  S.enumClasses.splice(S.enumClasses.indexOf(en), 1);
  if (S.selectedLeftPanelItem &&
      S.selectedLeftPanelItem.kind === 'enum' &&
      S.selectedLeftPanelItem.id === id) {
    S.selectedLeftPanelItem = null;
    updateInspector();
  }
  renderLeftPanel();
  return true;
}
