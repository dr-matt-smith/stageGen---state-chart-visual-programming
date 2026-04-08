import { S } from './state.js';
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

// ── JSON serialisation ───────────────────────────────────────────────────────

export function serialiseDiagram() {
  return {
    nodes: S.nodes.map(n => ({
      id: n.id,
      type: n.type,
      x: Math.round(n.x),
      y: Math.round(n.y),
      w: n.w,
      h: n.h,
      label: n.label || undefined,
    })),
    connections: S.connections.map(c => ({
      id: c.id,
      fromId: c.fromId,
      toId: c.toId,
      label: c.label,
      ...(c.danglingFrom ? { danglingFrom: c.danglingFrom } : {}),
      ...(c.danglingTo   ? { danglingTo:   c.danglingTo }   : {}),
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
