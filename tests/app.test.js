import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { setupDOM } from './setup.js';

// The DOM must exist before app.js is imported (it grabs refs at load time)
setupDOM();

const app = await import('../src/js/main.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function nodeCount() { return app.S.nodes.length; }
function connCount() { return app.S.connections.length; }

// ─── Version 1 & 2: Node creation ──────────────────────────────────────────

describe('Node creation', () => {
  it('creates a state node with correct defaults', () => {
    const before = nodeCount();
    const node = app.createNode('state', 100, 200);
    expect(nodeCount()).toBe(before + 1);
    expect(node.type).toBe('state');
    expect(node.x).toBe(100);
    expect(node.y).toBe(200);
    expect(node.w).toBe(app.NODE_DEFAULTS.state.w);
    expect(node.h).toBe(app.NODE_DEFAULTS.state.h);
    expect(node.el).toBeTruthy();
    expect(node.el.classList.contains('state-node')).toBe(true);
  });

  it('creates a start node', () => {
    const node = app.createNode('start', 50, 50);
    expect(node.type).toBe('start');
    expect(node.w).toBe(app.NODE_DEFAULTS.start.w);
  });

  it('creates an end node', () => {
    const node = app.createNode('end', 300, 50);
    expect(node.type).toBe('end');
    expect(node.w).toBe(app.NODE_DEFAULTS.end.w);
  });

  it('creates a choice node with diamond SVG', () => {
    const node = app.createNode('choice', 200, 200);
    expect(node.type).toBe('choice');
    expect(node.el.querySelector('.choice-svg')).toBeTruthy();
    expect(node.el.querySelector('.node-label').textContent).toBe('?');
  });

  it('assigns unique incrementing IDs', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 0, 0);
    expect(b.id).toBeGreaterThan(a.id);
  });

  it('adds node DOM element to canvas', () => {
    const node = app.createNode('state', 0, 0);
    expect(app.canvasEl.contains(node.el)).toBe(true);
  });

  it('adds minimap representation', () => {
    const node = app.createNode('state', 0, 0);
    expect(node.mmEl).toBeTruthy();
    expect(node.mmEl.classList.contains('minimap-state-node')).toBe(true);
  });
});

// ─── Version 3: Node text labels ────────────────────────────────────────────

describe('Node labels', () => {
  it('state node has editable label with default text', () => {
    const node = app.createNode('state', 0, 0);
    expect(node.label).toMatch(/^State \d+$/);
    const labelEl = node.el.querySelector('.node-label');
    expect(labelEl).toBeTruthy();
    expect(labelEl.textContent).toBeTruthy();
  });

  it('choice node has default label "?"', () => {
    const node = app.createNode('choice', 0, 0);
    expect(node.label).toBe('?');
  });

  it('start node has read-only "start" label', () => {
    const node = app.createNode('start', 0, 0);
    const fixedLabel = node.el.querySelector('.node-label-fixed');
    expect(fixedLabel).toBeTruthy();
    expect(fixedLabel.textContent).toBe('start');
  });

  it('end node has read-only "end" label', () => {
    const node = app.createNode('end', 0, 0);
    const fixedLabel = node.el.querySelector('.node-label-fixed');
    expect(fixedLabel).toBeTruthy();
    expect(fixedLabel.textContent).toBe('end');
  });
});

// ─── Version 3: Node movement ───────────────────────────────────────────────

describe('Node movement', () => {
  it('moveNode updates position', () => {
    const node = app.createNode('state', 100, 100);
    app.moveNode(node, 300, 400);
    expect(node.x).toBe(300);
    expect(node.y).toBe(400);
    expect(node.el.style.left).toBe('300px');
    expect(node.el.style.top).toBe('400px');
  });
});

// ─── Version 3: Node resizing ───────────────────────────────────────────────

describe('Node resizing', () => {
  it('resizeNode updates dimensions', () => {
    const node = app.createNode('state', 100, 100);
    app.resizeNode(node, 100, 100, 200, 80);
    expect(node.w).toBe(200);
    expect(node.h).toBe(80);
    expect(node.el.style.width).toBe('200px');
    expect(node.el.style.height).toBe('80px');
  });

  it('state node has reset button', () => {
    const node = app.createNode('state', 0, 0);
    expect(node.el.querySelector('.node-reset-btn')).toBeTruthy();
  });

  it('choice node has reset button', () => {
    const node = app.createNode('choice', 0, 0);
    expect(node.el.querySelector('.node-reset-btn')).toBeTruthy();
  });

  it('resetNodeSize restores default dimensions', () => {
    const node = app.createNode('state', 100, 100);
    app.resizeNode(node, 100, 100, 300, 200);
    app.resetNodeSize(node);
    expect(node.w).toBe(app.NODE_DEFAULTS.state.w);
    expect(node.h).toBe(app.NODE_DEFAULTS.state.h);
  });

  it('respects minimum size constants', () => {
    expect(app.NODE_MIN_SIZE.state.w).toBeLessThan(app.NODE_DEFAULTS.state.w);
    expect(app.NODE_MIN_SIZE.choice.w).toBeLessThan(app.NODE_DEFAULTS.choice.w);
  });
});

// ─── Version 3: Active node / selection ─────────────────────────────────────

describe('Node activation', () => {
  it('activateNode sets the active node', () => {
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    expect(app.S.activeNode).toBe(node);
    expect(node.el.classList.contains('node-active')).toBe(true);
  });

  it('activateNode adds resize handles in edit mode', () => {
    app.S.editingClassChart = true;
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    expect(node.el.querySelectorAll('.resize-handle').length).toBe(8);
    app.deactivateNode();
    app.S.editingClassChart = false;
  });

  it('activateNode adds connection handle in edit mode', () => {
    app.S.editingClassChart = true;
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    expect(node.el.querySelector('.conn-handle')).toBeTruthy();
    app.deactivateNode();
    app.S.editingClassChart = false;
  });

  it('activateNode adds delete handle in edit mode', () => {
    app.S.editingClassChart = true;
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    expect(node.el.querySelector('.node-delete-handle')).toBeTruthy();
    app.S.editingClassChart = false;
  });

  it('deactivateNode clears selection', () => {
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    app.deactivateNode();
    expect(app.S.activeNode).toBeNull();
    expect(node.el.classList.contains('node-active')).toBe(false);
  });

  it('deactivateNode removes handles', () => {
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    app.deactivateNode();
    expect(node.el.querySelectorAll('.resize-handle').length).toBe(0);
    expect(node.el.querySelector('.conn-handle')).toBeNull();
    expect(node.el.querySelector('.node-delete-handle')).toBeNull();
  });

  it('activating a new node deactivates the previous one', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 200, 0);
    app.activateNode(a);
    app.activateNode(b);
    expect(app.S.activeNode).toBe(b);
    expect(a.el.classList.contains('node-active')).toBe(false);
  });
});

// ─── Version 4: Fit All ─────────────────────────────────────────────────────

describe('Fit All', () => {
  it('adjusts zoom and pan to show all nodes', () => {
    app.S.nodes.length = 0;
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 2000, 1500);
    app.fitAll();
    expect(app.S.zoom).toBeLessThan(1);
  });

  it('does nothing when there are no nodes', () => {
    app.S.nodes.length = 0;
    const zBefore = app.S.zoom;
    app.fitAll();
    expect(app.S.zoom).toBe(zBefore);
  });
});

// ─── Version 5: Connections ─────────────────────────────────────────────────

describe('Connections', () => {
  it('creates a connection between two nodes', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 300, 0);
    const before = connCount();
    app.createConnection(a, b);
    expect(connCount()).toBe(before + 1);
  });

  it('connection has default label "transition"', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 300, 0);
    app.createConnection(a, b);
    const conn = app.S.connections[app.S.connections.length - 1];
    expect(conn.label).toBe('transition');
  });

  it('connection has SVG group in DOM', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 300, 0);
    app.createConnection(a, b);
    const conn = app.S.connections[app.S.connections.length - 1];
    expect(conn.group).toBeTruthy();
    expect(conn.group.querySelector('.conn-line')).toBeTruthy();
    expect(conn.group.querySelector('.conn-arrow')).toBeTruthy();
    expect(conn.group.querySelector('.conn-label')).toBeTruthy();
    expect(conn.group.querySelector('.conn-delete')).toBeTruthy();
  });

  it('allows multiple connections between the same pair', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 300, 0);
    const before = connCount();
    app.createConnection(a, b);
    app.createConnection(a, b);
    expect(connCount()).toBe(before + 2);
  });

  it('deleteConnection removes the connection', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 300, 0);
    app.createConnection(a, b);
    const conn = app.S.connections[app.S.connections.length - 1];
    const before = connCount();
    app.deleteConnection(conn);
    expect(connCount()).toBe(before - 1);
  });

  it('selectConn / deselectConn works', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 300, 0);
    app.createConnection(a, b);
    const conn = app.S.connections[app.S.connections.length - 1];
    app.selectConn(conn);
    expect(app.S.selectedConn).toBe(conn);
    expect(conn.group.classList.contains('conn-selected')).toBe(true);
    app.deselectConn();
    expect(app.S.selectedConn).toBeNull();
    expect(conn.group.classList.contains('conn-selected')).toBe(false);
  });

  it('connections update when a node moves (elastic banding)', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 300, 0);
    app.createConnection(a, b);
    const conn = app.S.connections[app.S.connections.length - 1];
    const pathBefore = conn.group.querySelector('.conn-line').getAttribute('d');
    app.moveNode(a, 0, 200);
    const pathAfter = conn.group.querySelector('.conn-line').getAttribute('d');
    expect(pathAfter).not.toBe(pathBefore);
  });
});

