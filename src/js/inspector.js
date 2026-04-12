import { S } from './state.js';
import { PROPERTY_TYPES } from './config.js';
import { fitLabelFontSize } from './nodes/node-element.js';
import { imageFiles, audioFiles } from './asset-manifest.js';

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

function removeClassDiagram() {
  const existing = inspectorBody.querySelector('#class-diagram');
  if (existing) existing.remove();
  const chartOpt = inspectorBody.querySelector('.class-diagram-chart-option');
  if (chartOpt) chartOpt.remove();
}

function showEmpty() {
  removeClassDiagram();
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
  if (S.activeObjectId) {
    renderObjectPropsInspector(S.activeObjectId);
    return;
  }
  showEmpty();
}

// ── Node inspector ───────────────────────────────────────────────────────────

function renderNodeInspector(n) {
  removeClassDiagram();
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
  removeClassDiagram();
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
    <option value="keyUp">keyUp(key)</option>
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
    if (c.event.type === 'keyDown' || c.event.type === 'keyUp') {
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

// ── Object properties inspector ─────────────────────────────────────────────

function renderObjectPropsInspector(objId) {
  const obj = S.objects.find(o => o.id === objId);
  if (!obj) { showEmpty(); return; }
  const cls = S.classes.find(c => c.id === obj.classId);

  removeClassDiagram();
  emptyMsg.style.display = 'none';
  propsContainer.style.display = '';
  tbody.innerHTML = '';

  // Object name and class
  setPropsRows([['Object', obj.name], ['Class', cls ? cls.name : '(none)']]);

  if (!cls || cls.properties.length === 0) return;
  if (!obj.propertyValues) obj.propertyValues = {};

  const headerRow = document.createElement('tr');
  headerRow.innerHTML = `<td colspan="2" style="font-weight:600;color:var(--text-muted);text-transform:uppercase;font-size:10px;letter-spacing:0.05em;padding-top:12px;">Properties</td>`;
  tbody.appendChild(headerRow);

  for (const prop of cls.properties) {
    const tr = document.createElement('tr');
    const labelTd = document.createElement('td');
    labelTd.textContent = prop.name;
    const valueTd = document.createElement('td');

    if (prop.type === 'Boolean') {
      const sel = document.createElement('select');
      sel.className = 'inspector-select';
      sel.innerHTML = '<option value="false">false</option><option value="true">true</option>';
      sel.value = obj.propertyValues[prop.name] === 'true' ? 'true' : 'false';
      sel.addEventListener('change', () => { obj.propertyValues[prop.name] = sel.value; });
      sel.addEventListener('keydown', (e) => e.stopPropagation());
      valueTd.appendChild(sel);
    } else if (prop.type === 'EnumClass') {
      const en = S.enumClasses.find(e => e.id === prop.enumClassId);
      const sel = document.createElement('select');
      sel.className = 'inspector-select';
      if (en) for (const v of en.values) {
        const opt = document.createElement('option');
        opt.value = v; opt.textContent = v;
        if (obj.propertyValues[prop.name] === v) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => { obj.propertyValues[prop.name] = sel.value; });
      sel.addEventListener('keydown', (e) => e.stopPropagation());
      valueTd.appendChild(sel);
    } else if (prop.type === 'Image' || prop.type === 'Sound') {
      const files = prop.type === 'Image' ? imageFiles : audioFiles;
      const sel = document.createElement('select');
      sel.className = 'inspector-select';
      sel.innerHTML = `<option value="">-- select ${prop.type.toLowerCase()} --</option>`;
      for (const f of files) {
        const opt = document.createElement('option');
        opt.value = f; opt.textContent = f;
        if (obj.propertyValues[prop.name] === f) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => { obj.propertyValues[prop.name] = sel.value; });
      sel.addEventListener('keydown', (e) => e.stopPropagation());
      valueTd.appendChild(sel);
    } else {
      const input = document.createElement('input');
      input.type = (prop.type === 'Integer' || prop.type === 'Real') ? 'number' : 'text';
      input.className = 'inspector-input';
      input.value = obj.propertyValues[prop.name] || '';
      input.placeholder = prop.type;
      input.addEventListener('input', () => { obj.propertyValues[prop.name] = input.value; });
      input.addEventListener('keydown', (e) => e.stopPropagation());
      valueTd.appendChild(input);
    }

    tr.appendChild(labelTd);
    tr.appendChild(valueTd);
    tbody.appendChild(tr);
  }

  // Show methods (explicit + sound)
  const explicit = (cls.methods || []).map(m => ({ signature: m.signature, description: m.description || '' }));
  const sound = getSoundMethods(cls);
  const allMethods = [...explicit, ...sound];
  if (allMethods.length > 0) {
    const mHeader = document.createElement('tr');
    mHeader.innerHTML = `<td colspan="2" style="font-weight:600;color:var(--text-muted);text-transform:uppercase;font-size:10px;letter-spacing:0.05em;padding-top:12px;">Methods</td>`;
    tbody.appendChild(mHeader);
    for (const m of allMethods) {
      const mtr = document.createElement('tr');
      mtr.className = 'sound-method-row';
      const mtd = document.createElement('td');
      mtd.colSpan = 2;
      mtd.innerHTML = `<code class="method-signature">${escapeHtml(m.signature)}</code>`;
      mtr.appendChild(mtd);
      tbody.appendChild(mtr);
    }
  }
}

// ── V61: Delete state chart confirmation dialog ────────────────────────────

function showDeleteChartConfirm(cls, classId, checkbox) {
  // Revert the checkbox while the dialog is open
  checkbox.checked = true;

  const overlay = document.createElement('div');
  overlay.id = 'delete-chart-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';

  const dialog = document.createElement('div');
  dialog.id = 'delete-chart-dialog';
  dialog.style.cssText = 'background:var(--bg-panel,#1e1e1e);color:var(--text-primary,#ccc);border-radius:8px;padding:20px;max-width:400px;width:90%;box-shadow:0 4px 20px rgba(0,0,0,0.5);';

  const msg = document.createElement('p');
  msg.textContent = 'This class has an existing state chart. The state chart must be removed before this property can be unchecked.';
  msg.style.cssText = 'margin:0 0 16px 0;font-size:13px;line-height:1.5;';

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'toolbar-btn';
  cancelBtn.style.cssText = 'padding:6px 16px;';
  cancelBtn.addEventListener('click', () => overlay.remove());

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete State Chart';
  deleteBtn.id = 'confirm-delete-chart';
  deleteBtn.className = 'toolbar-btn';
  deleteBtn.style.cssText = 'padding:6px 16px;background:#c44;color:#fff;';
  deleteBtn.addEventListener('click', () => {
    // Clear the state chart data
    if (cls.id === S.activeClassId) {
      // Currently editing this class — clear the live canvas arrays
      for (const n of S.nodes) { if (n.el) n.el.remove(); if (n.mmEl) n.mmEl.remove(); }
      for (const c of S.connections) { if (c.group) c.group.remove(); }
      S.nodes = [];
      S.connections = [];
      S.nextId = 1;
      S.nextConnId = 1;
    }
    cls.nodes = [];
    cls.connections = [];
    cls.nextId = 1;
    cls.nextConnId = 1;
    cls.hasStateChart = false;
    S.editingClassChart = false;
    overlay.remove();
    renderClassInspector(classId);
    notifyLeftPanel();
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(deleteBtn);
  dialog.appendChild(msg);
  dialog.appendChild(btnRow);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
}

// ── Class inspector (V62: class-diagram style) ─────────────────────────────

function renderClassInspector(classId) {
  const cls = S.classes.find(c => c.id === classId);
  if (!cls) { showEmpty(); return; }

  removeClassDiagram();
  emptyMsg.style.display = 'none';
  propsContainer.style.display = 'none';
  tbody.innerHTML = '';

  // Build a class-diagram container instead of using the table
  const diagram = document.createElement('div');
  diagram.className = 'class-diagram';
  diagram.id = 'class-diagram';

  // ── Compartment 1: Class name ──
  const nameComp = document.createElement('div');
  nameComp.className = 'class-diagram-compartment class-diagram-name';
  const classLabel = document.createElement('span');
  classLabel.className = 'class-diagram-label';
  classLabel.textContent = 'Class:';
  nameComp.appendChild(classLabel);
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'class-diagram-name-input';
  nameInput.id = 'class-name-input';
  nameInput.value = cls.name;
  nameInput.addEventListener('input', () => {
    const val = nameInput.value.trim();
    if (val) { cls.name = val; notifyLeftPanel(); }
  });
  nameInput.addEventListener('keydown', (e) => e.stopPropagation());
  nameComp.appendChild(nameInput);
  diagram.appendChild(nameComp);

  // V61: hasStateChart checkbox (below name compartment, outside diagram box)
  const chartRow = document.createElement('div');
  chartRow.className = 'class-diagram-chart-option';
  const chartCb = document.createElement('input');
  chartCb.type = 'checkbox';
  chartCb.id = 'has-state-chart-cb';
  chartCb.checked = cls.hasStateChart !== false;
  chartCb.addEventListener('change', () => {
    if (!chartCb.checked) {
      const classNodes = cls.id === S.activeClassId ? S.nodes : cls.nodes;
      if (classNodes && classNodes.length > 0) {
        showDeleteChartConfirm(cls, classId, chartCb);
        return;
      }
    }
    cls.hasStateChart = chartCb.checked;
    if (!cls.hasStateChart && cls.id === S.activeClassId) {
      S.editingClassChart = false;
      notifyLeftPanel();
    } else if (cls.hasStateChart && cls.id === S.activeClassId) {
      S.editingClassChart = true;
      notifyLeftPanel();
    }
  });
  const chartLabel = document.createElement('label');
  chartLabel.className = 'class-diagram-chart-label';
  chartLabel.appendChild(chartCb);
  chartLabel.appendChild(document.createTextNode(' Has State Chart'));
  chartRow.appendChild(chartLabel);

  // ── Compartment 2: Properties ──
  const propsComp = document.createElement('div');
  propsComp.className = 'class-diagram-compartment class-diagram-props';

  // Column headers
  const propsHeader = document.createElement('div');
  propsHeader.className = 'class-diagram-row class-diagram-col-headers';
  propsHeader.innerHTML = '<span class="cd-col-main"></span><span class="cd-col-default">default</span><span class="cd-col-delete">delete</span>';
  propsComp.appendChild(propsHeader);

  for (let i = 0; i < cls.properties.length; i++) {
    const prop = cls.properties[i];
    const row = document.createElement('div');
    row.className = 'class-diagram-row class-prop-row';

    // Main content: name: TypeDropdown [= default]
    const main = document.createElement('span');
    main.className = 'cd-col-main';

    const propNameInput = document.createElement('input');
    propNameInput.type = 'text';
    propNameInput.className = 'cd-prop-name';
    propNameInput.placeholder = 'name';
    propNameInput.value = prop.name;
    propNameInput.addEventListener('input', () => { prop.name = propNameInput.value.trim(); });
    propNameInput.addEventListener('keydown', (e) => e.stopPropagation());
    main.appendChild(propNameInput);

    const colonSpan = document.createElement('span');
    colonSpan.className = 'cd-colon';
    colonSpan.textContent = ':';
    main.appendChild(colonSpan);

    const typeSelect = document.createElement('select');
    typeSelect.className = 'cd-type-select';
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
    main.appendChild(typeSelect);

    // EnumClass sub-selector
    if (prop.type === 'EnumClass') {
      const enumSelect = document.createElement('select');
      enumSelect.className = 'cd-type-select cd-enum-select';
      for (const en of S.enumClasses) {
        const opt = document.createElement('option');
        opt.value = en.id; opt.textContent = en.name;
        if (prop.enumClassId === en.id) opt.selected = true;
        enumSelect.appendChild(opt);
      }
      enumSelect.addEventListener('change', () => { prop.enumClassId = Number(enumSelect.value); });
      enumSelect.addEventListener('keydown', (e) => e.stopPropagation());
      main.appendChild(enumSelect);
    }

    // Default value display (inline = value)
    if (prop.defaultValue !== undefined) {
      const eqSpan = document.createElement('span');
      eqSpan.className = 'cd-equals';
      eqSpan.textContent = '=';
      main.appendChild(eqSpan);
      const defInput = document.createElement('input');
      defInput.type = 'text';
      defInput.className = 'cd-default-input';
      defInput.value = prop.defaultValue;
      defInput.addEventListener('input', () => { prop.defaultValue = defInput.value; });
      defInput.addEventListener('keydown', (e) => e.stopPropagation());
      main.appendChild(defInput);
    }

    row.appendChild(main);

    // Default checkbox column
    const defCol = document.createElement('span');
    defCol.className = 'cd-col-default';
    const defCb = document.createElement('input');
    defCb.type = 'checkbox';
    defCb.className = 'cd-default-cb';
    defCb.checked = prop.defaultValue !== undefined;
    defCb.title = 'Has default value';
    defCb.addEventListener('change', () => {
      if (defCb.checked) {
        prop.defaultValue = prop.defaultValue || '';
      } else {
        delete prop.defaultValue;
      }
      renderClassInspector(classId);
    });
    defCol.appendChild(defCb);
    row.appendChild(defCol);

    // Delete button column
    const delCol = document.createElement('span');
    delCol.className = 'cd-col-delete';
    const delBtn = document.createElement('button');
    delBtn.className = 'cd-delete-btn';
    delBtn.textContent = '\u2716';
    delBtn.title = 'Delete property';
    delBtn.addEventListener('click', () => {
      cls.properties.splice(i, 1);
      renderClassInspector(classId);
    });
    delCol.appendChild(delBtn);
    row.appendChild(delCol);

    propsComp.appendChild(row);
  }

  // Add property button row
  const addPropRow = document.createElement('div');
  addPropRow.className = 'class-diagram-row cd-add-row';
  const addPropBtn = document.createElement('button');
  addPropBtn.className = 'cd-add-btn';
  addPropBtn.textContent = '+';
  addPropBtn.title = 'Add property';
  addPropBtn.addEventListener('click', () => {
    cls.properties.push({ name: 'newProp', type: 'String' });
    renderClassInspector(classId);
  });
  addPropRow.appendChild(addPropBtn);
  propsComp.appendChild(addPropRow);

  diagram.appendChild(propsComp);

  // ── Compartment 3: Methods ──
  const methodsComp = document.createElement('div');
  methodsComp.className = 'class-diagram-compartment class-diagram-methods';

  const explicit = cls.methods || [];
  const sound = getSoundMethods(cls);
  const allMethods = [...explicit, ...sound];

  if (allMethods.length > 0) {
    // Column headers
    const methHeader = document.createElement('div');
    methHeader.className = 'class-diagram-row class-diagram-col-headers';
    methHeader.innerHTML = '<span class="cd-col-main"></span><span class="cd-col-default">return<br>value</span><span class="cd-col-delete">delete</span>';
    methodsComp.appendChild(methHeader);
  }

  for (let i = 0; i < allMethods.length; i++) {
    const m = allMethods[i];
    const isExplicit = i < explicit.length;
    const row = document.createElement('div');
    row.className = 'class-diagram-row class-method-row';

    const main = document.createElement('span');
    main.className = 'cd-col-main';

    if (isExplicit) {
      const sigInput = document.createElement('input');
      sigInput.type = 'text';
      sigInput.className = 'cd-method-sig';
      sigInput.value = m.signature;
      sigInput.addEventListener('input', () => { explicit[i].signature = sigInput.value; });
      sigInput.addEventListener('keydown', (e) => e.stopPropagation());
      main.appendChild(sigInput);

      // Return type (inline)
      if (m.returnType) {
        const colonSpan = document.createElement('span');
        colonSpan.className = 'cd-colon';
        colonSpan.textContent = ':';
        main.appendChild(colonSpan);
        const retInput = document.createElement('input');
        retInput.type = 'text';
        retInput.className = 'cd-return-input';
        retInput.value = m.returnType;
        retInput.addEventListener('input', () => { explicit[i].returnType = retInput.value; });
        retInput.addEventListener('keydown', (e) => e.stopPropagation());
        main.appendChild(retInput);
      }
    } else {
      // Auto-generated sound method (read-only)
      const sigSpan = document.createElement('code');
      sigSpan.className = 'method-signature';
      sigSpan.textContent = m.signature;
      main.appendChild(sigSpan);
    }

    row.appendChild(main);

    // Return value checkbox column
    const retCol = document.createElement('span');
    retCol.className = 'cd-col-default';
    if (isExplicit) {
      const retCb = document.createElement('input');
      retCb.type = 'checkbox';
      retCb.className = 'cd-return-cb';
      retCb.checked = !!m.returnType;
      retCb.title = 'Has return value';
      retCb.addEventListener('change', () => {
        if (retCb.checked) {
          explicit[i].returnType = explicit[i].returnType || 'String';
        } else {
          delete explicit[i].returnType;
        }
        renderClassInspector(classId);
      });
      retCol.appendChild(retCb);
    }
    row.appendChild(retCol);

    // Delete column
    const delCol = document.createElement('span');
    delCol.className = 'cd-col-delete';
    if (isExplicit) {
      const delBtn = document.createElement('button');
      delBtn.className = 'cd-delete-btn';
      delBtn.textContent = '\u2716';
      delBtn.title = 'Delete method';
      delBtn.addEventListener('click', () => {
        cls.methods.splice(i, 1);
        renderClassInspector(classId);
      });
      delCol.appendChild(delBtn);
    }
    row.appendChild(delCol);

    methodsComp.appendChild(row);
  }

  // Add method button row
  const addMethodRow = document.createElement('div');
  addMethodRow.className = 'class-diagram-row cd-add-row';
  const addMethodBtn = document.createElement('button');
  addMethodBtn.className = 'cd-add-btn';
  addMethodBtn.id = 'btn-add-method';
  addMethodBtn.textContent = '+';
  addMethodBtn.title = 'Add method';
  addMethodBtn.addEventListener('click', () => {
    if (!cls.methods) cls.methods = [];
    cls.methods.push({ name: 'newMethod', signature: 'newMethod()' });
    renderClassInspector(classId);
  });
  addMethodRow.appendChild(addMethodBtn);
  methodsComp.appendChild(addMethodRow);

  diagram.appendChild(methodsComp);

  inspectorBody.appendChild(diagram);
  inspectorBody.appendChild(chartRow);
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

// ── Enum class inspector ────────────────────────────────────────────────────

function renderEnumInspector(enumId) {
  const en = S.enumClasses.find(e => e.id === enumId);
  if (!en) { showEmpty(); return; }

  removeClassDiagram();
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

function serialiseNodes(nodes) {
  return (nodes || []).map(n => ({
    id: n.id, type: n.type,
    x: Math.round(n.x), y: Math.round(n.y),
    w: n.w, h: n.h,
    label: n.label || undefined,
    ...(n.entryBehaviours && n.entryBehaviours.length ? { entryBehaviours: n.entryBehaviours } : {}),
    ...(n.doBehaviours && n.doBehaviours.length ? { doBehaviours: n.doBehaviours } : {}),
    ...(n.exitBehaviours && n.exitBehaviours.length ? { exitBehaviours: n.exitBehaviours } : {}),
  }));
}

function serialiseConns(connections) {
  return (connections || []).map(c => ({
    id: c.id, fromId: c.fromId, toId: c.toId, label: c.label,
    ...(c.danglingFrom ? { danglingFrom: c.danglingFrom } : {}),
    ...(c.danglingTo   ? { danglingTo:   c.danglingTo }   : {}),
    ...(c.event ? { event: c.event } : {}),
    ...(c.guardCondition ? { guardCondition: c.guardCondition } : {}),
    ...(c.behaviours && c.behaviours.length ? { behaviours: c.behaviours } : {}),
  }));
}

export function serialiseDiagram() {
  // Save the active class's current nodes/connections first
  if (S.activeClassId) {
    const activeCls = S.classes.find(c => c.id === S.activeClassId);
    if (activeCls) {
      activeCls.nodes = S.nodes;
      activeCls.connections = S.connections;
      activeCls.nextId = S.nextId;
      activeCls.nextConnId = S.nextConnId;
    }
  }

  return {
    objects: S.objects.map(o => ({
      id: o.id,
      name: o.name,
      classId: o.classId,
      builtIn: o.builtIn || undefined,
      ...(o.propertyValues && Object.keys(o.propertyValues).length ? { propertyValues: o.propertyValues } : {}),
    })),
    classes: S.classes.map(c => ({
      id: c.id, name: c.name,
      builtIn: c.builtIn || undefined,
      hasStateChart: c.hasStateChart !== false ? true : false,
      properties: c.properties,
      ...(c.methods ? { methods: c.methods } : {}),
      nodes: serialiseNodes(c.id === S.activeClassId ? S.nodes : c.nodes),
      connections: serialiseConns(c.id === S.activeClassId ? S.connections : c.connections),
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

// ── Load Example ────────────────────────────────────────────────────────────

export function showLoadExample(exampleFiles) {
  if (!exampleFiles || exampleFiles.length === 0) {
    alert('No example files found in public/examples/');
    return;
  }

  if (!confirm('Loading an example will replace the current project. Continue?')) return;

  const overlay = document.createElement('div');
  overlay.id = 'json-modal-overlay';
  overlay.innerHTML = `
    <div id="json-modal">
      <div id="json-modal-header">
        <span>Load Example</span>
        <div id="json-modal-actions">
          <button id="json-modal-close" class="json-modal-btn" title="Close">&times;</button>
        </div>
      </div>
      <div id="json-modal-body" style="padding:0;"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const body = overlay.querySelector('#json-modal-body');
  for (const file of exampleFiles) {
    const item = document.createElement('div');
    item.className = 'example-file-item';
    item.textContent = file.replace(/^examples\//, '').replace(/\.(json|JSON)$/i, '');
    item.dataset.path = file;
    item.addEventListener('click', async () => {
      try {
        const resp = await fetch(file);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        close();
        if (_onJsonLoaded) _onJsonLoaded(data);
      } catch (err) {
        alert('Failed to load example: ' + err.message);
      }
    });
    body.appendChild(item);
  }

  const close = () => overlay.remove();
  overlay.querySelector('#json-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
  });
}
