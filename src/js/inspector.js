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

  const rows = [['Type', n.type], ['ID', n.id]];
  if (n.type === 'state' || n.type === 'choice') {
    rows.push(['Size', `${n.w} × ${n.h}`]);
  }
  rows.push(['Position', `${Math.round(n.x)}, ${Math.round(n.y)}`]);
  const outgoing = S.connections.filter(c => c.fromId === n.id).length;
  const incoming = S.connections.filter(c => c.toId === n.id).length;
  rows.push(['Connections', `${outgoing} out / ${incoming} in`]);
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
    // Insert after the ID row (index 1)
    const idRow = tbody.rows[1];
    if (idRow && idRow.nextSibling) {
      tbody.insertBefore(nameRow, idRow.nextSibling);
    } else {
      tbody.appendChild(nameRow);
    }
  }
}

// ── Connection inspector ─────────────────────────────────────────────────────

function renderConnInspector(c) {
  emptyMsg.style.display = 'none';
  propsContainer.style.display = '';

  const fromNode = c.fromId != null ? S.nodes.find(n => n.id === c.fromId) : null;
  const toNode   = c.toId   != null ? S.nodes.find(n => n.id === c.toId)   : null;
  setPropsRows([
    ['Type', 'transition'],
    ['ID', c.id],
    ['Label', c.label],
    ['From', fromNode ? `${fromNode.type} (${fromNode.id})` : 'disconnected'],
    ['To',   toNode   ? `${toNode.type} (${toNode.id})`     : 'disconnected'],
  ]);
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
      })),
      connections: (o.connections || []).map(c => ({
        id: c.id, fromId: c.fromId, toId: c.toId, label: c.label,
        ...(c.danglingFrom ? { danglingFrom: c.danglingFrom } : {}),
        ...(c.danglingTo   ? { danglingTo:   c.danglingTo }   : {}),
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