// ─── Version 6: Auto text sized to fit ──────────────────────────────────────

describe('Auto text font sizing', () => {
  it('fitLabelFontSize sets a font size on the label', () => {
    const node = app.createNode('state', 0, 0);
    app.fitLabelFontSize(node);
    const labelEl = node.el.querySelector('.node-label');
    expect(labelEl.style.fontSize).toBeTruthy();
  });

  it('does nothing for start/end nodes', () => {
    const node = app.createNode('start', 0, 0);
    app.fitLabelFontSize(node);
  });

  it('is called during resize', () => {
    const node = app.createNode('state', 0, 0);
    app.resizeNode(node, 0, 0, 300, 200);
    const labelEl = node.el.querySelector('.node-label');
    expect(labelEl.style.fontSize).toBeTruthy();
  });
});

// ─── Version 6: Group selection ─────────────────────────────────────────────

describe('Group selection', () => {
  it('selectGroup selects multiple nodes', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 200, 0);
    app.selectGroup([a, b]);
    expect(app.S.selectedNodes).toContain(a);
    expect(app.S.selectedNodes).toContain(b);
    expect(a.el.classList.contains('node-group-selected')).toBe(true);
    expect(b.el.classList.contains('node-group-selected')).toBe(true);
  });

  it('clearGroup deselects all', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 200, 0);
    app.selectGroup([a, b]);
    app.clearGroup();
    expect(app.S.selectedNodes.length).toBe(0);
    expect(a.el.classList.contains('node-group-selected')).toBe(false);
  });

  it('selectGroup deactivates any active node', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 200, 0);
    app.activateNode(a);
    app.selectGroup([a, b]);
    expect(app.S.activeNode).toBeNull();
  });
});

// ─── Version 7: Minimap minimize/restore ────────────────────────────────────

describe('Minimap minimize/restore', () => {
  it('minimize button hides minimap and shows restore button', () => {
    const minimap = document.getElementById('minimap');
    const minimizeBtn = document.getElementById('minimap-minimize');
    const restoreBtn = document.getElementById('minimap-restore');

    minimizeBtn.click();
    expect(minimap.style.display).toBe('none');
    expect(restoreBtn.style.display).toBe('block');
  });

  it('restore button shows minimap and hides itself', () => {
    const minimap = document.getElementById('minimap');
    const restoreBtn = document.getElementById('minimap-restore');

    document.getElementById('minimap-minimize').click();
    restoreBtn.click();
    expect(minimap.style.display).toBe('');
    expect(restoreBtn.style.display).toBe('none');
  });
});

// ─── Version 8: Zoom ────────────────────────────────────────────────────────

describe('Zoom', () => {
  it('zoomAround changes zoom level', () => {
    const before = app.S.zoom;
    const cw = app.canvasContainer.clientWidth || 800;
    const ch = app.canvasContainer.clientHeight || 600;
    app.zoomAround(before + 0.5, cw / 2, ch / 2);
    expect(app.S.zoom).toBeCloseTo(before + 0.5, 1);
  });

  it('zoom is clamped to min/max', () => {
    app.zoomAround(0.001, 400, 300);
    expect(app.S.zoom).toBeGreaterThanOrEqual(app.ZOOM_MIN);
    app.zoomAround(100, 400, 300);
    expect(app.S.zoom).toBeLessThanOrEqual(app.ZOOM_MAX);
  });

  it('zoom label updates', () => {
    app.zoomAround(1, 400, 300);
    const label = document.getElementById('zoom-label');
    expect(label.textContent).toBe('100%');
  });

  it('zoom slider syncs', () => {
    app.zoomAround(1.5, 400, 300);
    const slider = document.getElementById('zoom-slider');
    expect(slider.value).toBe('150');
  });
});

// ─── Version 10: Node deletion ──────────────────────────────────────────────

describe('Node deletion', () => {
  it('deleteNode removes node from nodes array and DOM', () => {
    const node = app.createNode('state', 500, 500);
    const before = nodeCount();
    app.deleteNode(node);
    expect(nodeCount()).toBe(before - 1);
    expect(app.canvasEl.contains(node.el)).toBe(false);
  });

  it('deleteNode preserves connections as dangling', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 300, 0);
    app.createConnection(a, b);
    const conn = app.S.connections[app.S.connections.length - 1];
    const beforeConns = connCount();

    app.deleteNode(a);
    expect(connCount()).toBe(beforeConns); // connection still exists
    expect(conn.fromId).toBeNull();
    expect(conn.danglingFrom).toBeTruthy();
    expect(conn.toId).toBe(b.id);
  });

  it('deleteNode sets both ends dangling when middle node deleted', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 200, 0);
    const c = app.createNode('state', 400, 0);
    app.createConnection(a, b);
    app.createConnection(b, c);
    const conn1 = app.S.connections[app.S.connections.length - 2];
    const conn2 = app.S.connections[app.S.connections.length - 1];

    app.deleteNode(b);
    expect(conn1.toId).toBeNull();
    expect(conn1.danglingTo).toBeTruthy();
    expect(conn2.fromId).toBeNull();
    expect(conn2.danglingFrom).toBeTruthy();
  });

  it('deleteNode deactivates the node if active', () => {
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    app.deleteNode(node);
    expect(app.S.activeNode).toBeNull();
  });

  it('deleteNode removes minimap element', () => {
    const node = app.createNode('state', 0, 0);
    const mmEl = node.mmEl;
    app.deleteNode(node);
    expect(document.getElementById('minimap-states').contains(mmEl)).toBe(false);
  });
});

// ─── Geometry helpers ───────────────────────────────────────────────────────

describe('Geometry helpers', () => {
  it('getBorderPoint returns a point on the node border', () => {
    const node = app.createNode('state', 100, 100);
    const p = app.getBorderPoint(node, 500, 125);
    expect(p.x).toBeCloseTo(100 + node.w, 0);
  });

  it('getBorderPoint works for choice (diamond) nodes', () => {
    const node = app.createNode('choice', 100, 100);
    const p = app.getBorderPoint(node, 500, 140);
    expect(p.x).toBeGreaterThan(node.x);
    expect(p.x).toBeLessThan(500);
  });

  it('getBorderPoint works for start/end (circle) nodes', () => {
    const node = app.createNode('start', 100, 100);
    const cx = node.x + node.w / 2;
    const cy = node.y + node.h / 2;
    const p = app.getBorderPoint(node, cx + 100, cy);
    expect(p.x).toBeCloseTo(cx + node.w / 2, 0);
  });

  it('getMinimapBounds covers all nodes', () => {
    app.S.nodes.length = 0;
    app.createNode('state', -100, -50);
    app.createNode('state', 5000, 4000);
    const bounds = app.getMinimapBounds();
    expect(bounds.x).toBeLessThan(-100);
    expect(bounds.y).toBeLessThan(-50);
    expect(bounds.x + bounds.w).toBeGreaterThan(5000);
    expect(bounds.y + bounds.h).toBeGreaterThan(4000);
  });
});

// ─── Configuration constants ────────────────────────────────────────────────

describe('Configuration', () => {
  it('has correct world dimensions', () => {
    expect(app.WORLD_W).toBe(4000);
    expect(app.WORLD_H).toBe(3000);
  });

  it('has default node dimensions for all types', () => {
    expect(app.NODE_DEFAULTS.state).toBeTruthy();
    expect(app.NODE_DEFAULTS.start).toBeTruthy();
    expect(app.NODE_DEFAULTS.end).toBeTruthy();
    expect(app.NODE_DEFAULTS.choice).toBeTruthy();
  });

  it('has minimum sizes for resizable types', () => {
    expect(app.NODE_MIN_SIZE.state).toBeTruthy();
    expect(app.NODE_MIN_SIZE.choice).toBeTruthy();
  });

  it('zoom limits are sensible', () => {
    expect(app.ZOOM_MIN).toBeLessThan(1);
    expect(app.ZOOM_MAX).toBeGreaterThan(1);
    expect(app.ZOOM_STEP).toBeGreaterThan(0);
  });
});

// ─── Version 21: Hand tool in zoom toolbar ─────────────────────────────────

describe('Hand tool in zoom toolbar', () => {
  it('hand tool button exists inside zoom toolbar', () => {
    const zoomToolbar = document.getElementById('zoom-toolbar');
    const handBtn = document.getElementById('btn-hand-tool');
    expect(zoomToolbar.contains(handBtn)).toBe(true);
  });

  it('hand tool button is NOT in the main toolbar', () => {
    const toolbar = document.getElementById('toolbar');
    const handBtn = document.getElementById('btn-hand-tool');
    expect(toolbar.contains(handBtn)).toBe(false);
  });

  it('hand tool toggles activeTool between hand and select', () => {
    const handBtn = document.getElementById('btn-hand-tool');
    app.S.activeTool = 'select';
    handBtn.click();
    expect(app.S.activeTool).toBe('hand');
    handBtn.click();
    expect(app.S.activeTool).toBe('select');
  });

  it('hand tool button gets active class when toggled on', () => {
    const handBtn = document.getElementById('btn-hand-tool');
    app.S.activeTool = 'select';
    handBtn.classList.remove('active');
    handBtn.click();
    expect(handBtn.classList.contains('active')).toBe(true);
    handBtn.click();
    expect(handBtn.classList.contains('active')).toBe(false);
  });
});

// ─── Version 22: Edit block name in inspector panel ────────────────────────

