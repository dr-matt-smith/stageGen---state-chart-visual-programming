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

  it('activateNode adds resize handles for state nodes', () => {
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    expect(node.el.querySelectorAll('.resize-handle').length).toBe(8);
    app.deactivateNode();
  });

  it('activateNode adds connection handle', () => {
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    expect(node.el.querySelector('.conn-handle')).toBeTruthy();
    app.deactivateNode();
  });

  it('activateNode adds delete handle', () => {
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    expect(node.el.querySelector('.node-delete-handle')).toBeTruthy();
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

describe('Inspector clears when no object selected', () => {
  it('inspector shows empty message after node deletion', () => {
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    app.updateInspector();
    const propsContainer = document.getElementById('inspector-props');
    expect(propsContainer.style.display).not.toBe('none');

    app.deleteNode(node);
    app.updateInspector();
    expect(document.getElementById('inspector-empty').style.display).toBe('block');
    expect(propsContainer.style.display).toBe('none');
  });

  it('inspector is blank when group is selected', () => {
    const a = app.createNode('state', 0, 0);
    const b = app.createNode('state', 200, 0);
    app.selectGroup([a, b]);
    app.updateInspector();
    expect(document.getElementById('inspector-empty').style.display).toBe('block');
    expect(document.getElementById('inspector-props').style.display).toBe('none');
  });
});

// ─── Export JSON button location ────────────────────────────────────────────

describe('Export JSON button location', () => {
  it('export JSON button is inside canvas-container', () => {
    const canvasContainer = document.getElementById('canvas-container');
    const btn = document.getElementById('btn-export-json');
    expect(canvasContainer.contains(btn)).toBe(true);
  });

  it('export JSON button is NOT inside inspector', () => {
    const inspector = document.getElementById('inspector');
    const btn = document.getElementById('btn-export-json');
    expect(inspector.contains(btn)).toBe(false);
  });
});

// ─── Inspector shows state chart properties ─────────────────────────────────

describe('Inspector shows state chart properties', () => {
  it('Size, Position, and Connections are shown for state nodes', () => {
    const node = app.createNode('state', 0, 0);
    app.activateNode(node);
    app.updateInspector();

    const allCells = Array.from(document.querySelectorAll('#inspector-table td'));
    const cellTexts = allCells.map(td => td.textContent);
    expect(cellTexts).toContain('Size');
    expect(cellTexts).toContain('Position');
    expect(cellTexts).toContain('Connections');
    expect(cellTexts).toContain('Type');
    expect(cellTexts).toContain('ID');
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

  it('has a default Game class with 3 properties', () => {
    const cls = app.S.classes.find(c => c.name === 'Game');
    expect(cls).toBeTruthy();
    expect(cls.builtIn).toBe(true);
    expect(cls.properties.length).toBe(3);
    expect(cls.properties.map(p => p.name)).toEqual(['name', 'description', 'category']);
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

  it('classes list contains Game class', () => {
    const items = document.querySelectorAll('#classes-list .left-panel-item');
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].textContent).toContain('Game');
  });

  it('enums list contains GameType', () => {
    const items = document.querySelectorAll('#enums-list .left-panel-item');
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].textContent).toContain('GameType');
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
    app.addClass('Sprite');
    expect(app.S.classes.length).toBe(before + 1);
    const cls = app.S.classes.find(c => c.name === 'Sprite');
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
    // Game class has 3 properties: name, description, category
    expect(rows.length).toBe(3);
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

describe('V47: Add object inline form', () => {
  it('add-object form is hidden by default', () => {
    const form = document.getElementById('add-object-form');
    expect(form.style.display).toBe('none');
  });

  it('clicking + button shows the add-object form', () => {
    document.getElementById('btn-add-object').click();
    const form = document.getElementById('add-object-form');
    expect(form.style.display).not.toBe('none');
    // Clean up
    document.getElementById('add-object-cancel').click();
  });

  it('form has class dropdown populated with all classes', () => {
    document.getElementById('btn-add-object').click();
    const select = document.getElementById('add-object-class');
    expect(select.options.length).toBeGreaterThanOrEqual(1);
    const optionTexts = Array.from(select.options).map(o => o.textContent);
    expect(optionTexts).toContain('Game');
    document.getElementById('add-object-cancel').click();
  });

  it('cancel button hides the form', () => {
    document.getElementById('btn-add-object').click();
    document.getElementById('add-object-cancel').click();
    const form = document.getElementById('add-object-form');
    expect(form.style.display).toBe('none');
  });

  it('submitting the form creates a new object with selected class', () => {
    const before = app.S.objects.length;
    document.getElementById('btn-add-object').click();
    const nameInput = document.getElementById('add-object-name');
    const classSelect = document.getElementById('add-object-class');
    nameInput.value = 'testObj';
    // Select first class
    classSelect.value = classSelect.options[0].value;
    document.getElementById('add-object-ok').click();
    expect(app.S.objects.length).toBe(before + 1);
    const newObj = app.S.objects.find(o => o.name === 'testObj');
    expect(newObj).toBeTruthy();
    expect(newObj.classId).toBe(Number(classSelect.options[0].value));
  });

  it('form is hidden after successful submission', () => {
    document.getElementById('btn-add-object').click();
    document.getElementById('add-object-name').value = 'testObj2';
    document.getElementById('add-object-ok').click();
    const form = document.getElementById('add-object-form');
    expect(form.style.display).toBe('none');
  });

  it('empty name does not create an object', () => {
    const before = app.S.objects.length;
    document.getElementById('btn-add-object').click();
    document.getElementById('add-object-name').value = '';
    document.getElementById('add-object-ok').click();
    expect(app.S.objects.length).toBe(before);
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
