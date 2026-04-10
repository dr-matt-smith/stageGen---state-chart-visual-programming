import { S } from './state.js';
import { PROPERTY_TYPES } from './config.js';
import { fitLabelFontSize } from './nodes/node-element.js';

const inspectorEl    = document.getElementById('inspector');
const emptyMsg       = document.getElementById('inspector-empty');
const propsContainer = document.getElementById('inspector-props');
const inspectorBody  = document.getElementById('inspector-body');
const tbody          = document.querySelector('#inspector-table tbody');
const divider        = document.getElementById('divider');

// ── Resizable divider ────────────────────────────────────────────────────────

let draggingDivider = false;

divider.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  draggingDivider = true;
  divider.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
});

document.addEventListener('mousemove', (e) => {
  if (!draggingDivider) return;
  const mainArea = document.getElementById('main-area');
  const mainRect = mainArea.getBoundingClientRect();
  const inspectorW = Math.max(180, Math.min(mainRect.width * 0.6, mainRect.right - e.clientX));
  inspectorEl.style.width = `${inspectorW}px`;
});

document.addEventListener('mouseup', () => {
  if (!draggingDivider) return;
  draggingDivider = false;
  divider.classList.remove('dragging');
  document.body.style.cursor = '';
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setPropsRows(rows) {
  tbody.innerHTML = '';
  for (const [label, value] of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${label}</td><td>${escapeHtml(String(value))}</td>`;
    tbody.appendChild(tr);
  }
}

function showEmpty() {
  emptyMsg.style.display = 'block';
  propsContainer.style.display = 'none';
  tbody.innerHTML = '';
}

// ── Inspector update ─────────────────────────────────────────────────────────

export function updateInspector() {
  if (S.activeNode) {
    renderNodeInspector(S.activeNode);
    return;
  }
  if (S.selectedConn) {
    renderConnInspector(S.selectedConn);
    return;
  }
  if (S.selectedLeftPanelItem) {
    const { kind, id } = S.selectedLeftPanelItem;
    if (kind === 'class') { renderClassInspector(id); return; }
    if (kind === 'enum')  { renderEnumInspector(id);  return; }
  }
  showEmpty();
}

// ── Node inspector ───────────────────────────────────────────────────────────

function renderNodeInspector(n) {
  emptyMsg.style.display = 'none';
  propsContainer.style.display = '';
  tbody.innerHTML = '';

  // Type and ID rows
  const rows = [['Type', n.type], ['ID', n.id]];
  setPropsRows(rows);

  // Editable name field for state/choice nodes
  if (n.type === 'state' || n.type === 'choice') {
    const nameRow = document.createElement('tr');
    const nameTd = document.createElement('td');
    nameTd.textContent = 'Name';
    const valueTd = document.createElement('td');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'inspector-input inspector-name-input';
    nameInput.value = n.label;
    nameInput.addEventListener('input', () => {
      const val = nameInput.value.trim();
      if (val) {
        n.label = val;
        const labelEl = n.el.querySelector('.node-label');
        if (labelEl) labelEl.textContent = val;
        fitLabelFontSize(n);
      }
    });
    nameInput.addEventListener('keydown', (e) => e.stopPropagation());
    valueTd.appendChild(nameInput);
    nameRow.appendChild(nameTd);
    nameRow.appendChild(valueTd);
    tbody.appendChild(nameRow);
  }

  // State behaviours (Entry / Do / Exit)
  if (n.type === 'state') {
    // Initialise arrays if missing
    if (!n.entryBehaviours) n.entryBehaviours = [];
    if (!n.doBehaviours) n.doBehaviours = [];
    if (!n.exitBehaviours) n.exitBehaviours = [];

    renderBehaviourSection('State Behaviours', null, true);
    renderBehaviourSection('Entry /', n.entryBehaviours);
    renderBehaviourSection('Do /', n.doBehaviours);
    renderBehaviourSection('Exit /', n.exitBehaviours);
  }
}

function renderBehaviourSection(title, behaviours, isMainHeader) {
  const headerRow = document.createElement('tr');
  const style = isMainHeader
    ? 'font-weight:700;color:var(--text-primary);font-size:12px;padding-top:14px;padding-bottom:2px;'
    : 'font-weight:600;color:var(--text-muted);text-transform:uppercase;font-size:10px;letter-spacing:0.05em;padding-top:10px;';
  headerRow.innerHTML = `<td colspan="2" style="${style}">${escapeHtml(title)}</td>`;
  tbody.appendChild(headerRow);

  if (isMainHeader) return; // main header is just a title, no content

  for (let i = 0; i < behaviours.length; i++) {
    const tr = document.createElement('tr');
    tr.className = 'behaviour-row';
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inspector-input';
    input.value = behaviours[i];
    input.addEventListener('input', () => { behaviours[i] = input.value; });
    input.addEventListener('keydown', (e) => e.stopPropagation());
    td.appendChild(input);

    const delTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'inspector-delete-btn';
    delBtn.textContent = '\u00d7';
    delBtn.title = 'Delete behaviour';
    delBtn.addEventListener('click', () => {
      behaviours.splice(i, 1);
      renderNodeInspector(S.activeNode);
    });
    delTd.appendChild(delBtn);

    tr.appendChild(td);
    tr.appendChild(delTd);
    tbody.appendChild(tr);
  }

  const addRow = document.createElement('tr');
  const addTd = document.createElement('td');
  addTd.colSpan = 2;
  const addBtn = document.createElement('button');
  addBtn.className = 'toolbar-btn';
  addBtn.textContent = `+ Add`;
  addBtn.style.fontSize = '10px';
  addBtn.style.marginTop = '2px';
  addBtn.addEventListener('click', () => {
    behaviours.push('');
    renderNodeInspector(S.activeNode);
  });
  addTd.appendChild(addBtn);
  addRow.appendChild(addTd);
  tbody.appendChild(addRow);
}

// ── Connection inspector ─────────────────────────────────────────────────────

function renderConnInspector(c) {
  emptyMsg.style.display = 'none';
  propsContainer.style.display = '';
  tbody.innerHTML = '';

  // Initialise fields if missing
  if (!c.event) c.event = null;
  if (!c.guardCondition) c.guardCondition = null;
  if (!c.behaviours) c.behaviours = [];

  const fromNode = c.fromId != null ? S.nodes.find(n => n.id === c.fromId) : null;
  const toNode   = c.toId   != null ? S.nodes.find(n => n.id === c.toId)   : null;
  setPropsRows([
    ['Type', 'transition'],
    ['ID', c.id],
    ['From', fromNode ? `${fromNode.type} (${fromNode.id})` : 'disconnected'],
    ['To',   toNode   ? `${toNode.type} (${toNode.id})`     : 'disconnected'],
  ]);

  // ── Event section ──
  const eventHeader = document.createElement('tr');
  eventHeader.innerHTML = `<td colspan="2" style="font-weight:600;color:var(--text-muted);text-transform:uppercase;font-size:10px;letter-spacing:0.05em;padding-top:12px;">Event</td>`;
  tbody.appendChild(eventHeader);

  const eventRow = document.createElement('tr');
  const eventTd = document.createElement('td');
  eventTd.colSpan = 2;

  const eventTypeSelect = document.createElement('select');
  eventTypeSelect.className = 'inspector-select';
  eventTypeSelect.innerHTML = `
    <option value="">-- none --</option>
    <option value="after">after(seconds)</option>
    <option value="when">when(expression)</option>
    <option value="keyDown">keyDown(key)</option>
  `;
  if (c.event) eventTypeSelect.value = c.event.type;
  eventTypeSelect.addEventListener('change', () => {
    if (eventTypeSelect.value === '') {
      if (c.guardCondition) {
        alert('Cannot remove event while a guard condition exists. Remove the guard condition first.');
        eventTypeSelect.value = c.event ? c.event.type : '';
        return;
      }
      c.event = null;
    } else {
      c.event = { type: eventTypeSelect.value, value: c.event ? c.event.value : '' };
    }
    renderConnInspector(c);
  });
  eventTypeSelect.addEventListener('keydown', (e) => e.stopPropagation());
  eventTd.appendChild(eventTypeSelect);

  if (c.event) {
    if (c.event.type === 'keyDown') {
      // Key input: allow single character (forced uppercase) or SpecialKeyType dropdown
      const keyWrapper = document.createElement('div');
      keyWrapper.style.display = 'flex';
      keyWrapper.style.gap = '4px';
      keyWrapper.style.marginTop = '4px';

      const keyInput = document.createElement('input');
      keyInput.type = 'text';
      keyInput.className = 'inspector-input';
      keyInput.style.flex = '1';
      keyInput.maxLength = 1;
      keyInput.placeholder = 'A-Z';
      keyInput.value = (c.event.value && c.event.value.length === 1) ? c.event.value : '';
      keyInput.addEventListener('input', () => {
        keyInput.value = keyInput.value.toUpperCase();
        if (keyInput.value) {
          c.event.value = keyInput.value;
          specialSelect.value = '';
        }
      });
      keyInput.addEventListener('keydown', (e) => e.stopPropagation());

      const specialSelect = document.createElement('select');
      specialSelect.className = 'inspector-select';
      specialSelect.style.flex = '2';
      specialSelect.innerHTML = '<option value="">Special key...</option>';
      const specialEnum = S.enumClasses.find(e => e.name === 'SpecialKeyType');
      if (specialEnum) {
        for (const v of specialEnum.values) {
          const opt = document.createElement('option');
          opt.value = v;
          opt.textContent = v;
          if (c.event.value === v) opt.selected = true;
          specialSelect.appendChild(opt);
        }
      }
      specialSelect.addEventListener('change', () => {
        if (specialSelect.value) {
          c.event.value = specialSelect.value;
          keyInput.value = '';
        }
      });
      specialSelect.addEventListener('keydown', (e) => e.stopPropagation());

      keyWrapper.appendChild(keyInput);
      keyWrapper.appendChild(specialSelect);
      eventTd.appendChild(keyWrapper);
    } else {
      const valInput = document.createElement('input');
      valInput.type = 'text';
      valInput.className = 'inspector-input';
      valInput.style.marginTop = '4px';
      valInput.placeholder = c.event.type === 'after' ? 'seconds (e.g. 2.5)' : 'expression';
      valInput.value = c.event.value || '';
      valInput.addEventListener('input', () => { c.event.value = valInput.value; });
      valInput.addEventListener('keydown', (e) => e.stopPropagation());
      eventTd.appendChild(valInput);
    }
  }

  eventRow.appendChild(eventTd);
  tbody.appendChild(eventRow);

  // ── Guard condition section (requires event) ──
  const guardHeader = document.createElement('tr');
  guardHeader.innerHTML = `<td colspan="2" style="font-weight:600;color:var(--text-muted);text-transform:uppercase;font-size:10px;letter-spacing:0.05em;padding-top:12px;">[ Guard Condition ]</td>`;
  tbody.appendChild(guardHeader);

  const guardRow = document.createElement('tr');
  const guardTd = document.createElement('td');
  guardTd.colSpan = 2;

  if (!c.event) {
    const hint = document.createElement('span');
    hint.style.fontSize = '10px';
    hint.style.color = 'var(--text-dim)';
    hint.style.fontStyle = 'italic';
    hint.textContent = 'Set an event first';
    guardTd.appendChild(hint);
  } else {
    const guardInput = document.createElement('input');
    guardInput.type = 'text';
    guardInput.className = 'inspector-input';
    guardInput.placeholder = 'condition expression';
    guardInput.value = c.guardCondition || '';
    guardInput.addEventListener('input', () => {
      c.guardCondition = guardInput.value || null;
    });
    guardInput.addEventListener('keydown', (e) => e.stopPropagation());
    guardTd.appendChild(guardInput);
  }

  guardRow.appendChild(guardTd);
  tbody.appendChild(guardRow);

  // ── Transition behaviours section ──
  const behHeader = document.createElement('tr');
  behHeader.innerHTML = `<td colspan="2" style="font-weight:600;color:var(--text-muted);text-transform:uppercase;font-size:10px;letter-spacing:0.05em;padding-top:12px;">/ Transition Behaviours</td>`;
  tbody.appendChild(behHeader);

  for (let i = 0; i < c.behaviours.length; i++) {
    const tr = document.createElement('tr');
    tr.className = 'behaviour-row';
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inspector-input';
    input.value = c.behaviours[i];
    input.addEventListener('input', () => { c.behaviours[i] = input.value; });
    input.addEventListener('keydown', (e) => e.stopPropagation());
    td.appendChild(input);

    const delTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'inspector-delete-btn';
    delBtn.textContent = '\u00d7';
    delBtn.addEventListener('click', () => {
      c.behaviours.splice(i, 1);
      renderConnInspector(c);
    });
    delTd.appendChild(delBtn);

    tr.appendChild(td);
    tr.appendChild(delTd);
    tbody.appendChild(tr);
  }

  const addBehRow = document.createElement('tr');
  const addBehTd = document.createElement('td');
  addBehTd.colSpan = 2;
  const addBehBtn = document.createElement('button');
  addBehBtn.className = 'toolbar-btn';
  addBehBtn.textContent = '+ Add';
  addBehBtn.style.fontSize = '10px';
  addBehBtn.style.marginTop = '2px';
  addBehBtn.addEventListener('click', () => {
    c.behaviours.push('');
    renderConnInspector(c);
  });
  addBehTd.appendChild(addBehBtn);
  addBehRow.appendChild(addBehTd);
  tbody.appendChild(addBehRow);
}

// ── Class inspector ─────────────────────────────────────────────────────────

function renderClassInspector(classId) {
  const cls = S.classes.find(c => c.id === classId);
  if (!cls) { showEmpty(); return; }

  emptyMsg.style.display = 'none';
  propsContainer.style.display = '';
  tbody.innerHTML = '';

  // Class name (editable)
  const nameRow = document.createElement('tr');
  nameRow.innerHTML = `<td>Name</td><td></td>`;
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'inspector-input';
  nameInput.value = cls.name;
  nameInput.addEventListener('input', () => {
    const val = nameInput.value.trim();
    if (val) { cls.name = val; notifyLeftPanel(); }
  });
  nameInput.addEventListener('keydown', (e) => e.stopPropagation());
  nameRow.cells[1].appendChild(nameInput);
  tbody.appendChild(nameRow);

  // Section header for properties
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = `<td colspan="2" style="font-weight:600;color:var(--text-muted);text-transform:uppercase;font-size:10px;letter-spacing:0.05em;padding-top:12px;">Properties</td>`;
  tbody.appendChild(headerRow);

  // Existing properties
  for (let i = 0; i < cls.properties.length; i++) {
    const prop = cls.properties[i];
    const tr = document.createElement('tr');
    tr.className = 'class-prop-row';

    // Property name cell
    const nameTd = document.createElement('td');
    const propNameInput = document.createElement('input');
    propNameInput.type = 'text';
    propNameInput.className = 'inspector-input';
    propNameInput.value = prop.name;
    propNameInput.addEventListener('input', () => {
      prop.name = propNameInput.value.trim();
    });
    propNameInput.addEventListener('keydown', (e) => e.stopPropagation());
    nameTd.appendChild(propNameInput);

    // Type + delete cell
    const typeTd = document.createElement('td');
    const typeSelect = document.createElement('select');
    typeSelect.className = 'inspector-select';
    for (const t of PROPERTY_TYPES) {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t === 'EnumClass' ? 'Enum Class' : t;
      if (t === prop.type) opt.selected = true;
      typeSelect.appendChild(opt);
    }
    typeSelect.addEventListener('change', () => {
      prop.type = typeSelect.value;
      if (prop.type !== 'EnumClass') delete prop.enumClassId;
      renderClassInspector(classId);
    });
    typeSelect.addEventListener('keydown', (e) => e.stopPropagation());
    typeTd.appendChild(typeSelect);

    // If type is EnumClass, show sub-dropdown
    if (prop.type === 'EnumClass') {
      const enumSelect = document.createElement('select');
      enumSelect.className = 'inspector-select';
      for (const en of S.enumClasses) {
        const opt = document.createElement('option');
        opt.value = en.id;
        opt.textContent = en.name;
        if (prop.enumClassId === en.id) opt.selected = true;
        enumSelect.appendChild(opt);
      }
      enumSelect.addEventListener('change', () => {
        prop.enumClassId = Number(enumSelect.value);
      });
      enumSelect.addEventListener('keydown', (e) => e.stopPropagation());
      typeTd.appendChild(enumSelect);
    }

    // Delete property button
    const delBtn = document.createElement('button');
    delBtn.className = 'inspector-delete-btn';
    delBtn.textContent = '\u00d7';
    delBtn.title = 'Delete property';
    delBtn.addEventListener('click', () => {
      cls.properties.splice(i, 1);
      renderClassInspector(classId);
    });
    typeTd.appendChild(delBtn);

    tr.appendChild(nameTd);
    tr.appendChild(typeTd);
    tbody.appendChild(tr);
  }

  // Add property button
  const addRow = document.createElement('tr');
  const addTd = document.createElement('td');
  addTd.colSpan = 2;
  const addBtn = document.createElement('button');
  addBtn.className = 'toolbar-btn';
  addBtn.textContent = '+ Add Property';
  addBtn.style.fontSize = '11px';
  addBtn.style.marginTop = '6px';
  addBtn.addEventListener('click', () => {
    cls.properties.push({ name: 'newProp', type: 'String' });
    renderClassInspector(classId);
  });
  addTd.appendChild(addBtn);
  addRow.appendChild(addTd);
  tbody.appendChild(addRow);

  // Auto-generated sound methods
  renderSoundMethodsSection(cls);
}

// ── Sound methods (auto-generated) ──────────────────────────────────────────

/**
 * For a given class, return an array of auto-generated method signatures
 * derived from Sound-type properties.
 * e.g. property "music" → MusicPlay(), MusicPause(), MusicSetLooping(boolean)
 */
export function getSoundMethods(cls) {
  if (!cls || !cls.properties) return [];
  const methods = [];
  for (const prop of cls.properties) {
    if (prop.type !== 'Sound') continue;
    const base = prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
    methods.push({ name: `${base}Play`, signature: `${base}Play()`, description: 'Play from beginning' });
    methods.push({ name: `${base}Pause`, signature: `${base}Pause()`, description: 'Pause playback' });
    methods.push({ name: `${base}SetLooping`, signature: `${base}SetLooping(boolean)`, description: 'Set looping on/off' });
  }
  return methods;
}

function renderSoundMethodsSection(cls) {
  const methods = getSoundMethods(cls);
  if (methods.length === 0) return;

  const headerRow = document.createElement('tr');
  headerRow.innerHTML = `<td colspan="2" style="font-weight:600;color:var(--text-muted);text-transform:uppercase;font-size:10px;letter-spacing:0.05em;padding-top:12px;">Sound Methods</td>`;
  tbody.appendChild(headerRow);

  for (const m of methods) {
    const tr = document.createElement('tr');
    tr.className = 'sound-method-row';
    const sigTd = document.createElement('td');
    sigTd.colSpan = 2;
    sigTd.innerHTML = `<code class="method-signature">${escapeHtml(m.signature)}</code><span class="method-desc">${escapeHtml(m.description)}</span>`;
    tr.appendChild(sigTd);
    tbody.appendChild(tr);
  }
}

// ── Enum class inspector ────────────────────────────────────────────────────

function renderEnumInspector(enumId) {
  const en = S.enumClasses.find(e => e.id === enumId);
  if (!en) { showEmpty(); return; }

  emptyMsg.style.display = 'none';
  propsContainer.style.display = '';
  tbody.innerHTML = '';

  // Enum name (editable)
  const nameRow = document.createElement('tr');
  nameRow.innerHTML = `<td>Name</td><td></td>`;
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'inspector-input';
  nameInput.value = en.name;
  nameInput.addEventListener('input', () => {
    const val = nameInput.value.trim();
    if (val) { en.name = val; notifyLeftPanel(); }
  });
  nameInput.addEventListener('keydown', (e) => e.stopPropagation());
  nameRow.cells[1].appendChild(nameInput);
  tbody.appendChild(nameRow);

  // Section header for values
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = `<td colspan="2" style="font-weight:600;color:var(--text-muted);text-transform:uppercase;font-size:10px;letter-spacing:0.05em;padding-top:12px;">Values</td>`;
  tbody.appendChild(headerRow);

  // Existing values
  for (let i = 0; i < en.values.length; i++) {
    const tr = document.createElement('tr');
    const valTd = document.createElement('td');
    const valInput = document.createElement('input');
    valInput.type = 'text';
    valInput.className = 'inspector-input';
    valInput.value = en.values[i];
    valInput.addEventListener('input', () => {
      en.values[i] = valInput.value.toUpperCase();
      valInput.value = en.values[i];
    });
    valInput.addEventListener('keydown', (e) => e.stopPropagation());
    valTd.appendChild(valInput);

    const delTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'inspector-delete-btn';
    delBtn.textContent = '\u00d7';
    delBtn.title = 'Delete value';
    delBtn.addEventListener('click', () => {
      en.values.splice(i, 1);
      renderEnumInspector(enumId);
    });
    delTd.appendChild(delBtn);

    tr.appendChild(valTd);
    tr.appendChild(delTd);
    tbody.appendChild(tr);
  }

  // Add value button
  const addRow = document.createElement('tr');
  const addTd = document.createElement('td');
  addTd.colSpan = 2;
  const addBtn = document.createElement('button');
  addBtn.className = 'toolbar-btn';
  addBtn.textContent = '+ Add Value';
  addBtn.style.fontSize = '11px';
  addBtn.style.marginTop = '6px';
  addBtn.addEventListener('click', () => {
    en.values.push('NEW_VALUE');
    renderEnumInspector(enumId);
  });
  addTd.appendChild(addBtn);
  addRow.appendChild(addTd);
  tbody.appendChild(addRow);
}

/** Notify left panel to re-render after name changes. */
let _renderLeftPanel = null;
export function setRenderLeftPanel(fn) { _renderLeftPanel = fn; }
function notifyLeftPanel() { if (_renderLeftPanel) _renderLeftPanel(); }

// ── JSON serialisation ───────────────────────────────────────────────────────

export function serialiseDiagram() {
  // Save the active object's current nodes/connections first
  const activeObj = S.objects.find(o => o.id === S.activeObjectId);
  if (activeObj) {
    activeObj.nodes = S.nodes;
    activeObj.connections = S.connections;
    activeObj.nextId = S.nextId;
    activeObj.nextConnId = S.nextConnId;
  }

  return {
    objects: S.objects.map(o => ({
      id: o.id,
      name: o.name,
      classId: o.classId,
      builtIn: o.builtIn || undefined,
      nodes: (o.nodes || []).map(n => ({
        id: n.id, type: n.type,
        x: Math.round(n.x), y: Math.round(n.y),
        w: n.w, h: n.h,
        label: n.label || undefined,
        ...(n.entryBehaviours && n.entryBehaviours.length ? { entryBehaviours: n.entryBehaviours } : {}),
        ...(n.doBehaviours && n.doBehaviours.length ? { doBehaviours: n.doBehaviours } : {}),
        ...(n.exitBehaviours && n.exitBehaviours.length ? { exitBehaviours: n.exitBehaviours } : {}),
      })),
      connections: (o.connections || []).map(c => ({
        id: c.id, fromId: c.fromId, toId: c.toId, label: c.label,
        ...(c.danglingFrom ? { danglingFrom: c.danglingFrom } : {}),
        ...(c.danglingTo   ? { danglingTo:   c.danglingTo }   : {}),
        ...(c.event ? { event: c.event } : {}),
        ...(c.guardCondition ? { guardCondition: c.guardCondition } : {}),
        ...(c.behaviours && c.behaviours.length ? { behaviours: c.behaviours } : {}),
      })),
    })),
    classes: S.classes.map(c => ({
      id: c.id, name: c.name,
      builtIn: c.builtIn || undefined,
      properties: c.properties,
    })),
    enumClasses: S.enumClasses.map(e => ({
      id: e.id, name: e.name,
      builtIn: e.builtIn || undefined,
      values: e.values,
    })),
  };
}

export function showJsonExport() {
  const json = JSON.stringify(serialiseDiagram(), null, 2);
  const overlay = document.createElement('div');
  overlay.id = 'json-modal-overlay';
  overlay.innerHTML = `
    <div id="json-modal">
      <div id="json-modal-header">
        <span>Diagram JSON</span>
        <div id="json-modal-actions">
          <button id="json-modal-copy" class="json-modal-btn" title="Copy to clipboard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button id="json-modal-close" class="json-modal-btn" title="Close">&times;</button>
        </div>
      </div>
      <div id="json-modal-body"><pre></pre></div>
    </div>
  `;
  document.body.appendChild(overlay);
  const pre = overlay.querySelector('pre');
  pre.textContent = json;
  const close = () => overlay.remove();
  overlay.querySelector('#json-modal-close').addEventListener('click', close);
  overlay.querySelector('#json-modal-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(json).then(() => {
      const btn = overlay.querySelector('#json-modal-copy');
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      }, 1500);
    });
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
  });
}

// ── Load JSON ───────────────────────────────────────────────────────────────

let _onJsonLoaded = null;
export function setOnJsonLoaded(fn) { _onJsonLoaded = fn; }

export function showJsonLoad() {
  if (!confirm('Loading a project will replace the current project. Continue?')) return;

  const overlay = document.createElement('div');
  overlay.id = 'json-modal-overlay';
  overlay.innerHTML = `
    <div id="json-modal">
      <div id="json-modal-header">
        <span>Load Project JSON</span>
        <div id="json-modal-actions">
          <button id="json-load-btn" class="json-modal-btn" title="Load" style="font-size:12px;">Load</button>
          <button id="json-modal-close" class="json-modal-btn" title="Close">&times;</button>
        </div>
      </div>
      <div id="json-modal-body">
        <textarea id="json-load-textarea" style="width:100%;min-height:200px;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border-color);border-radius:4px;font-family:'SF Mono','Consolas','Menlo',monospace;font-size:11px;padding:8px;resize:vertical;" placeholder="Paste project JSON here..."></textarea>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#json-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#json-load-btn').addEventListener('click', () => {
    const text = overlay.querySelector('#json-load-textarea').value.trim();
    if (!text) return;
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      alert('Invalid JSON: ' + err.message);
      return;
    }
    // Validate guard conditions require events
    if (data.objects) {
      for (const obj of data.objects) {
        for (const c of (obj.connections || [])) {
          if (c.guardCondition && !c.event) {
            alert(`Error: Connection ${c.id} has a guard condition but no event.`);
            return;
          }
        }
      }
    }
    close();
    if (_onJsonLoaded) _onJsonLoaded(data);
  });

  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
  });
}