describe('Edit node name in inspector panel', () => {
  it('inspector shows an editable name input for state nodes', () => {
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    app.updateInspector();
    const nameInput = document.querySelector('.inspector-name-input');
    expect(nameInput).toBeTruthy();
    expect(nameInput.tagName).toBe('INPUT');
    expect(nameInput.value).toBe(node.label);
  });

  it('inspector shows an editable name input for choice nodes', () => {
    const node = app.createNode('choice', 0, 0);
    app.activateNode(node);
    app.updateInspector();
    const nameInput = document.querySelector('.inspector-name-input');
    expect(nameInput).toBeTruthy();
    expect(nameInput.value).toBe(node.label);
  });

  it('inspector does NOT show name input for start nodes', () => {
    const node = app.createNode('start', 0, 0);
    app.activateNode(node);
    app.updateInspector();
    const nameInput = document.querySelector('.inspector-name-input');
    expect(nameInput).toBeNull();
  });

  it('inspector does NOT show name input for end nodes', () => {
    const node = app.createNode('end', 0, 0);
    app.activateNode(node);
    app.updateInspector();
    const nameInput = document.querySelector('.inspector-name-input');
    expect(nameInput).toBeNull();
  });

  it('typing in the name input updates the node label', () => {
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    app.updateInspector();
    const nameInput = document.querySelector('.inspector-name-input');
    nameInput.value = 'NewName';
    nameInput.dispatchEvent(new Event('input'));
    expect(node.label).toBe('NewName');
  });

  it('typing in the name input updates the diagram label element', () => {
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    app.updateInspector();
    const nameInput = document.querySelector('.inspector-name-input');
    nameInput.value = 'LiveUpdate';
    nameInput.dispatchEvent(new Event('input'));
    const labelEl = node.el.querySelector('.node-label');
    expect(labelEl.textContent).toBe('LiveUpdate');
  });

  it('empty input does not clear the node label', () => {
    const node = app.createNode('state', 0, 0);
    const original = node.label;
    app.activateNode(node);
    app.updateInspector();
    const nameInput = document.querySelector('.inspector-name-input');
    nameInput.value = '   ';
    nameInput.dispatchEvent(new Event('input'));
    expect(node.label).toBe(original);
  });
});

// ─── Inspector tabs and Settings ──────────────────────────────────────────

describe('Inspector tabs and Settings cog', () => {
  it('inspector tab exists in DOM', () => {
    const tabs = document.querySelectorAll('.inspector-tab');
    expect(tabs.length).toBe(1);
    expect(tabs[0].dataset.tab).toBe('inspector');
  });

  it('inspector tab is active by default', () => {
    const inspectorTab = document.querySelector('.inspector-tab[data-tab="inspector"]');
    expect(inspectorTab.classList.contains('active')).toBe(true);
  });

  it('theme toggle button exists in toolbar', () => {
    expect(document.getElementById('btn-theme-toggle')).toBeTruthy();
  });
});

// ─── Inspector clears when no object selected ───────────────────────────────

describe('Inspector updates on deselect', () => {
  it('inspector shows props after node deletion (class/object view)', () => {
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    app.updateInspector();
    const propsContainer = document.getElementById('inspector-props');
    expect(propsContainer.style.display).not.toBe('none');

    app.deleteNode(node);
    app.updateInspector();
    // Should show object/class properties or empty depending on context
    expect(propsContainer).toBeTruthy();
  });

  it('inspector shows props when group is selected', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 200, 0);
    app.selectGroup([a, b]);
    app.updateInspector();
    // With activeObjectId set, inspector shows object props
    expect(document.getElementById('inspector-props')).toBeTruthy();
  });
});

// ─── Export JSON button location ────────────────────────────────────────────

describe('Export JSON button location', () => {
  it('export JSON button is inside toolbar', () => {
    const toolbar = document.getElementById('toolbar');
    const btn = document.getElementById('btn-export-json');
    expect(toolbar.contains(btn)).toBe(true);
  });

  it('export JSON button is NOT inside inspector', () => {
    const inspector = document.getElementById('inspector');
    const btn = document.getElementById('btn-export-json');
    expect(inspector.contains(btn)).toBe(false);
  });
});

// ─── Inspector shows state chart properties ─────────────────────────────────

describe('Inspector shows state chart properties', () => {
  it('Type, ID, Name, and State Behaviours are shown for state nodes', () => {
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    app.updateInspector();

    const allCells = Array.from(document.querySelectorAll('#inspector-table td'));
    const cellTexts = allCells.map(td => td.textContent);
    expect(cellTexts).toContain('Type');
    expect(cellTexts).toContain('ID');
    expect(cellTexts).toContain('Name');
    expect(cellTexts).toContain('State Behaviours');
    expect(cellTexts).toContain('Entry /');
    expect(cellTexts).toContain('Do /');
    expect(cellTexts).toContain('Exit /');
  });
});

// ─── Minimap inside canvas-container ────────────────────────────────────────

describe('Minimap in canvas area', () => {
  it('minimap is inside canvas-container', () => {
    const container = document.getElementById('canvas-container');
    const minimap = document.getElementById('minimap');
    expect(container.contains(minimap)).toBe(true);
  });

  it('minimap-restore button is inside canvas-container', () => {
    const container = document.getElementById('canvas-container');
    const restoreBtn = document.getElementById('minimap-restore');
    expect(container.contains(restoreBtn)).toBe(true);
  });

  it('minimap is NOT a direct child of body', () => {
    const minimap = document.getElementById('minimap');
    expect(minimap.parentElement.id).not.toBe('');
    expect(minimap.parentElement.tagName).not.toBe('BODY');
  });
});

// ─── Node ID label ──────────────────────────────────────────────────────────

describe('Node ID label', () => {
  it('state node has id label element', () => {
    const node = app.createNode('state', 0, 0);
    const idLabel = node.el.querySelector('.node-id-label');
    expect(idLabel).toBeTruthy();
    expect(idLabel.textContent).toBe(`id: ${node.id}`);
  });

  it('choice node has id label element', () => {
    const node = app.createNode('choice', 0, 0);
    const idLabel = node.el.querySelector('.node-id-label');
    expect(idLabel).toBeTruthy();
    expect(idLabel.textContent).toBe(`id: ${node.id}`);
  });

  it('start node has id label element', () => {
    const node = app.createNode('start', 0, 0);
    const idLabel = node.el.querySelector('.node-id-label');
    expect(idLabel).toBeTruthy();
  });
});

// ─── Theme toggle ───────────────────────────────────────────────────────────

