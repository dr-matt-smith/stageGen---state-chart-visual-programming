'use strict';

import { S } from './state.js';
import { PROPERTY_TYPES } from './config.js';
import { canvasEl, connSvg, mmStatesEl } from './dom-refs.js';
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

// ── Render ──────────────────────────────────────────────────────────────────

export function renderLeftPanel() {
  const inObjectMode = S.activeObjectId != null;

  // ── Object mode: objects + props expanded, classes/enums minimized ──
  // ── Class mode:  objects minimized, classes/enums expanded ──────────

  if (inObjectMode) {
    sectionObjects.classList.remove('minimized');
    sectionObjProps.style.display = '';
    sectionClasses.classList.add('minimized');
    sectionEnums.classList.add('minimized');
    btnEditClasses.style.display = '';
    renderObjectProperties();
  } else {
    sectionObjects.classList.add('minimized');
    sectionObjProps.style.display = 'none';
    objectPropsList.innerHTML = '';
    sectionClasses.classList.remove('minimized');
    sectionEnums.classList.remove('minimized');
    btnEditClasses.style.display = 'none';
  }

  renderObjectsList();
  renderClassesList();
  renderEnumsList();

  // Canvas no-object overlay
  if (canvasNoObject) {
    canvasNoObject.style.display = inObjectMode ? 'none' : '';
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

    if (!obj.builtIn) {
      const delBtn = document.createElement('button');
      delBtn.className = 'left-panel-delete-btn';
      delBtn.title = 'Delete object';
      delBtn.textContent = '\u00d7';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm(`Delete object "${obj.name}"?`)) return;
        deleteObject(obj.id);
      });
      item.appendChild(delBtn);
    }

    item.addEventListener('click', () => selectObject(obj.id));
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
}

// ── Object switching ────────────────────────────────────────────────────────

/**
 * Save the current canvas state (nodes/connections) into the active object,
 * then load the target object's state chart onto the canvas.
 */
export function selectObject(id) {
  // If already selected and we're just re-clicking, do nothing
  if (id === S.activeObjectId && S.selectedLeftPanelItem == null) return;

  // Deselect everything on the canvas
  if (S.activeNode) deactivateNode();
  if (S.selectedConn) deselectConn();
  if (S.selectedNodes.length) clearGroup();

  // Save current state chart into the active object
  if (S.activeObjectId != null) {
    saveActiveObjectChart();
    clearCanvasDOM();
  }

  // Load the target object
  S.activeObjectId = id;
  S.selectedLeftPanelItem = null;
  const obj = S.objects.find(o => o.id === id);
  if (obj) {
    S.nodes = obj.nodes;
    S.connections = obj.connections;
    S.nextId = obj.nextId;
    S.nextConnId = obj.nextConnId;

    // Re-attach DOM elements to the canvas
    for (const n of S.nodes) {
      if (n.el) canvasEl.appendChild(n.el);
      if (n.mmEl) mmStatesEl.appendChild(n.mmEl);
    }
    for (const c of S.connections) {
      if (c.group) connSvg.appendChild(c.group);
    }
  }

  refreshMinimap();
  applyTransform();
  updateInspector();
  renderLeftPanel();
}

/**
 * Deselect the current object — clears the canvas and shows no state chart.
 * Used when switching to class/enum editing mode.
 */
export function deselectObject() {
  if (S.activeObjectId == null) return;

  if (S.activeNode) deactivateNode();
  if (S.selectedConn) deselectConn();
  if (S.selectedNodes.length) clearGroup();

  saveActiveObjectChart();
  clearCanvasDOM();

  S.activeObjectId = null;
  S.nodes = [];
  S.connections = [];
  S.nextId = 1;
  S.nextConnId = 1;

  refreshMinimap();
  applyTransform();
}

/**
 * Switch to class/enum editing mode.
 * Deselects the current object and updates the panel layout.
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

/** Save live S.nodes/connections data into the currently active object. */
export function saveActiveObjectChart() {
  const obj = S.objects.find(o => o.id === S.activeObjectId);
  if (!obj) return;
  obj.nodes = S.nodes;
  obj.connections = S.connections;
  obj.nextId = S.nextId;
  obj.nextConnId = S.nextConnId;
}

/** Detach all node/connection DOM elements from the canvas (without destroying them). */
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

// ── Left panel item selection (for inspector) ───────────────────────────────

export function selectClassInPanel(id) {
  // Deselect current object — clears canvas
  deselectObject();

  if (S.activeNode) deactivateNode();
  if (S.selectedConn) deselectConn();
  if (S.selectedNodes.length) clearGroup();
  S.selectedLeftPanelItem = { kind: 'class', id };
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
    nodes: [],
    connections: [],
    nextId: 1,
    nextConnId: 1,
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