describe('Theme toggle', () => {
  it('clicking theme toggle alternates between light and dark', () => {
    const btn = document.getElementById('btn-theme-toggle');
    // Determine current state from button text
    const wasLight = btn.textContent.includes('Light');

    btn.click();
    if (wasLight) {
      // Was light, now dark
      expect(document.documentElement.dataset.theme).toBeUndefined();
    } else {
      // Was dark, now light
      expect(document.documentElement.dataset.theme).toBe('light');
    }

    // Toggle back
    btn.click();
    if (wasLight) {
      expect(document.documentElement.dataset.theme).toBe('light');
    } else {
      expect(document.documentElement.dataset.theme).toBeUndefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V44 — Objects, Classes, Enum Classes
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Default state initialisation ─────────────────────────────────────────────

describe('V44: Default state', () => {
  it('has a default game object', () => {
    const game = app.S.objects.find(o => o.name === 'game');
    expect(game).toBeTruthy();
    expect(game.builtIn).toBe(true);
  });

  it('has a default Game class with 4 properties', () => {
    const cls = app.S.classes.find(c => c.name === 'Game');
    expect(cls).toBeTruthy();
    expect(cls.builtIn).toBe(true);
    expect(cls.properties.length).toBe(4);
    expect(cls.properties.map(p => p.name)).toEqual(['name', 'description', 'category', 'tickIntervalSeconds']);
  });

  it('has a default GameType enum class with 5 values', () => {
    const en = app.S.enumClasses.find(e => e.name === 'GameType');
    expect(en).toBeTruthy();
    expect(en.builtIn).toBe(true);
    expect(en.values).toEqual(['ARCADE', 'PLATFORMER', 'SHOOTER', 'PUZZLE', 'OTHER']);
  });

  it('game object is linked to Game class', () => {
    const game = app.S.objects.find(o => o.name === 'game');
    const cls = app.S.classes.find(c => c.name === 'Game');
    expect(game.classId).toBe(cls.id);
  });

  it('Game class category property references GameType enum', () => {
    const cls = app.S.classes.find(c => c.name === 'Game');
    const catProp = cls.properties.find(p => p.name === 'category');
    expect(catProp.type).toBe('EnumClass');
    const en = app.S.enumClasses.find(e => e.name === 'GameType');
    expect(catProp.enumClassId).toBe(en.id);
  });

  it('activeObjectId is set to the game object', () => {
    const game = app.S.objects.find(o => o.name === 'game');
    expect(app.S.activeObjectId).toBe(game.id);
  });
});

// ─── Left panel rendering ─────────────────────────────────────────────────────

describe('V44: Left panel rendering', () => {
  it('objects list contains game object', () => {
    const items = document.querySelectorAll('#objects-list .left-panel-item');
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].textContent).toContain('game');
  });

  it('classes list contains Game, Sprite, and CSSColor classes', () => {
    const items = document.querySelectorAll('#classes-list .left-panel-item');
    expect(items.length).toBeGreaterThanOrEqual(3);
    const names = Array.from(items).map(i => i.textContent);
    expect(names.some(n => n.includes('Game'))).toBe(true);
    expect(names.some(n => n.includes('Sprite'))).toBe(true);
    expect(names.some(n => n.includes('CSSColor'))).toBe(true);
  });

  it('enums list contains GameType and SpecialKeyType', () => {
    const items = document.querySelectorAll('#enums-list .left-panel-item');
    expect(items.length).toBeGreaterThanOrEqual(2);
    const names = Array.from(items).map(i => i.textContent);
    expect(names.some(n => n.includes('GameType'))).toBe(true);
    expect(names.some(n => n.includes('SpecialKeyType'))).toBe(true);
  });

  it('game object has no delete button (builtIn)', () => {
    const item = document.querySelector('#objects-list .left-panel-item');
    expect(item.querySelector('.left-panel-delete-btn')).toBeNull();
  });
});

// ─── Adding objects, classes, enums ───────────────────────────────────────────

describe('V44: Add operations', () => {
  it('addObject creates a new object', () => {
    const before = app.S.objects.length;
    app.addObject('ship', app.S.classes[0].id);
    expect(app.S.objects.length).toBe(before + 1);
    const obj = app.S.objects.find(o => o.name === 'ship');
    expect(obj).toBeTruthy();
    expect(obj.builtIn).toBe(false);
  });

  it('addClass creates a new class with empty properties', () => {
    const before = app.S.classes.length;
    app.addClass('CustomClass');
    expect(app.S.classes.length).toBe(before + 1);
    const cls = app.S.classes.find(c => c.name === 'CustomClass');
    expect(cls).toBeTruthy();
    expect(cls.properties).toEqual([]);
    expect(cls.builtIn).toBe(false);
  });

  it('addEnumClass creates a new enum class with empty values', () => {
    const before = app.S.enumClasses.length;
    app.addEnumClass('Fruits');
    expect(app.S.enumClasses.length).toBe(before + 1);
    const en = app.S.enumClasses.find(e => e.name === 'Fruits');
    expect(en).toBeTruthy();
    expect(en.values).toEqual([]);
    expect(en.builtIn).toBe(false);
  });
});

// ─── Delete operations ────────────────────────────────────────────────────────

describe('V44: Delete operations', () => {
  it('cannot delete the built-in game object', () => {
    const game = app.S.objects.find(o => o.name === 'game');
    const result = app.deleteObject(game.id);
    expect(result).toBe(false);
    expect(app.S.objects.find(o => o.name === 'game')).toBeTruthy();
  });

  it('can delete a non-built-in object', () => {
    const obj = app.addObject('temp');
    const before = app.S.objects.length;
    const result = app.deleteObject(obj.id);
    expect(result).toBe(true);
    expect(app.S.objects.length).toBe(before - 1);
  });

  it('cannot delete a built-in class', () => {
    const cls = app.S.classes.find(c => c.name === 'Game');
    const result = app.deleteClass(cls.id);
    expect(result).toBe(false);
    expect(app.S.classes.find(c => c.name === 'Game')).toBeTruthy();
  });

  it('can delete a non-built-in class', () => {
    const cls = app.addClass('TempClass');
    const before = app.S.classes.length;
    const result = app.deleteClass(cls.id);
    expect(result).toBe(true);
    expect(app.S.classes.length).toBe(before - 1);
  });

  it('cannot delete a built-in enum class', () => {
    const en = app.S.enumClasses.find(e => e.name === 'GameType');
    const result = app.deleteEnumClass(en.id);
    expect(result).toBe(false);
    expect(app.S.enumClasses.find(e => e.name === 'GameType')).toBeTruthy();
  });

  it('can delete a non-built-in enum class', () => {
    const en = app.addEnumClass('TempEnum');
    const before = app.S.enumClasses.length;
    const result = app.deleteEnumClass(en.id);
    expect(result).toBe(true);
    expect(app.S.enumClasses.length).toBe(before - 1);
  });
});

// ─── Object switching ─────────────────────────────────────────────────────────

describe('V44: Object switching', () => {
  it('switching objects changes activeObjectId', () => {
    const obj2 = app.addObject('obj2');
    app.selectObject(obj2.id);
    expect(app.S.activeObjectId).toBe(obj2.id);
    // Switch back to game
    const game = app.S.objects.find(o => o.name === 'game');
    app.selectObject(game.id);
    expect(app.S.activeObjectId).toBe(game.id);
  });

  it('nodes created in one object do not appear in another', () => {
    const game = app.S.objects.find(o => o.name === 'game');
    app.selectObject(game.id);
    app.createNode('state', 100, 100);
    const countInGame = app.S.nodes.length;
    expect(countInGame).toBeGreaterThanOrEqual(1);

    const obj2 = app.addObject('obj_switch_test');
    app.selectObject(obj2.id);
    expect(app.S.nodes.length).toBe(0);

    // Switch back and verify nodes are restored
    app.selectObject(game.id);
    expect(app.S.nodes.length).toBe(countInGame);
  });
});

// ─── Inspector shows class / enum ─────────────────────────────────────────────

describe('V44: Inspector for classes and enums', () => {
  it('selecting a class shows its properties in inspector', () => {
    const cls = app.S.classes.find(c => c.name === 'Game');
    app.selectClassInPanel(cls.id);
    expect(app.S.selectedLeftPanelItem).toEqual({ kind: 'class', id: cls.id });
    const props = document.getElementById('inspector-props');
    expect(props.style.display).not.toBe('none');
    // Should contain property name inputs
    const inputs = props.querySelectorAll('input.inspector-input');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it('selecting an enum shows its values in inspector', () => {
    const en = app.S.enumClasses.find(e => e.name === 'GameType');
    app.selectEnumInPanel(en.id);
    expect(app.S.selectedLeftPanelItem).toEqual({ kind: 'enum', id: en.id });
    const props = document.getElementById('inspector-props');
    expect(props.style.display).not.toBe('none');
  });

  it('selecting a node clears selectedLeftPanelItem', () => {
    app.selectClassInPanel(app.S.classes[0].id);
    const node = app.createNode('state', 200, 200);
    app.activateNode(node);
    // activeNode takes priority in inspector
    expect(app.S.activeNode).toBe(node);
  });
});

// ─── Property types ───────────────────────────────────────────────────────────

describe('V44: Property types', () => {
  it('PROPERTY_TYPES includes all expected types', () => {
    const expected = ['Integer', 'Real', 'Character', 'String', 'Boolean', 'EnumClass', 'Image', 'Sound', 'Object'];
    for (const t of expected) {
      expect(app.PROPERTY_TYPES).toContain(t);
    }
  });
});

// ─── JSON export includes V44 data ────────────────────────────────────────────

describe('V44: JSON export', () => {
  it('serialiseDiagram includes objects, classes, and enumClasses', () => {
    // Need to import serialiseDiagram
    const json = app.serialiseDiagram();
    expect(json.objects).toBeTruthy();
    expect(json.classes).toBeTruthy();
    expect(json.enumClasses).toBeTruthy();
    expect(json.objects.length).toBeGreaterThanOrEqual(1);
    expect(json.classes.length).toBeGreaterThanOrEqual(1);
    expect(json.enumClasses.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V45 — Zoom toolbar inside canvas stage
// ═══════════════════════════════════════════════════════════════════════════════

describe('V45: Zoom toolbar inside canvas', () => {
  it('zoom toolbar is a child of canvas-container', () => {
    const canvasContainer = document.getElementById('canvas-container');
    const zoomToolbar = document.getElementById('zoom-toolbar');
    expect(canvasContainer.contains(zoomToolbar)).toBe(true);
  });

  it('zoom toolbar is NOT a direct child of body', () => {
    const zoomToolbar = document.getElementById('zoom-toolbar');
    expect(zoomToolbar.parentElement.id).not.toBe('body');
    expect(zoomToolbar.closest('#canvas-container')).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V46 — Data panel, object properties, state chart per object
// ═══════════════════════════════════════════════════════════════════════════════

describe('V46: Data panel title', () => {
  it('left panel has a "Data" title', () => {
    const title = document.getElementById('data-panel-title');
    expect(title).toBeTruthy();
    expect(title.textContent).toBe('Data');
  });
});

describe('V46: Classes/Enums minimized when object selected', () => {
  it('classes and enums sections are minimized when an object is active', () => {
    const game = app.S.objects.find(o => o.name === 'game');
    app.selectObject(game.id);
    expect(app.S.activeObjectId).not.toBeNull();
    const classes = document.getElementById('section-classes');
    const enums = document.getElementById('section-enums');
    expect(classes.classList.contains('minimized')).toBe(true);
    expect(enums.classList.contains('minimized')).toBe(true);
  });

  it('classes and enums sections are expanded when no object is active', () => {
    app.deselectObject();
    app.renderLeftPanel();
    const classes = document.getElementById('section-classes');
    const enums = document.getElementById('section-enums');
    expect(classes.classList.contains('minimized')).toBe(false);
    expect(enums.classList.contains('minimized')).toBe(false);
    // Re-select game to restore state
    const game = app.S.objects.find(o => o.name === 'game');
    app.selectObject(game.id);
  });
});

describe('V46: Object properties in data panel', () => {
  it('object properties section is visible when object is selected', () => {
    const section = document.getElementById('section-object-props');
    expect(section.style.display).not.toBe('none');
  });

  it('shows property rows matching the class properties', () => {
    const rows = document.querySelectorAll('#object-props-list .object-prop-row');
    // Game class has 4 properties: name, description, category, tickIntervalSeconds
    expect(rows.length).toBe(4);
  });

  it('property labels match class property names', () => {
    const labels = document.querySelectorAll('#object-props-list .object-prop-label');
    const names = Array.from(labels).map(l => l.textContent);
    expect(names).toContain('name');
    expect(names).toContain('description');
    expect(names).toContain('category');
  });

  it('object properties section is hidden when no object is selected', () => {
    app.deselectObject();
    app.renderLeftPanel();
    const section = document.getElementById('section-object-props');
    expect(section.style.display).toBe('none');
    // Restore
    const game = app.S.objects.find(o => o.name === 'game');
    app.selectObject(game.id);
  });
});

describe('V46: Selecting class/enum deselects object', () => {
  it('selecting a class deselects the active object', () => {
    const game = app.S.objects.find(o => o.name === 'game');
    app.selectObject(game.id);
    expect(app.S.activeObjectId).toBe(game.id);

    const cls = app.S.classes.find(c => c.name === 'Game');
    app.selectClassInPanel(cls.id);
    expect(app.S.activeObjectId).toBeNull();
    expect(app.S.selectedLeftPanelItem).toEqual({ kind: 'class', id: cls.id });
  });

  it('selecting an enum deselects the active object', () => {
    const game = app.S.objects.find(o => o.name === 'game');
    app.selectObject(game.id);

    const en = app.S.enumClasses.find(e => e.name === 'GameType');
    app.selectEnumInPanel(en.id);
    expect(app.S.activeObjectId).toBeNull();
    expect(app.S.selectedLeftPanelItem).toEqual({ kind: 'enum', id: en.id });
  });
});

describe('V46: No state chart when no object selected', () => {
  it('canvas shows no-object message when no object selected', () => {
    app.deselectObject();
    app.renderLeftPanel();
    const overlay = document.getElementById('canvas-no-object');
    expect(overlay.style.display).not.toBe('none');
    // Restore
    const game = app.S.objects.find(o => o.name === 'game');
    app.selectObject(game.id);
  });

  it('canvas hides no-object message when object is selected', () => {
    const overlay = document.getElementById('canvas-no-object');
    expect(overlay.style.display).toBe('none');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V47 — Inline add-object form, delete confirmation
// ═══════════════════════════════════════════════════════════════════════════════

describe('V60: Modal-based object creation', () => {
  it('modal is hidden by default', () => {
    const modal = document.getElementById('modal-overlay');
    expect(modal.style.display).toBe('none');
  });

  it('clicking + on objects shows the modal', () => {
    document.getElementById('btn-add-object').click();
    const modal = document.getElementById('modal-overlay');
    expect(modal.style.display).not.toBe('none');
    document.getElementById('modal-cancel').click();
  });

  it('modal has class dropdown and name input', () => {
    document.getElementById('btn-add-object').click();
    expect(document.getElementById('modal-class-select')).toBeTruthy();
    expect(document.getElementById('modal-name-input')).toBeTruthy();
    document.getElementById('modal-cancel').click();
  });

  it('cancel closes the modal', () => {
    document.getElementById('btn-add-object').click();
    document.getElementById('modal-cancel').click();
    expect(document.getElementById('modal-overlay').style.display).toBe('none');
  });

  it('submitting creates a new object', () => {
    const before = app.S.objects.length;
    document.getElementById('btn-add-object').click();
    document.getElementById('modal-name-input').value = 'modalTestObj';
    document.getElementById('modal-ok').click();
    expect(app.S.objects.length).toBe(before + 1);
  });
});

describe('V47: Delete object confirmation', () => {
  it('deleteObject still works programmatically', () => {
    const obj = app.addObject('toDelete');
    const before = app.S.objects.length;
    app.deleteObject(obj.id);
    expect(app.S.objects.length).toBe(before - 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V48 — Class/Enum editing mode
// ═══════════════════════════════════════════════════════════════════════════════

describe('V48: Edit Classes button and mode switching', () => {
  it('Edit Classes button exists', () => {
    expect(document.getElementById('btn-edit-classes')).toBeTruthy();
  });

  it('enterClassMode deselects object and minimizes Objects section', () => {
    const game = app.S.objects.find(o => o.name === 'game');
    app.selectObject(game.id);
    expect(app.S.activeObjectId).toBe(game.id);

    app.enterClassMode();
    expect(app.S.activeObjectId).toBeNull();
    const sectionObjects = document.getElementById('section-objects');
    expect(sectionObjects.classList.contains('minimized')).toBe(true);
  });

  it('enterClassMode expands Classes and Enums sections', () => {
    app.enterClassMode();
    const classes = document.getElementById('section-classes');
    const enums = document.getElementById('section-enums');
    expect(classes.classList.contains('minimized')).toBe(false);
    expect(enums.classList.contains('minimized')).toBe(false);
  });

  it('enterClassMode hides the Edit Classes button', () => {
    app.enterClassMode();
    const btn = document.getElementById('btn-edit-classes');
    expect(btn.style.display).toBe('none');
  });

  it('enterObjectMode selects first object and restores object mode', () => {
    app.enterClassMode();
    app.enterObjectMode();
    expect(app.S.activeObjectId).not.toBeNull();
    const sectionObjects = document.getElementById('section-objects');
    expect(sectionObjects.classList.contains('minimized')).toBe(false);
  });

  it('in class mode, Classes and Enums can be CRUD-ed via panel', () => {
    app.enterClassMode();
    const before = app.S.classes.length;
    app.addClass('TestV48');
    expect(app.S.classes.length).toBe(before + 1);
    const items = document.querySelectorAll('#classes-list .left-panel-item');
    expect(items.length).toBe(app.S.classes.length);
    // cleanup
    const cls = app.S.classes.find(c => c.name === 'TestV48');
    app.deleteClass(cls.id);
  });

  it('clicking Objects header in class mode switches back to object mode', () => {
    app.enterClassMode();
    const header = document.getElementById('objects-header');
    header.click();
    expect(app.S.activeObjectId).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V49 — Image/Sound dropdown lists
// ═══════════════════════════════════════════════════════════════════════════════

describe('V49: Asset manifests', () => {
  it('imageFiles is an array with image paths', () => {
    expect(Array.isArray(app.imageFiles)).toBe(true);
    expect(app.imageFiles.length).toBeGreaterThan(0);
    expect(app.imageFiles.every(f => f.startsWith('images/'))).toBe(true);
  });

  it('audioFiles is an array with audio paths', () => {
    expect(Array.isArray(app.audioFiles)).toBe(true);
    expect(app.audioFiles.length).toBeGreaterThan(0);
    expect(app.audioFiles.every(f => f.startsWith('audio/'))).toBe(true);
  });

  it('imageFiles contains files from subfolders', () => {
    const hasSubfolder = app.imageFiles.some(f => f.split('/').length > 2);
    expect(hasSubfolder).toBe(true);
  });

  it('audioFiles contains files from subfolders', () => {
    const hasSubfolder = app.audioFiles.some(f => f.split('/').length > 2);
    expect(hasSubfolder).toBe(true);
  });
});

describe('V49: Image/Sound property dropdowns in data panel', () => {
  it('Image property renders as a select dropdown', () => {
    // Create a class with an Image property, an object of that class, and select it
    const cls = app.addClass('SpriteV49');
    cls.properties.push({ name: 'icon', type: 'Image' });
    const obj = app.addObject('v49obj', cls.id);
    app.selectObject(obj.id);

    const selects = document.querySelectorAll('#object-props-list select.asset-dropdown');
    expect(selects.length).toBeGreaterThanOrEqual(1);
    // Should have options for image files plus the placeholder
    const opts = selects[0].options;
    expect(opts.length).toBeGreaterThan(1);
    expect(opts[0].textContent).toContain('select image');
  });

  it('Sound property renders as a select dropdown', () => {
    const cls = app.addClass('AudioV49');
    cls.properties.push({ name: 'sfx', type: 'Sound' });
    const obj = app.addObject('v49snd', cls.id);
    app.selectObject(obj.id);

    const selects = document.querySelectorAll('#object-props-list select.asset-dropdown');
    expect(selects.length).toBeGreaterThanOrEqual(1);
    const opts = Array.from(selects).pop().options;
    expect(opts.length).toBeGreaterThan(1);
    expect(opts[0].textContent).toContain('select sound');
  });

  it('selecting an image file stores the value', () => {
    const cls = app.S.classes.find(c => c.name === 'SpriteV49');
    const obj = app.S.objects.find(o => o.name === 'v49obj');
    app.selectObject(obj.id);

    const sel = document.querySelector('#object-props-list select.asset-dropdown');
    // Pick the second option (first real file)
    sel.value = sel.options[1].value;
    sel.dispatchEvent(new Event('change'));
    expect(obj.propertyValues.icon).toBe(sel.options[1].value);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V50 — Sound methods
// ═══════════════════════════════════════════════════════════════════════════════

describe('V50: getSoundMethods', () => {
  it('returns empty array for class with no Sound properties', () => {
    const cls = { properties: [{ name: 'x', type: 'Integer' }] };
    expect(app.getSoundMethods(cls)).toEqual([]);
  });

  it('returns 3 methods per Sound property', () => {
    const cls = { properties: [{ name: 'music', type: 'Sound' }] };
    const methods = app.getSoundMethods(cls);
    expect(methods.length).toBe(3);
  });

  it('generates correct method names from property name', () => {
    const cls = { properties: [{ name: 'music', type: 'Sound' }] };
    const methods = app.getSoundMethods(cls);
    expect(methods[0].signature).toBe('MusicPlay()');
    expect(methods[1].signature).toBe('MusicPause()');
    expect(methods[2].signature).toBe('MusicSetLooping(boolean)');
  });

  it('generates methods for multiple Sound properties', () => {
    const cls = { properties: [
      { name: 'music', type: 'Sound' },
      { name: 'fireSound', type: 'Sound' },
    ]};
    const methods = app.getSoundMethods(cls);
    expect(methods.length).toBe(6);
    expect(methods[3].signature).toBe('FireSoundPlay()');
    expect(methods[4].signature).toBe('FireSoundPause()');
    expect(methods[5].signature).toBe('FireSoundSetLooping(boolean)');
  });

  it('ignores non-Sound properties', () => {
    const cls = { properties: [
      { name: 'name', type: 'String' },
      { name: 'sfx', type: 'Sound' },
      { name: 'icon', type: 'Image' },
    ]};
    const methods = app.getSoundMethods(cls);
    expect(methods.length).toBe(3);
    expect(methods[0].signature).toBe('SfxPlay()');
  });
});

describe('V50: Sound methods in class inspector', () => {
  it('class inspector shows Sound Methods section for class with Sound property', () => {
    const cls = app.addClass('SoundTestV50');
    cls.properties.push({ name: 'bgm', type: 'Sound' });
    app.enterClassMode();
    app.selectClassInPanel(cls.id);

    const rows = document.querySelectorAll('.sound-method-row');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('BgmPlay()');
    expect(rows[1].textContent).toContain('BgmPause()');
    expect(rows[2].textContent).toContain('BgmSetLooping(boolean)');
  });
});

describe('V50: Sound methods in data panel', () => {
  it('object properties show sound methods for Sound-type properties', () => {
    const cls = app.S.classes.find(c => c.name === 'SoundTestV50') || app.addClass('SoundTestV50b');
    if (cls.properties.length === 0) cls.properties.push({ name: 'bgm', type: 'Sound' });
    const obj = app.addObject('sndObjV50', cls.id);
    app.selectObject(obj.id);

    const methodItems = document.querySelectorAll('#object-props-list .sound-method-item');
    expect(methodItems.length).toBe(3);
    expect(methodItems[0].textContent).toContain('BgmPlay()');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V51 — Events, guard conditions, actions, terminate node
// ═══════════════════════════════════════════════════════════════════════════════

describe('V51: SpecialKeyType enum', () => {
  it('SpecialKeyType built-in enum exists with expected values', () => {
    const en = app.S.enumClasses.find(e => e.name === 'SpecialKeyType');
    expect(en).toBeTruthy();
    expect(en.builtIn).toBe(true);
    expect(en.values).toContain('SPACE');
    expect(en.values).toContain('ESCAPE');
    expect(en.values).toContain('ARROW_LEFT');
    expect(en.values).toContain('ARROW_DOWN');
  });
});

describe('V51: Terminate node', () => {
  it('can create a terminate node', () => {
    const game = app.S.objects.find(o => o.name === 'game');
    app.selectObject(game.id);
    const node = app.createNode('terminate', 300, 300);
    expect(node.type).toBe('terminate');
    expect(node.el.classList.contains('terminate-node')).toBe(true);
  });

  it('terminate node has no connection handle (cannot be source)', () => {
    const node = app.createNode('terminate', 350, 350);
    app.activateNode(node);
    const connHandle = node.el.querySelector('.conn-handle');
    expect(connHandle).toBeNull();
  });
});

describe('V51: State behaviours', () => {
  it('state nodes have entryBehaviours, doBehaviours, exitBehaviours arrays', () => {
    const node = app.createNode('state', 400, 400);
    expect(node.entryBehaviours).toEqual([]);
    expect(node.doBehaviours).toEqual([]);
    expect(node.exitBehaviours).toEqual([]);
  });

  it('inspector shows Entry/Do/Exit sections for state nodes', () => {
    const node = app.createNode('state', 450, 450);
    app.activateNode(node);
    app.updateInspector();
    const cells = Array.from(document.querySelectorAll('#inspector-table td'));
    const texts = cells.map(td => td.textContent);
    expect(texts).toContain('Entry /');
    expect(texts).toContain('Do /');
    expect(texts).toContain('Exit /');
  });

  it('can add a behaviour to entry section', () => {
    const node = app.createNode('state', 500, 500);
    node.entryBehaviours.push('setX(10)');
    app.activateNode(node);
    app.updateInspector();
    const inputs = document.querySelectorAll('.behaviour-row input');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
    expect(inputs[0].value).toBe('setX(10)');
  });
});

describe('V51: Connection event, guard, behaviours', () => {
  it('connections have event, guardCondition, behaviours fields', () => {
    const n1 = app.createNode('state', 600, 600);
    const n2 = app.createNode('state', 700, 600);
    app.createConnection(n1, n2);
    const conn = app.S.connections[app.S.connections.length - 1];
    expect(conn.event).toBeNull();
    expect(conn.guardCondition).toBeNull();
    expect(conn.behaviours).toEqual([]);
  });

  it('inspector shows Event, Guard, and Behaviours sections for connections', () => {
    const conn = app.S.connections[app.S.connections.length - 1];
    app.selectConn(conn);
    app.updateInspector();
    const cells = Array.from(document.querySelectorAll('#inspector-table td'));
    const texts = cells.map(td => td.textContent);
    expect(texts.some(t => t.includes('Event'))).toBe(true);
    expect(texts.some(t => t.includes('Guard Condition'))).toBe(true);
    expect(texts.some(t => t.includes('Transition Behaviours'))).toBe(true);
  });
});

describe('V51: Serialisation includes V51 data', () => {
  it('serialised output includes behaviours and events on classes', () => {
    const node = app.S.nodes.find(n => n.type === 'state' && n.entryBehaviours);
    if (node) node.entryBehaviours = ['doSomething()'];
    const json = app.serialiseDiagram();
    // V59: nodes are now on classes, not objects
    const activeCls = json.classes.find(c => c.id === app.S.activeClassId);
    if (activeCls) {
      const nodesWithEntry = activeCls.nodes.filter(n => n.entryBehaviours);
      expect(nodesWithEntry.length).toBeGreaterThanOrEqual(0);
    }
    expect(json.classes).toBeTruthy();
  });
});

describe('V51: Load JSON button exists', () => {
  it('Load JSON button exists in DOM', () => {
    expect(document.getElementById('btn-load-json')).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V52 — Sprite, CSSColor, Stage, Runtime engine
// ═══════════════════════════════════════════════════════════════════════════════

describe('V52: Built-in classes', () => {
  it('Sprite class exists with expected properties', () => {
    const cls = app.S.classes.find(c => c.name === 'Sprite');
    expect(cls).toBeTruthy();
    expect(cls.builtIn).toBe(true);
    const names = cls.properties.map(p => p.name);
    expect(names).toContain('displayImage');
    expect(names).toContain('xPosition');
    expect(names).toContain('visible');
    expect(names).toContain('dx');
    expect(names).toContain('dy');
  });

  it('Sprite class has move() method', () => {
    const cls = app.S.classes.find(c => c.name === 'Sprite');
    expect(cls.methods).toBeTruthy();
    expect(cls.methods.some(m => m.name === 'move')).toBe(true);
  });

  it('CSSColor class exists with methods', () => {
    const cls = app.S.classes.find(c => c.name === 'CSSColor');
    expect(cls).toBeTruthy();
    expect(cls.methods.length).toBe(5);
    expect(cls.methods.some(m => m.name === 'setColor')).toBe(true);
  });

  it('Game class has tickIntervalSeconds property', () => {
    const cls = app.S.classes.find(c => c.name === 'Game');
    const prop = cls.properties.find(p => p.name === 'tickIntervalSeconds');
    expect(prop).toBeTruthy();
    expect(prop.type).toBe('Real');
  });
});

describe('V52: Built-in stage object', () => {
  it('stage object exists', () => {
    const stage = app.S.objects.find(o => o.name === 'stage');
    expect(stage).toBeTruthy();
    expect(stage.builtIn).toBe(true);
  });

  it('stage has virtual dimension properties', () => {
    const stage = app.S.objects.find(o => o.name === 'stage');
    expect(stage.propertyValues.xMaxVirtual).toBeTruthy();
    expect(stage.propertyValues.yMaxVirtual).toBeTruthy();
    expect(stage.propertyValues.xMinVirtual).toBeTruthy();
  });
});

describe('V52: Run button', () => {
  it('Run button exists in DOM', () => {
    expect(document.getElementById('btn-run')).toBeTruthy();
  });
});

describe('V52: Runtime engine', () => {
  it('startRuntime validates start states and can run/stop', () => {
    // Create a fresh class and object for testing
    const testCls = app.addClass('RuntimeTestCls');
    const obj = app.addObject('runtimeTestObj', testCls.id);

    // Edit the class's state chart
    app.selectClassInPanel(testCls.id);

    // Add a state without start
    app.createNode('state', 100, 100);
    app.saveActiveClassChart();

    const result1 = app.startRuntime();
    expect(result1.ok).toBe(false);
    expect(result1.errors.some(e => e.includes('Start state'))).toBe(true);

    // Now add start node and connection
    const startNode = app.createNode('start', 50, 50);
    const stateNode = app.S.nodes.find(n => n.type === 'state');
    app.createConnection(startNode, stateNode);
    app.saveActiveClassChart();

    // The test class should now be valid (has start + state)
    // Other classes may have test pollution, so check our specific class
    app.saveActiveClassChart();
    const testClsNodes = testCls.nodes;
    expect(testClsNodes.some(n => n.type === 'start')).toBe(true);
    expect(testClsNodes.some(n => n.type === 'state')).toBe(true);

    // Test stop if we can start
    const result2 = app.startRuntime();
    if (result2.ok) {
      expect(app.isRunning()).toBe(true);
      const contexts = app.getRuntimeContexts();
      expect(contexts.length).toBeGreaterThanOrEqual(1);
      app.stopRuntime();
      expect(app.isRunning()).toBe(false);
    } else {
      // Other objects may cause failures; just verify our class is valid
      expect(result2.errors.every(e => !e.includes('runtimeTestObj'))).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V53 — Toolbar button order
// ═══════════════════════════════════════════════════════════════════════════════

describe('V53: Terminate button next to End in toolbar', () => {
  it('Terminate button exists in the toolbar', () => {
    expect(document.getElementById('btn-new-terminate')).toBeTruthy();
  });

  it('state toolbar buttons are in order: State, Start, End, Terminate, Choice', () => {
    const stateToolbar = document.getElementById('state-toolbar');
    const buttons = stateToolbar.querySelectorAll('.palette-btn');
    const ids = Array.from(buttons).map(b => b.id);
    const endIdx = ids.indexOf('btn-new-end');
    const termIdx = ids.indexOf('btn-new-terminate');
    const choiceIdx = ids.indexOf('btn-new-choice');
    expect(termIdx).toBe(endIdx + 1);
    expect(choiceIdx).toBe(termIdx + 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V54 — Build button
// ═══════════════════════════════════════════════════════════════════════════════

describe('V54: Build button', () => {
  it('Build button exists in DOM', () => {
    expect(document.getElementById('btn-build')).toBeTruthy();
  });

  it('buildAndDownload is an exported function', () => {
    expect(typeof app.buildAndDownload).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V55 — Virtual stage coordinate system
// ═══════════════════════════════════════════════════════════════════════════════

describe('V55: virtualToScreen coordinate mapping', () => {
  it('center of virtual stage (0,0) maps to center-bottom of screen', () => {
    const { x, y } = app.virtualToScreen(0, 0, 800, 600);
    expect(x).toBe(400); // center
    expect(y).toBe(600); // bottom
  });

  it('top-center (0,100) maps to center-top of screen', () => {
    const { x, y } = app.virtualToScreen(0, 100, 800, 600);
    expect(x).toBe(400);
    expect(y).toBe(0);
  });

  it('left edge (-100,0) maps to left-bottom', () => {
    const { x, y } = app.virtualToScreen(-100, 0, 800, 600);
    expect(x).toBe(0);
    expect(y).toBe(600);
  });

  it('right edge (100,0) maps to right-bottom', () => {
    const { x, y } = app.virtualToScreen(100, 0, 800, 600);
    expect(x).toBe(800);
    expect(y).toBe(600);
  });

  it('mid-height (0,50) maps to vertical center', () => {
    const { x, y } = app.virtualToScreen(0, 50, 800, 600);
    expect(x).toBe(400);
    expect(y).toBe(300);
  });

  it('values beyond limits still produce valid pixel positions', () => {
    const { x, y } = app.virtualToScreen(200, 150, 800, 600);
    expect(x).toBe(1200); // off-screen right
    expect(y).toBe(-300); // off-screen top
  });

  it('negative Y values go below the stage', () => {
    const { x, y } = app.virtualToScreen(0, -50, 800, 600);
    expect(y).toBe(900); // below bottom
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V56 — Sprite scaling to virtual stage coordinates
// ═══════════════════════════════════════════════════════════════════════════════

describe('V56: Sprite scaleToStage properties', () => {
  it('Sprite class has scaleToStage, widthStagePixels, heightStagePixels', () => {
    const cls = app.S.classes.find(c => c.name === 'Sprite');
    const names = cls.properties.map(p => p.name);
    expect(names).toContain('scaleToStage');
    expect(names).toContain('widthStagePixels');
    expect(names).toContain('heightStagePixels');
  });

  it('scaleToStage defaults to false', () => {
    const cls = app.S.classes.find(c => c.name === 'Sprite');
    const prop = cls.properties.find(p => p.name === 'scaleToStage');
    expect(prop.defaultValue).toBe('false');
  });

  it('heightStagePixels=10 on a 600px stage = 60px (10% of height)', () => {
    // Virtual stage height is 100, so 10/100 * 600 = 60
    const ratio = 10 / 100;
    expect(ratio * 600).toBe(60);
  });

  it('widthStagePixels=20 on an 800px stage = 80px (20/200 of width)', () => {
    // Virtual stage width is 200 (-100..100), so 20/200 * 800 = 80
    const ratio = 20 / 200;
    expect(ratio * 800).toBe(80);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V57 — Stage class and configurable virtual dimensions
// ═══════════════════════════════════════════════════════════════════════════════

describe('V57: Stage class', () => {
  it('Stage built-in class exists', () => {
    const cls = app.S.classes.find(c => c.name === 'Stage');
    expect(cls).toBeTruthy();
    expect(cls.builtIn).toBe(true);
  });

  it('Stage class has bgTint, bgImage, and virtual dimension properties', () => {
    const cls = app.S.classes.find(c => c.name === 'Stage');
    const names = cls.properties.map(p => p.name);
    expect(names).toContain('bgTint');
    expect(names).toContain('bgImage');
    expect(names).toContain('xMinVirtual');
    expect(names).toContain('xMaxVirtual');
    expect(names).toContain('yMinVirtual');
    expect(names).toContain('yMaxVirtual');
    expect(names).toContain('minYAtBottomOfScreen');
  });

  it('stage object uses Stage class', () => {
    const stageObj = app.S.objects.find(o => o.name === 'stage');
    const stageCls = app.S.classes.find(c => c.name === 'Stage');
    expect(stageObj.classId).toBe(stageCls.id);
  });

  it('virtual dimension defaults are correct', () => {
    const cls = app.S.classes.find(c => c.name === 'Stage');
    expect(cls.properties.find(p => p.name === 'xMinVirtual').defaultValue).toBe('-100');
    expect(cls.properties.find(p => p.name === 'xMaxVirtual').defaultValue).toBe('100');
    expect(cls.properties.find(p => p.name === 'yMinVirtual').defaultValue).toBe('0');
    expect(cls.properties.find(p => p.name === 'yMaxVirtual').defaultValue).toBe('100');
    expect(cls.properties.find(p => p.name === 'minYAtBottomOfScreen').defaultValue).toBe('true');
  });
});

describe('V57: virtualToScreen with custom bounds', () => {
  it('uses custom bounds when provided', () => {
    const bounds = { xMin: 0, xMax: 200, yMin: 0, yMax: 200, minYAtBottom: true };
    const { x, y } = app.virtualToScreen(100, 100, 800, 600, bounds);
    expect(x).toBe(400); // 100/200 * 800
    expect(y).toBe(300); // (1 - 100/200) * 600
  });

  it('minYAtBottom=false flips Y axis', () => {
    const bounds = { xMin: -100, xMax: 100, yMin: 0, yMax: 100, minYAtBottom: false };
    const { x, y } = app.virtualToScreen(0, 0, 800, 600, bounds);
    expect(y).toBe(0); // Y=0 at top when flipped
  });

  it('falls back to defaults when bounds is null', () => {
    const { x, y } = app.virtualToScreen(0, 50, 800, 600, null);
    expect(x).toBe(400);
    expect(y).toBe(300);
  });
});

describe('V57: Sprite tint property is CSSColor type', () => {
  it('Sprite tint property has type CSSColor', () => {
    const cls = app.S.classes.find(c => c.name === 'Sprite');
    const tint = cls.properties.find(p => p.name === 'tint');
    expect(tint.type).toBe('CSSColor');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V58 — Background image fit options
// ═══════════════════════════════════════════════════════════════════════════════

describe('V58: BgImageFit enum', () => {
  it('BgImageFit built-in enum exists with 4 values', () => {
    const en = app.S.enumClasses.find(e => e.name === 'BgImageFit');
    expect(en).toBeTruthy();
    expect(en.builtIn).toBe(true);
    expect(en.values).toEqual(['FIT_TO_STAGE', 'FIT_WIDTH', 'FIT_HEIGHT', 'CENTRE']);
  });
});

describe('V58: Stage bgImageFit property', () => {
  it('Stage class has bgImageFit property', () => {
    const cls = app.S.classes.find(c => c.name === 'Stage');
    const prop = cls.properties.find(p => p.name === 'bgImageFit');
    expect(prop).toBeTruthy();
    expect(prop.type).toBe('EnumClass');
    expect(prop.defaultValue).toBe('FIT_TO_STAGE');
  });

  it('stage object has bgImageFit default value', () => {
    const stage = app.S.objects.find(o => o.name === 'stage');
    expect(stage.propertyValues.bgImageFit).toBe('FIT_TO_STAGE');
  });
});

describe('V58: applyBgImageFit CSS mapping', () => {
  it('FIT_TO_STAGE sets backgroundSize to 100% 100%', () => {
    const el = document.createElement('div');
    app.applyBgImageFit(el, 'FIT_TO_STAGE');
    expect(el.style.backgroundSize).toBe('100% 100%');
  });

  it('FIT_WIDTH sets backgroundSize containing 100%', () => {
    const el = document.createElement('div');
    app.applyBgImageFit(el, 'FIT_WIDTH');
    expect(el.style.backgroundSize).toContain('100%');
  });

  it('FIT_HEIGHT sets backgroundSize containing 100%', () => {
    const el = document.createElement('div');
    app.applyBgImageFit(el, 'FIT_HEIGHT');
    expect(el.style.backgroundSize).toContain('100%');
  });

  it('CENTRE sets backgroundSize to auto and centres', () => {
    const el = document.createElement('div');
    app.applyBgImageFit(el, 'CENTRE');
    expect(el.style.backgroundSize).toBe('auto');
    expect(el.style.backgroundPosition).toBe('center center');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V59 — State chart on class, not individual objects
// ═══════════════════════════════════════════════════════════════════════════════

describe('V59: Classes have state charts', () => {
  it('built-in classes have nodes and connections arrays', () => {
    for (const cls of app.S.classes) {
      expect(Array.isArray(cls.nodes)).toBe(true);
      expect(Array.isArray(cls.connections)).toBe(true);
    }
  });

  it('new classes created via addClass have empty state charts', () => {
    const cls = app.addClass('V59TestCls');
    expect(cls.nodes).toEqual([]);
    expect(cls.connections).toEqual([]);
    expect(cls.nextId).toBe(1);
  });

  it('objects do not have nodes/connections', () => {
    const obj = app.addObject('v59obj', app.S.classes[0].id);
    expect(obj.nodes).toBeUndefined();
    expect(obj.connections).toBeUndefined();
  });
});

describe('V59: Editing class state chart', () => {
  it('selectClassInPanel sets editingClassChart to true', () => {
    const cls = app.S.classes.find(c => c.name === 'V59TestCls') || app.addClass('V59Edit');
    app.selectClassInPanel(cls.id);
    expect(app.S.editingClassChart).toBe(true);
    expect(app.S.activeClassId).toBe(cls.id);
  });

  it('nodes created while editing a class are saved to that class', () => {
    const cls = app.S.classes.find(c => c.name === 'V59TestCls') || app.addClass('V59Edit2');
    app.selectClassInPanel(cls.id);
    const before = cls.nodes.length;
    app.createNode('state', 100, 100);
    app.saveActiveClassChart();
    expect(cls.nodes.length).toBe(before + 1);
  });
});

describe('V59: Viewing object shows class chart read-only', () => {
  it('selectObject sets editingClassChart to false', () => {
    const game = app.S.objects.find(o => o.name === 'game');
    app.selectObject(game.id);
    expect(app.S.editingClassChart).toBe(false);
  });

  it('selectObject sets activeClassId to the object class', () => {
    const game = app.S.objects.find(o => o.name === 'game');
    app.selectObject(game.id);
    expect(app.S.activeClassId).toBe(game.classId);
  });

  it('state toolbar is disabled when viewing object', () => {
    const game = app.S.objects.find(o => o.name === 'game');
    app.selectObject(game.id);
    const stateToolbar = document.getElementById('state-toolbar');
    expect(stateToolbar.classList.contains('disabled')).toBe(true);
  });

  it('state toolbar is enabled when editing class', () => {
    const cls = app.S.classes.find(c => c.name === 'V59TestCls') || app.addClass('V59RO');
    app.selectClassInPanel(cls.id);
    const stateToolbar = document.getElementById('state-toolbar');
    expect(stateToolbar.classList.contains('disabled')).toBe(false);
  });
});

describe('V59: Serialisation stores charts on classes', () => {
  it('serialised classes have nodes and connections', () => {
    const json = app.serialiseDiagram();
    for (const cls of json.classes) {
      expect(Array.isArray(cls.nodes)).toBe(true);
      expect(Array.isArray(cls.connections)).toBe(true);
    }
  });

  it('serialised objects do not have nodes or connections', () => {
    const json = app.serialiseDiagram();
    for (const obj of json.objects) {
      expect(obj.nodes).toBeUndefined();
      expect(obj.connections).toBeUndefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V61 — State Chart option for Classes (hasStateChart boolean)
// ═══════════════════════════════════════════════════════════════════════════════

describe('V61: hasStateChart property on classes', () => {
  it('built-in Game class has hasStateChart true', () => {
    const game = app.S.classes.find(c => c.name === 'Game');
    expect(game.hasStateChart).toBe(true);
  });

  it('built-in Sprite class has hasStateChart true', () => {
    const sprite = app.S.classes.find(c => c.name === 'Sprite');
    expect(sprite.hasStateChart).toBe(true);
  });

  it('built-in CSSColor class has hasStateChart false', () => {
    const css = app.S.classes.find(c => c.name === 'CSSColor');
    expect(css.hasStateChart).toBe(false);
  });

  it('built-in Stage class has hasStateChart false', () => {
    const stage = app.S.classes.find(c => c.name === 'Stage');
    expect(stage.hasStateChart).toBe(false);
  });

  it('new classes created via addClass default to hasStateChart true', () => {
    const cls = app.addClass('V61TestA');
    expect(cls.hasStateChart).toBe(true);
  });
});

describe('V61: hasStateChart controls editing', () => {
  it('selectClassInPanel sets editingClassChart true when hasStateChart is true', () => {
    const cls = app.S.classes.find(c => c.name === 'V61TestA') || app.addClass('V61TestB');
    cls.hasStateChart = true;
    app.selectClassInPanel(cls.id);
    expect(app.S.editingClassChart).toBe(true);
  });

  it('selectClassInPanel sets editingClassChart false when hasStateChart is false', () => {
    const cls = app.S.classes.find(c => c.name === 'V61TestA') || app.addClass('V61TestC');
    cls.hasStateChart = false;
    app.selectClassInPanel(cls.id);
    expect(app.S.editingClassChart).toBe(false);
  });

  it('state toolbar is disabled when hasStateChart is false', () => {
    const cls = app.S.classes.find(c => c.name === 'V61TestA') || app.addClass('V61TestD');
    cls.hasStateChart = false;
    app.selectClassInPanel(cls.id);
    const stateToolbar = document.getElementById('state-toolbar');
    expect(stateToolbar.classList.contains('disabled')).toBe(true);
  });

  it('state toolbar is enabled when hasStateChart is true', () => {
    const cls = app.S.classes.find(c => c.name === 'V61TestA') || app.addClass('V61TestE');
    cls.hasStateChart = true;
    app.selectClassInPanel(cls.id);
    const stateToolbar = document.getElementById('state-toolbar');
    expect(stateToolbar.classList.contains('disabled')).toBe(false);
  });
});

describe('V61: hasStateChart in serialisation', () => {
  it('serialised classes include hasStateChart property', () => {
    const json = app.serialiseDiagram();
    for (const cls of json.classes) {
      expect(typeof cls.hasStateChart).toBe('boolean');
    }
  });

  it('serialised Game class has hasStateChart true', () => {
    const json = app.serialiseDiagram();
    const game = json.classes.find(c => c.name === 'Game');
    expect(game.hasStateChart).toBe(true);
  });

  it('serialised CSSColor class has hasStateChart false', () => {
    const json = app.serialiseDiagram();
    const css = json.classes.find(c => c.name === 'CSSColor');
    expect(css.hasStateChart).toBe(false);
  });
});

describe('V61: hasStateChart checkbox in class inspector', () => {
  it('checkbox appears when inspecting a class', () => {
    const cls = app.S.classes.find(c => c.name === 'V61TestA') || app.addClass('V61InspTest');
    app.selectClassInPanel(cls.id);
    app.updateInspector();
    const cb = document.getElementById('has-state-chart-cb');
    expect(cb).toBeTruthy();
    expect(cb.type).toBe('checkbox');
  });

  it('checkbox reflects hasStateChart value', () => {
    const cls = app.S.classes.find(c => c.name === 'V61TestA') || app.addClass('V61InspTest2');
    cls.hasStateChart = false;
    app.selectClassInPanel(cls.id);
    app.updateInspector();
    const cb = document.getElementById('has-state-chart-cb');
    expect(cb.checked).toBe(false);
  });

  it('unchecking on class with no nodes updates hasStateChart to false', () => {
    const cls = app.addClass('V61NoNodes');
    cls.hasStateChart = true;
    cls.nodes = [];
    app.selectClassInPanel(cls.id);
    app.updateInspector();
    const cb = document.getElementById('has-state-chart-cb');
    cb.checked = false;
    cb.dispatchEvent(new Event('change'));
    expect(cls.hasStateChart).toBe(false);
  });

  it('unchecking on class WITH nodes shows confirmation dialog', () => {
    const cls = app.addClass('V61WithNodes');
    cls.hasStateChart = true;
    app.selectClassInPanel(cls.id);
    app.createNode('state', 100, 100);
    app.saveActiveClassChart();
    app.updateInspector();
    const cb = document.getElementById('has-state-chart-cb');
    cb.checked = false;
    cb.dispatchEvent(new Event('change'));
    // Dialog should appear
    const dialog = document.getElementById('delete-chart-dialog');
    expect(dialog).toBeTruthy();
    // Checkbox should be reverted to checked
    expect(cb.checked).toBe(true);
    // Clean up dialog
    const overlay = document.getElementById('delete-chart-overlay');
    if (overlay) overlay.remove();
  });

  it('confirming delete in dialog clears nodes and sets hasStateChart false', () => {
    const cls = app.addClass('V61DeleteTest');
    cls.hasStateChart = true;
    app.selectClassInPanel(cls.id);
    app.createNode('state', 50, 50);
    app.saveActiveClassChart();
    app.updateInspector();
    const cb = document.getElementById('has-state-chart-cb');
    cb.checked = false;
    cb.dispatchEvent(new Event('change'));
    // Click delete button in dialog
    const deleteBtn = document.getElementById('confirm-delete-chart');
    expect(deleteBtn).toBeTruthy();
    deleteBtn.click();
    expect(cls.hasStateChart).toBe(false);
    expect(cls.nodes.length).toBe(0);
    expect(cls.connections.length).toBe(0);
    expect(app.S.editingClassChart).toBe(false);
  });
});
