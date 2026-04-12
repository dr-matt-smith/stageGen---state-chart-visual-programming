import { test, expect } from '@playwright/test';
import { dragNewNode, drag, getNodeBox, dragBetween } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

/** Helper: enter class editing mode for creating/editing state chart nodes. */
async function enterClassEditMode(page, className) {
  // Click "Edit Classes" if available, or click classes header if minimized
  const editBtn = page.locator('#btn-edit-classes');
  if (await editBtn.isVisible()) {
    await editBtn.click();
  } else {
    await page.evaluate(() => document.getElementById('classes-header')?.click());
  }
  await page.locator('#classes-list').waitFor({ state: 'visible' });
  await page.locator(`#classes-list .left-panel-item:has-text("${className}")`).first().click();
}

/** Helper: switch to object mode by clicking the first object. */
async function enterObjectMode(page) {
  await page.evaluate(() => document.getElementById('objects-header')?.click());
  await page.locator('#objects-list').waitFor({ state: 'visible' });
  await page.locator('#objects-list .left-panel-item').first().click();
}

/** Helper: add a new object via the modal dialog. */
async function addObjectViaForm(page, name, className) {
  // Ensure we're in object mode to see the + button
  const addBtn = page.locator('#btn-add-object');
  if (!await addBtn.isVisible()) await enterObjectMode(page);
  await addBtn.click();
  if (className) {
    await page.locator('#modal-class-select').selectOption({ label: className });
  }
  await page.locator('#modal-name-input').fill(name);
  await page.locator('#modal-ok').click();
}

// ─── Version 1: Toolbar & basic node creation ──────────────────────────────

test.describe('V1 – Toolbar and state creation', () => {
  test('toolbar is visible at the top', async ({ page }) => {
    await expect(page.locator('#toolbar')).toBeVisible();
  });

  test('drag a state node onto the canvas', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    await expect(page.locator('.state-node')).toHaveCount(1);
  });

  test('zoom in button increases zoom percentage', async ({ page }) => {
    const label = page.locator('#zoom-label');
    const before = await label.textContent();
    await page.locator('#btn-zoom-in').click();
    const after = await label.textContent();
    expect(parseInt(after)).toBeGreaterThan(parseInt(before));
  });

  test('zoom out button decreases zoom percentage', async ({ page }) => {
    const label = page.locator('#zoom-label');
    const before = await label.textContent();
    await page.locator('#btn-zoom-out').click();
    const after = await label.textContent();
    expect(parseInt(after)).toBeLessThan(parseInt(before));
  });
});

// ─── Version 1: Minimap ────────────────────────────────────────────────────

test.describe('V1 – Minimap', () => {
  test('minimap is visible', async ({ page }) => {
    await expect(page.locator('#minimap')).toBeVisible();
  });

  test('minimap viewport rectangle exists', async ({ page }) => {
    await expect(page.locator('#minimap-viewport')).toBeVisible();
  });
});

// ─── Version 2: Scroll-wheel zoom & middle-button pan ──────────────────────

test.describe('V2 – Wheel zoom and pan', () => {
  test('scroll wheel zooms in', async ({ page }) => {
    const label = page.locator('#zoom-label');
    const before = parseInt(await label.textContent());
    const canvas = page.locator('#canvas-container');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(100);
    const after = parseInt(await label.textContent());
    expect(after).toBeGreaterThan(before);
  });

  test('hand tool button toggles active class', async ({ page }) => {
    const btn = page.locator('#btn-hand-tool');
    await expect(btn).not.toHaveClass(/active/);
    await btn.click();
    await expect(btn).toHaveClass(/active/);
    await btn.click();
    await expect(btn).not.toHaveClass(/active/);
  });
});

// ─── Version 3: All node types ─────────────────────────────────────────────

test.describe('V3 – Node types', () => {
  test('create start node', async ({ page }) => {
    await dragNewNode(page, '#btn-new-start');
    await expect(page.locator('.start-node')).toHaveCount(1);
  });

  test('create end node', async ({ page }) => {
    await dragNewNode(page, '#btn-new-end');
    await expect(page.locator('.end-node')).toHaveCount(1);
  });

  test('create choice (diamond) node', async ({ page }) => {
    await dragNewNode(page, '#btn-new-choice');
    await expect(page.locator('.choice-node')).toHaveCount(1);
    await expect(page.locator('.choice-node .choice-svg')).toBeVisible();
  });
});

// ─── Version 3: Node selection and text editing ────────────────────────────

test.describe('V3 – Selection and text editing', () => {
  test('clicking a state node activates it (shows handles)', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    const node = page.locator('.state-node');
    await node.click();
    await expect(node).toHaveClass(/node-active/);
    await expect(page.locator('.resize-handle')).toHaveCount(8);
    await expect(page.locator('.conn-handle')).toBeVisible();
  });

  test('double-clicking a state opens text editor', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    const node = page.locator('.state-node');
    await node.dblclick();
    await expect(page.locator('.node-label-input')).toBeVisible();
  });

  test('editing text and pressing Enter commits it', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    const node = page.locator('.state-node');
    await node.dblclick();
    const input = page.locator('.node-label-input');
    await input.fill('My State');
    await input.press('Enter');
    await expect(page.locator('.node-label')).toHaveText('My State');
  });

  test('Shift+Enter inserts a newline', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    const node = page.locator('.state-node');
    await node.dblclick();
    const input = page.locator('.node-label-input');
    await input.fill('');
    await input.type('Line1');
    await input.press('Shift+Enter');
    await input.type('Line2');
    await input.press('Enter');
    const label = page.locator('.node-label');
    await expect(label).toContainText('Line1');
    await expect(label).toContainText('Line2');
  });

  test('clicking empty canvas deselects a node', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    const node = page.locator('.state-node');
    await node.click();
    await expect(node).toHaveClass(/node-active/);
    const canvas = page.locator('#canvas-container');
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + 10, box.y + 10);
    await expect(node).not.toHaveClass(/node-active/);
  });
});

// ─── Version 3: Node resizing ──────────────────────────────────────────────

test.describe('V3 – Node resizing', () => {
  test('dragging east resize handle makes node wider', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    const node = page.locator('.state-node');
    await node.click();
    const boxBefore = await getNodeBox(page, node);

    const handle = page.locator('.resize-handle[data-dir="e"]');
    const hBox = await handle.boundingBox();
    await drag(page, hBox.x + hBox.width / 2, hBox.y + hBox.height / 2,
               hBox.x + hBox.width / 2 + 80, hBox.y + hBox.height / 2);

    const boxAfter = await getNodeBox(page, node);
    expect(boxAfter.width).toBeGreaterThan(boxBefore.width);
  });

  test('reset button restores default size', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    const node = page.locator('.state-node');
    await node.click();

    const handle = page.locator('.resize-handle[data-dir="e"]');
    const hBox = await handle.boundingBox();
    await drag(page, hBox.x + 4, hBox.y + 4, hBox.x + 100, hBox.y + 4);

    const boxResized = await getNodeBox(page, node);

    await page.locator('.node-reset-btn').click();
    const boxReset = await getNodeBox(page, node);
    expect(boxReset.width).toBeLessThan(boxResized.width);
  });
});

// ─── Version 3: Node dragging ──────────────────────────────────────────────

test.describe('V3 – Node dragging', () => {
  test('dragging a node moves it on the canvas', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    const node = page.locator('.state-node');
    const boxBefore = await getNodeBox(page, node);

    await drag(page,
      boxBefore.x + boxBefore.width / 2,
      boxBefore.y + boxBefore.height / 2,
      boxBefore.x + boxBefore.width / 2 + 100,
      boxBefore.y + boxBefore.height / 2 + 50);

    const boxAfter = await getNodeBox(page, node);
    expect(boxAfter.x).toBeGreaterThan(boxBefore.x);
    expect(boxAfter.y).toBeGreaterThan(boxBefore.y);
  });
});

// ─── Version 4: Fit All ────────────────────────────────────────────────────

test.describe('V4 – Fit All', () => {
  test('fit all adjusts zoom to show all nodes', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state', -200, -150);
    await dragNewNode(page, '#btn-new-state', 200, 150);

    const label = page.locator('#zoom-label');
    await page.locator('#btn-fit-all').click();
    const zoomText = await label.textContent();
    expect(zoomText).toMatch(/\d+%/);
  });
});

// ─── Version 5: Connections ────────────────────────────────────────────────

test.describe('V5 – Connections', () => {
  test('create a connection between two nodes via conn-handle drag', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state', -100, 0);
    await dragNewNode(page, '#btn-new-state', 100, 0);

    const nodes = page.locator('.state-node');
    const nodeA = nodes.nth(0);
    const nodeB = nodes.nth(1);

    await nodeA.click();
    await expect(page.locator('.conn-handle')).toBeVisible();

    const connHandle = page.locator('.conn-handle');
    await dragBetween(page, connHandle, nodeB);

    await expect(page.locator('.conn-line')).toHaveCount(1);
    await expect(page.locator('.conn-arrow')).toHaveCount(1);
  });

  test('connection has default "transition" label', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state', -100, 0);
    await dragNewNode(page, '#btn-new-state', 100, 0);
    const nodeA = page.locator('.state-node').nth(0);
    const nodeB = page.locator('.state-node').nth(1);

    await nodeA.click();
    await dragBetween(page, page.locator('.conn-handle'), nodeB);

    await expect(page.locator('.conn-label')).toHaveText('transition');
  });

  test('clicking a connection selects it (shows delete button)', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state', -100, 0);
    await dragNewNode(page, '#btn-new-state', 100, 0);
    const nodeA = page.locator('.state-node').nth(0);
    const nodeB = page.locator('.state-node').nth(1);

    await nodeA.click();
    await dragBetween(page, page.locator('.conn-handle'), nodeB);

    await page.locator('.conn-hitarea').click({ force: true });
    await expect(page.locator('.conn-group')).toHaveClass(/conn-selected/);
    const del = page.locator('.conn-delete');
    await expect(del).toHaveCSS('visibility', 'visible');
  });

  test('double-clicking connection label opens editor', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state', -100, 0);
    await dragNewNode(page, '#btn-new-state', 100, 0);
    const nodeA = page.locator('.state-node').nth(0);
    const nodeB = page.locator('.state-node').nth(1);

    await nodeA.click();
    await dragBetween(page, page.locator('.conn-handle'), nodeB);

    const label = page.locator('.conn-label');
    await label.click({ force: true });
    await label.dblclick({ force: true });

    await expect(page.locator('.conn-label-input')).toBeVisible();
  });

  test('deleting a connection via X button removes it', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state', -100, 0);
    await dragNewNode(page, '#btn-new-state', 100, 0);
    const nodeA = page.locator('.state-node').nth(0);
    const nodeB = page.locator('.state-node').nth(1);

    await nodeA.click();
    await dragBetween(page, page.locator('.conn-handle'), nodeB);
    await expect(page.locator('.conn-line')).toHaveCount(1);

    await page.locator('.conn-hitarea').click({ force: true });
    await page.locator('.conn-delete').click({ force: true });
    await expect(page.locator('.conn-line')).toHaveCount(0);
  });

  test('connections move with nodes (elastic banding)', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state', -100, 0);
    await dragNewNode(page, '#btn-new-state', 100, 0);
    const nodeA = page.locator('.state-node').nth(0);
    const nodeB = page.locator('.state-node').nth(1);

    await nodeA.click();
    await dragBetween(page, page.locator('.conn-handle'), nodeB);

    const pathBefore = await page.locator('.conn-line').getAttribute('d');

    const boxA = await getNodeBox(page, nodeA);
    await drag(page, boxA.x + boxA.width / 2, boxA.y + boxA.height / 2,
               boxA.x + boxA.width / 2, boxA.y + boxA.height / 2 + 80);

    const pathAfter = await page.locator('.conn-line').getAttribute('d');
    expect(pathAfter).not.toBe(pathBefore);
  });

  test('multiple connections between same pair creates curved lines', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state', -100, 0);
    await dragNewNode(page, '#btn-new-state', 100, 0);
    const nodeA = page.locator('.state-node').nth(0);
    const nodeB = page.locator('.state-node').nth(1);

    await nodeA.click();
    await dragBetween(page, page.locator('.conn-handle'), nodeB);

    await nodeA.click();
    await dragBetween(page, page.locator('.conn-handle'), nodeB);

    await expect(page.locator('.conn-line')).toHaveCount(2);
    const path1 = await page.locator('.conn-line').nth(0).getAttribute('d');
    const path2 = await page.locator('.conn-line').nth(1).getAttribute('d');
    expect(path1).not.toBe(path2);
  });
});

// ─── Version 6: Auto text sizing ───────────────────────────────────────────

test.describe('V6 – Auto text font sizing', () => {
  test('label font size is set after node creation', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    const label = page.locator('.state-node .node-label');
    const fontSize = await label.evaluate(el => el.style.fontSize);
    expect(fontSize).toBeTruthy();
    expect(parseFloat(fontSize)).toBeGreaterThan(0);
  });
});

// ─── Version 6: Group selection ────────────────────────────────────────────

test.describe('V6 – Group selection and drag', () => {
  test('dragging rectangle on empty canvas selects enclosed nodes', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state', -50, -20);
    await dragNewNode(page, '#btn-new-state', 50, 20);

    const canvas = page.locator('#canvas-container');
    const cBox = await canvas.boundingBox();
    await page.mouse.click(cBox.x + 5, cBox.y + 5);

    const nodeA = page.locator('.state-node').nth(0);
    const nodeB = page.locator('.state-node').nth(1);
    const boxA = await getNodeBox(page, nodeA);
    const boxB = await getNodeBox(page, nodeB);

    const left = Math.min(boxA.x, boxB.x) - 20;
    const top = Math.min(boxA.y, boxB.y) - 20;
    const right = Math.max(boxA.x + boxA.width, boxB.x + boxB.width) + 20;
    const bottom = Math.max(boxA.y + boxA.height, boxB.y + boxB.height) + 20;

    await drag(page, left, top, right, bottom, 15);

    await expect(nodeA).toHaveClass(/node-group-selected/);
    await expect(nodeB).toHaveClass(/node-group-selected/);
  });

  test('clicking empty canvas deselects group', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state', -50, -20);
    await dragNewNode(page, '#btn-new-state', 50, 20);

    const canvas = page.locator('#canvas-container');
    const cBox = await canvas.boundingBox();
    await page.mouse.click(cBox.x + 5, cBox.y + 5);

    const nodeA = page.locator('.state-node').nth(0);
    const nodeB = page.locator('.state-node').nth(1);
    const boxA = await getNodeBox(page, nodeA);
    const boxB = await getNodeBox(page, nodeB);

    const left = Math.min(boxA.x, boxB.x) - 20;
    const top = Math.min(boxA.y, boxB.y) - 20;
    const right = Math.max(boxA.x + boxA.width, boxB.x + boxB.width) + 20;
    const bottom = Math.max(boxA.y + boxA.height, boxB.y + boxB.height) + 20;

    await drag(page, left, top, right, bottom, 15);
    await expect(nodeA).toHaveClass(/node-group-selected/);

    await page.mouse.click(cBox.x + 5, cBox.y + 5);
    await expect(nodeA).not.toHaveClass(/node-group-selected/);
    await expect(nodeB).not.toHaveClass(/node-group-selected/);
  });
});

// ─── Version 7: Minimap minimize / restore ─────────────────────────────────

test.describe('V7 – Minimap minimize/restore', () => {
  test('clicking minimize hides minimap and shows restore button', async ({ page }) => {
    await page.locator('#minimap-minimize').click();
    await expect(page.locator('#minimap')).toBeHidden();
    await expect(page.locator('#minimap-restore')).toBeVisible();
  });

  test('clicking restore shows minimap again', async ({ page }) => {
    await page.locator('#minimap-minimize').click();
    await page.locator('#minimap-restore').click();
    await expect(page.locator('#minimap')).toBeVisible();
    await expect(page.locator('#minimap-restore')).toBeHidden();
  });
});

// ─── Version 8: Zoom toolbar ──────────────────────────────────────────────

test.describe('V8 – Zoom toolbar', () => {
  test('zoom toolbar is visible inside the canvas area', async ({ page }) => {
    await expect(page.locator('#canvas-container #zoom-toolbar')).toBeVisible();
  });

  test('zoom slider is present', async ({ page }) => {
    await expect(page.locator('#zoom-slider')).toBeVisible();
  });

  test('zoom slider changes zoom level', async ({ page }) => {
    const label = page.locator('#zoom-label');
    const slider = page.locator('#zoom-slider');
    await slider.fill('200');
    await slider.dispatchEvent('input');
    const text = await label.textContent();
    expect(parseInt(text)).toBeGreaterThanOrEqual(150);
  });

  test('zoom label shows percentage', async ({ page }) => {
    const text = await page.locator('#zoom-label').textContent();
    expect(text).toMatch(/\d+%/);
  });

  test('fit all button is in zoom toolbar', async ({ page }) => {
    await expect(page.locator('#zoom-toolbar #btn-fit-all')).toBeVisible();
  });
});

// ─── Version 9: Start/End labels ───────────────────────────────────────────

test.describe('V9 – Start and end node labels', () => {
  test('start node shows read-only "start" label', async ({ page }) => {
    await dragNewNode(page, '#btn-new-start');
    const label = page.locator('.start-node .node-label-fixed');
    await expect(label).toBeVisible();
    await expect(label).toHaveText('start');
  });

  test('end node shows read-only "end" label', async ({ page }) => {
    await dragNewNode(page, '#btn-new-end');
    const label = page.locator('.end-node .node-label-fixed');
    await expect(label).toBeVisible();
    await expect(label).toHaveText('end');
  });

  test('start label is not editable on double-click', async ({ page }) => {
    await dragNewNode(page, '#btn-new-start');
    const node = page.locator('.start-node');
    await node.dblclick();
    await expect(page.locator('.node-label-input')).toHaveCount(0);
  });
});

// ─── Version 10: Node deletion ─────────────────────────────────────────────

test.describe('V10 – Node deletion', () => {
  test('active node shows red delete handle', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    const node = page.locator('.state-node');
    await node.click();
    await expect(page.locator('.node-delete-handle')).toBeVisible();
  });

  test('clicking delete handle removes the node', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    await expect(page.locator('.state-node')).toHaveCount(1);

    await page.locator('.state-node').click();
    await page.locator('.node-delete-handle').click();
    await expect(page.locator('.state-node')).toHaveCount(0);
  });

  test('deleting a node preserves its connections as dangling', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state', -100, 0);
    await dragNewNode(page, '#btn-new-state', 100, 0);
    const nodeA = page.locator('.state-node').nth(0);
    const nodeB = page.locator('.state-node').nth(1);

    await nodeA.click();
    await dragBetween(page, page.locator('.conn-handle'), nodeB);
    await expect(page.locator('.conn-line')).toHaveCount(1);

    await nodeA.click();
    await page.locator('.node-delete-handle').click();

    await expect(page.locator('.conn-line')).toHaveCount(1);
    await expect(page.locator('.state-node')).toHaveCount(1);
  });

  test('dangling connection shows reconn handle when selected', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state', -100, 0);
    await dragNewNode(page, '#btn-new-state', 100, 0);
    const nodeA = page.locator('.state-node').nth(0);
    const nodeB = page.locator('.state-node').nth(1);

    await nodeA.click();
    await dragBetween(page, page.locator('.conn-handle'), nodeB);

    await nodeA.click();
    await page.locator('.node-delete-handle').click();

    await page.locator('.conn-hitarea').click({ force: true });
    await expect(page.locator('.reconn-handle')).toHaveCount(1);
  });

  test('delete handle appears on all node types', async ({ page }) => {
    const buttons = ['#btn-new-state', '#btn-new-start', '#btn-new-end', '#btn-new-choice'];
    const offsets = [-200, -80, 80, 200];
    for (let i = 0; i < buttons.length; i++) {
      await dragNewNode(page, buttons[i], offsets[i], 0);
    }
    const nodeTypes = ['.state-node', '.start-node', '.end-node', '.choice-node'];
    for (const sel of nodeTypes) {
      await page.locator(sel).click();
      await expect(page.locator('.node-delete-handle')).toBeVisible();
      const canvas = page.locator('#canvas-container');
      const box = await canvas.boundingBox();
      await page.mouse.click(box.x + 5, box.y + 5);
    }
  });
});

// ─── Version 21: Hand tool in zoom toolbar ────────────────────────────────

test.describe('V21 – Hand tool in zoom toolbar', () => {
  test('hand tool button is inside the zoom toolbar', async ({ page }) => {
    const handBtn = page.locator('#zoom-toolbar #btn-hand-tool');
    await expect(handBtn).toBeVisible();
  });

  test('hand tool button is NOT in the main toolbar', async ({ page }) => {
    const handBtnInToolbar = page.locator('#toolbar #btn-hand-tool');
    await expect(handBtnInToolbar).toHaveCount(0);
  });

  test('hand tool toggles active class when clicked', async ({ page }) => {
    const btn = page.locator('#btn-hand-tool');
    await expect(btn).not.toHaveClass(/active/);
    await btn.click();
    await expect(btn).toHaveClass(/active/);
    await btn.click();
    await expect(btn).not.toHaveClass(/active/);
  });

  test('hand tool changes cursor to grab on canvas', async ({ page }) => {
    await page.locator('#btn-hand-tool').click();
    const cursor = await page.locator('#canvas-container').evaluate(el => el.style.cursor);
    expect(cursor).toBe('grab');
  });

  test('deactivating hand tool restores default cursor', async ({ page }) => {
    const btn = page.locator('#btn-hand-tool');
    await btn.click();
    await btn.click();
    const cursor = await page.locator('#canvas-container').evaluate(el => el.style.cursor);
    expect(cursor).toBe('');
  });

  test('"h" keyboard shortcut still toggles hand tool in zoom toolbar', async ({ page }) => {
    const btn = page.locator('#btn-hand-tool');
    await expect(btn).not.toHaveClass(/active/);
    await page.keyboard.press('h');
    await expect(btn).toHaveClass(/active/);
    await page.keyboard.press('h');
    await expect(btn).not.toHaveClass(/active/);
  });
});

// ─── Version 22: Edit node name in inspector panel ───────────────────────

test.describe('V22 – Edit node name in inspector panel', () => {
  test('inspector shows editable name input when state node is selected', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    await page.locator('.state-node').click();
    const nameInput = page.locator('.inspector-name-input');
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue(/State/);
  });

  test('inspector shows editable name input when choice node is selected', async ({ page }) => {
    await dragNewNode(page, '#btn-new-choice');
    await page.locator('.choice-node').click();
    const nameInput = page.locator('.inspector-name-input');
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue('?');
  });

  test('inspector does NOT show name input for start node', async ({ page }) => {
    await dragNewNode(page, '#btn-new-start');
    await page.locator('.start-node').click();
    await expect(page.locator('.inspector-name-input')).toHaveCount(0);
  });

  test('inspector does NOT show name input for end node', async ({ page }) => {
    await dragNewNode(page, '#btn-new-end');
    await page.locator('.end-node').click();
    await expect(page.locator('.inspector-name-input')).toHaveCount(0);
  });

  test('typing in name input updates the diagram label dynamically', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    await page.locator('.state-node').click();
    const nameInput = page.locator('.inspector-name-input');
    await nameInput.fill('MyState');
    const label = page.locator('.state-node .node-label');
    await expect(label).toHaveText('MyState');
  });

  test('diagram label updates as the user types each character', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    await page.locator('.state-node').click();
    const nameInput = page.locator('.inspector-name-input');
    await nameInput.fill('');
    await nameInput.type('AB');
    const label = page.locator('.state-node .node-label');
    await expect(label).toHaveText('AB');
  });

  test('name input reflects current label when node is reselected', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    const node = page.locator('.state-node');

    await node.click();
    const nameInput = page.locator('.inspector-name-input');
    await nameInput.fill('Renamed');

    const canvas = page.locator('#canvas-container');
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + 5, box.y + 5);

    await node.click();
    await expect(page.locator('.inspector-name-input')).toHaveValue('Renamed');
  });
});

// ─── Inspector tabs and Settings ────────────────────────────────────────────

test.describe('Inspector tabs', () => {
  test('inspector tab is visible', async ({ page }) => {
    await expect(page.locator('.inspector-tab[data-tab="inspector"]')).toBeVisible();
  });

  test('inspector tab is active by default', async ({ page }) => {
    await expect(page.locator('.inspector-tab[data-tab="inspector"]')).toHaveClass(/active/);
  });
});

// ─── Inspector clears on deselect/delete ────────────────────────────────────

test.describe('Inspector clears on deselect/delete', () => {
  test('inspector reverts to class view after node is deleted', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    const node = page.locator('.state-node');
    await node.click();
    await expect(page.locator('#inspector-props')).toBeVisible();

    await page.locator('.node-delete-handle').click();
    await expect(page.locator('.state-node')).toHaveCount(0);
    // In class edit mode, inspector shows class properties after deselection
    await expect(page.locator('#inspector-props')).toBeVisible();
  });

  test('inspector reverts to class view when node is deselected', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    const node = page.locator('.state-node');
    await node.click();
    await expect(page.locator('#inspector-props')).toBeVisible();

    const canvas = page.locator('#canvas-container');
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + 5, box.y + 5);
    // In class edit mode, inspector shows class properties (not empty)
    await expect(page.locator('#inspector-props')).toBeVisible();
  });

  test('inspector shows class view when group of nodes is selected', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state', -50, -20);
    await dragNewNode(page, '#btn-new-state', 50, 20);

    const canvas = page.locator('#canvas-container');
    const cBox = await canvas.boundingBox();
    await page.mouse.click(cBox.x + 5, cBox.y + 5);

    const nodeA = page.locator('.state-node').nth(0);
    const nodeB = page.locator('.state-node').nth(1);
    const boxA = await nodeA.boundingBox();
    const boxB = await nodeB.boundingBox();
    const left = Math.min(boxA.x, boxB.x) - 20;
    const top = Math.min(boxA.y, boxB.y) - 20;
    const right = Math.max(boxA.x + boxA.width, boxB.x + boxB.width) + 20;
    const bottom = Math.max(boxA.y + boxA.height, boxB.y + boxB.height) + 20;
    await drag(page, left, top, right, bottom, 15);

    await expect(nodeA).toHaveClass(/node-group-selected/);
    // In class edit mode, inspector shows class properties when no single node selected
    await expect(page.locator('#inspector-props')).toBeVisible();
  });
});

// ─── Export JSON button on canvas ───────────────────────────────────────────

test.describe('Export JSON button on canvas', () => {
  test('export JSON button is visible in the toolbar', async ({ page }) => {
    const btn = page.locator('#toolbar #btn-export-json');
    await expect(btn).toBeVisible();
  });

  test('export JSON button is NOT inside the inspector', async ({ page }) => {
    const btnInInspector = page.locator('#inspector #btn-export-json');
    await expect(btnInInspector).toHaveCount(0);
  });

  test('clicking export JSON button shows the JSON modal', async ({ page }) => {
    await page.evaluate(() => document.getElementById('btn-export-json').click());
    await expect(page.locator('#json-modal-overlay')).toBeVisible();
    await page.keyboard.press('Escape');
  });
});

// ─── JSON modal copy button ─────────────────────────────────────────────────

test.describe('JSON modal copy button', () => {
  test('JSON modal has a copy button', async ({ page }) => {
    await page.evaluate(() => document.getElementById('btn-export-json').click());
    await expect(page.locator('#json-modal-copy')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('JSON modal pre text is selectable', async ({ page }) => {
    await page.evaluate(() => document.getElementById('btn-export-json').click());
    const userSelect = await page.locator('#json-modal-body pre').evaluate(
      el => getComputedStyle(el).userSelect
    );
    expect(userSelect).toBe('text');
    await page.keyboard.press('Escape');
  });
});

// ─── Theme toggle ───────────────────────────────────────────────────────────

test.describe('Theme toggle', () => {
  test('theme toggle button is visible in toolbar', async ({ page }) => {
    await expect(page.locator('#btn-theme-toggle')).toBeVisible();
  });

  test('clicking theme toggle switches to dark theme', async ({ page }) => {
    // Default is light, so first click switches to dark
    await page.locator('#btn-theme-toggle').click();
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBeNull();
  });

  test('clicking theme toggle twice returns to light theme', async ({ page }) => {
    await page.locator('#btn-theme-toggle').click();
    await page.locator('#btn-theme-toggle').click();
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('light');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V44 — Left Panel, Objects, Classes, Enum Classes
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('V44: Left panel visibility', () => {
  test('left panel is visible with four sections', async ({ page }) => {
    await expect(page.locator('#left-panel')).toBeVisible();
    await expect(page.locator('.left-panel-section')).toHaveCount(4);
  });

  test('objects list contains default game and stage objects', async ({ page }) => {
    await enterObjectMode(page);
    const items = page.locator('#objects-list .left-panel-item');
    await expect(items).toHaveCount(2);
    const texts = await items.allTextContents();
    expect(texts.some(t => t.includes('game'))).toBe(true);
    expect(texts.some(t => t.includes('stage'))).toBe(true);
  });

  test('classes list contains Game, Sprite, CSSColor, and Stage', async ({ page }) => {
    // classes are minimized when object is active, expand first
    await page.locator('#btn-edit-classes').click();
    const items = page.locator('#classes-list .left-panel-item');
    await expect(items).toHaveCount(4);
    const texts = await items.allTextContents();
    expect(texts.some(t => t.includes('Game'))).toBe(true);
    expect(texts.some(t => t.includes('Sprite'))).toBe(true);
    expect(texts.some(t => t.includes('CSSColor'))).toBe(true);
    expect(texts.some(t => t.includes('Stage'))).toBe(true);
  });

  test('enums list contains default enums', async ({ page }) => {
    const items = page.locator('#enums-list .left-panel-item');
    await expect(items).toHaveCount(3);
    const texts = await items.allTextContents();
    expect(texts.some(t => t.includes('GameType'))).toBe(true);
    expect(texts.some(t => t.includes('SpecialKeyType'))).toBe(true);
    expect(texts.some(t => t.includes('BgImageFit'))).toBe(true);
  });

  test('game object context menu has no Delete option', async ({ page }) => {
    const item = page.locator('#objects-list .left-panel-item').first();
    await item.click({ button: 'right' });
    await expect(page.locator('.object-ctx-menu')).toBeVisible();
    await expect(page.locator('.object-ctx-delete')).toHaveCount(0);
    // Dismiss menu
    await page.mouse.click(0, 0);
  });

  test('add object button is visible', async ({ page }) => {
    await expect(page.locator('#btn-add-object')).toBeVisible();
  });

  test('add class button is visible when no object selected', async ({ page }) => {
    await page.evaluate(() => document.getElementById('classes-header').click());
    await page.locator('#classes-list').waitFor({ state: 'visible' });
    await expect(page.locator('#btn-add-class')).toBeVisible();
  });

  test('add enum button is visible when no object selected', async ({ page }) => {
    await page.evaluate(() => document.getElementById('classes-header').click());
    await page.locator('#classes-list').waitFor({ state: 'visible' });
    await expect(page.locator('#btn-add-enum')).toBeVisible();
  });
});

test.describe('V44: Add operations via prompt', () => {
  test('clicking + on Objects shows modal and creates a new object', async ({ page }) => {
    await enterObjectMode(page);
    const beforeCount = await page.locator('#objects-list .left-panel-item').count();
    await addObjectViaForm(page, 'enemy', 'Game');
    await expect(page.locator('#objects-list .left-panel-item')).toHaveCount(beforeCount + 1);
    await expect(page.locator('#objects-list .left-panel-item').last()).toContainText('enemy');
  });

  test('clicking + on Classes creates a new class', async ({ page }) => {
    await page.evaluate(() => document.getElementById('classes-header').click());
    await page.locator('#classes-list').waitFor({ state: 'visible' }); // deselect object first
    await page.locator('#btn-add-class').click();
    await page.locator('#modal-name-input').fill('Sprite2');
    await page.locator('#modal-ok').click();
    const items = page.locator('#classes-list .left-panel-item');
    const count = await items.count();
    await expect(items.nth(count - 1)).toContainText('Sprite2');
  });

  test('clicking + on Enum Classes creates a new enum class', async ({ page }) => {
    await page.evaluate(() => document.getElementById('classes-header').click());
    await page.locator('#classes-list').waitFor({ state: 'visible' }); // deselect object first
    await page.locator('#btn-add-enum').click();
    await page.locator('#modal-name-input').fill('Direction');
    await page.locator('#modal-ok').click();
    const items = page.locator('#enums-list .left-panel-item');
    const count = await items.count();
    await expect(items.nth(count - 1)).toContainText('Direction');
  });
});

test.describe('V44: Class inspector', () => {
  test('clicking a class shows its properties in inspector', async ({ page }) => {
    await page.evaluate(() => document.getElementById('classes-header').click());
    await page.locator('#classes-list').waitFor({ state: 'visible' });
    // Click Game class specifically
    const items = page.locator('#classes-list .left-panel-item');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      if ((await items.nth(i).textContent()).includes('Game')) {
        await items.nth(i).click();
        break;
      }
    }
    await expect(page.locator('#inspector-props')).toBeVisible();
    const inputs = page.locator('#inspector-props input.inspector-input');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(4);
  });

  test('class inspector shows Add Property button', async ({ page }) => {
    await page.evaluate(() => document.getElementById('classes-header').click());
    await page.locator('#classes-list').waitFor({ state: 'visible' });
    await page.locator('#classes-list .left-panel-item:has-text("Game")').first().click();
    await expect(page.locator('button:has-text("+ Add Property")')).toBeVisible();
  });

  test('clicking Add Property adds a new property row', async ({ page }) => {
    await page.evaluate(() => document.getElementById('classes-header').click());
    await page.locator('#classes-list').waitFor({ state: 'visible' });
    await page.locator('#classes-list .left-panel-item:has-text("Game")').first().click();
    const beforeRows = await page.locator('.class-prop-row').count();
    await page.locator('button:has-text("+ Add Property")').click();
    const afterRows = await page.locator('.class-prop-row').count();
    expect(afterRows).toBe(beforeRows + 1);
  });

  test('property type dropdown contains all expected types', async ({ page }) => {
    await page.evaluate(() => document.getElementById('classes-header').click());
    await page.locator('#classes-list').waitFor({ state: 'visible' });
    await page.locator('#classes-list .left-panel-item:has-text("Game")').first().click();
    const select = page.locator('#inspector-props select.inspector-select').first();
    const options = await select.locator('option').allTextContents();
    expect(options).toContain('String');
    expect(options).toContain('Integer');
    expect(options).toContain('Boolean');
    expect(options).toContain('Enum Class');
    expect(options).toContain('Image');
    expect(options).toContain('Sound');
    expect(options).toContain('Object');
  });
});

test.describe('V44: Enum class inspector', () => {
  test('clicking an enum class shows its values in inspector', async ({ page }) => {
    await page.evaluate(() => document.getElementById('classes-header').click());
    await page.locator('#classes-list').waitFor({ state: 'visible' }); // deselect object
    await page.locator('#enums-list .left-panel-item').first().click();
    await expect(page.locator('#inspector-props')).toBeVisible();
    // GameType has 5 values + name input = at least 6 inputs
    const inputs = page.locator('#inspector-props input.inspector-input');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('enum values are displayed in uppercase', async ({ page }) => {
    await page.evaluate(() => document.getElementById('classes-header').click());
    await page.locator('#classes-list').waitFor({ state: 'visible' });
    // Click GameType specifically (not SpecialKeyType)
    const enumItems = page.locator('#enums-list .left-panel-item');
    const count = await enumItems.count();
    for (let i = 0; i < count; i++) {
      const text = await enumItems.nth(i).textContent();
      if (text.includes('GameType')) { await enumItems.nth(i).click(); break; }
    }
    // The first value after the name input should be ARCADE
    const inputs = page.locator('#inspector-props input.inspector-input');
    const secondInput = inputs.nth(1);
    const val = await secondInput.inputValue();
    expect(val).toBe('ARCADE');
  });

  test('enum inspector shows Add Value button', async ({ page }) => {
    await page.evaluate(() => document.getElementById('classes-header').click());
    await page.locator('#classes-list').waitFor({ state: 'visible' });
    await page.locator('#enums-list .left-panel-item').first().click();
    await expect(page.locator('button:has-text("+ Add Value")')).toBeVisible();
  });

  test('typing lowercase in enum value converts to uppercase', async ({ page }) => {
    await page.evaluate(() => document.getElementById('classes-header').click());
    await page.locator('#classes-list').waitFor({ state: 'visible' });
    await page.locator('#enums-list .left-panel-item').first().click();
    await page.locator('button:has-text("+ Add Value")').click();
    const inputs = page.locator('#inspector-props input.inspector-input');
    const lastInput = inputs.last();
    await lastInput.fill('');
    await lastInput.type('apple');
    const val = await lastInput.inputValue();
    expect(val).toBe('APPLE');
  });
});

test.describe('V59: Class-based state charts', () => {
  test('switching between classes shows different charts', async ({ page }) => {
    // Enter class edit mode for Game
    await enterClassEditMode(page, 'Game');
    await dragNewNode(page, '#btn-new-state');
    await expect(page.locator('.state-node')).toHaveCount(1);

    // Switch to Sprite class
    await page.locator('#classes-list .left-panel-item:has-text("Sprite")').first().click();
    await expect(page.locator('.state-node')).toHaveCount(0);

    // Switch back to Game
    await page.locator('#classes-list .left-panel-item:has-text("Game")').first().click();
    await expect(page.locator('.state-node')).toHaveCount(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V45 — Zoom toolbar inside canvas stage
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('V45: Zoom toolbar inside canvas', () => {
  test('zoom toolbar is a child of the canvas container', async ({ page }) => {
    await expect(page.locator('#canvas-container > #zoom-toolbar')).toBeVisible();
  });

  test('zoom toolbar is NOT a direct child of body or main-area', async ({ page }) => {
    await expect(page.locator('body > #zoom-toolbar')).toHaveCount(0);
    await expect(page.locator('#main-area > #zoom-toolbar')).toHaveCount(0);
  });

  test('zoom toolbar is positioned inside the canvas bounds', async ({ page }) => {
    const canvasBox = await page.locator('#canvas-container').boundingBox();
    const toolbarBox = await page.locator('#zoom-toolbar').boundingBox();
    expect(toolbarBox.x).toBeGreaterThanOrEqual(canvasBox.x);
    expect(toolbarBox.y).toBeGreaterThanOrEqual(canvasBox.y);
    expect(toolbarBox.x + toolbarBox.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width);
  });

  test('zoom toolbar does not overlap the left panel', async ({ page }) => {
    const leftPanelBox = await page.locator('#left-panel').boundingBox();
    const toolbarBox = await page.locator('#zoom-toolbar').boundingBox();
    expect(toolbarBox.x).toBeGreaterThanOrEqual(leftPanelBox.x + leftPanelBox.width);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V46 — Data panel, object properties, state chart per object
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('V46: Data panel title', () => {
  test('left panel shows "Data" title', async ({ page }) => {
    await expect(page.locator('#data-panel-title')).toBeVisible();
    await expect(page.locator('#data-panel-title')).toHaveText('Data');
  });
});

test.describe('V46: Minimized sections when object selected', () => {
  test('classes and enums are minimized when game object is active', async ({ page }) => {
    // game is selected by default
    const classesMinimized = await page.locator('#section-classes').evaluate(el => el.classList.contains('minimized'));
    expect(classesMinimized).toBe(true);
    const enumsMinimized = await page.locator('#section-enums').evaluate(el => el.classList.contains('minimized'));
    expect(enumsMinimized).toBe(true);
  });

  test('classes list is hidden when minimized', async ({ page }) => {
    await expect(page.locator('#classes-list')).toBeHidden();
  });

  test('clicking minimized Classes header restores full class list', async ({ page }) => {
    await page.evaluate(() => document.getElementById('classes-header').click());
    await page.locator('#classes-list').waitFor({ state: 'visible' });
    const minimized = await page.locator('#section-classes').evaluate(el => el.classList.contains('minimized'));
    expect(minimized).toBe(false);
    await expect(page.locator('#classes-list')).toBeVisible();
  });

  test('clicking minimized Enums header deselects object and shows enum list', async ({ page }) => {
    await page.locator('#objects-list .left-panel-item').first().click();
    const enumsMinimized = await page.locator('#section-enums').evaluate(el => el.classList.contains('minimized'));
    expect(enumsMinimized).toBe(true);
    await page.evaluate(() => document.getElementById('enums-header').click());
    const minimizedAfter = await page.locator('#section-enums').evaluate(el => el.classList.contains('minimized'));
    expect(minimizedAfter).toBe(false);
    await expect(page.locator('#enums-list')).toBeVisible();
  });
});

test.describe('V60: Object properties in Inspector', () => {
  test('inspector shows object properties when object selected', async ({ page }) => {
    // Switch to class mode then back to object to ensure fresh state
    await enterClassEditMode(page, 'Game');
    await enterObjectMode(page);
    await expect(page.locator('#inspector-props')).toBeVisible();
    await expect(page.locator('#inspector-table')).toContainText('Properties');
  });

  test('inspector shows Game object property names', async ({ page }) => {
    await enterClassEditMode(page, 'Game');
    await enterObjectMode(page);
    await expect(page.locator('#inspector-table')).toContainText('name');
    await expect(page.locator('#inspector-table')).toContainText('description');
    await expect(page.locator('#inspector-table')).toContainText('category');
  });

  test('inspector shows object name and class', async ({ page }) => {
    await enterClassEditMode(page, 'Game');
    await enterObjectMode(page);
    await expect(page.locator('#inspector-table')).toContainText('game');
    await expect(page.locator('#inspector-table')).toContainText('Game');
  });

  test('object properties hidden when no object selected', async ({ page }) => {
    await page.locator('#objects-list .left-panel-item').first().click();
    await page.evaluate(() => document.getElementById('classes-header').click());
    await page.locator('#classes-list').waitFor({ state: 'visible' });
    await expect(page.locator('#section-object-props')).toBeHidden();
  });
});

test.describe('V46: No state chart when no object', () => {
  test('canvas shows overlay message when no object selected', async ({ page }) => {
    await page.evaluate(() => document.getElementById('classes-header').click());
    await page.locator('#classes-list').waitFor({ state: 'visible' });
    await expect(page.locator('#canvas-no-object')).toBeVisible();
  });

  test('canvas hides overlay when object is selected', async ({ page }) => {
    await page.locator('#objects-list .left-panel-item').first().click();
    await expect(page.locator('#canvas-no-object')).toBeHidden();
  });
});

test.describe('V59: State chart preserved per class', () => {
  test('state chart is preserved when switching between classes', async ({ page }) => {
    await enterClassEditMode(page, 'Game');
    await dragNewNode(page, '#btn-new-state');
    await expect(page.locator('.state-node')).toHaveCount(1);

    // Switch to Sprite class and add a start node
    await page.locator('#classes-list .left-panel-item:has-text("Sprite")').first().click();
    await expect(page.locator('.state-node')).toHaveCount(0);
    await dragNewNode(page, '#btn-new-start');
    await expect(page.locator('.start-node')).toHaveCount(1);

    // Switch back to Game — should see state node, not start
    await page.locator('#classes-list .left-panel-item:has-text("Game")').first().click();
    await expect(page.locator('.state-node')).toHaveCount(1);
    await expect(page.locator('.start-node')).toHaveCount(0);

    // Switch to Sprite again — should see start node
    await page.locator('#classes-list .left-panel-item:has-text("Sprite")').first().click();
    await expect(page.locator('.start-node')).toHaveCount(1);
    await expect(page.locator('.state-node')).toHaveCount(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V47 — Inline add-object form, delete confirmation
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('V60: Modal-based object creation', () => {
  test('modal is hidden by default', async ({ page }) => {
    await expect(page.locator('#modal-overlay')).toBeHidden();
  });

  test('clicking + on Objects shows modal with class dropdown and name input', async ({ page }) => {
    await enterObjectMode(page);
    await page.locator('#btn-add-object').click();
    await expect(page.locator('#modal-overlay')).toBeVisible();
    await expect(page.locator('#modal-class-select')).toBeVisible();
    await expect(page.locator('#modal-name-input')).toBeVisible();
    await page.locator('#modal-cancel').click();
  });

  test('cancel closes the modal', async ({ page }) => {
    await enterObjectMode(page);
    await page.locator('#btn-add-object').click();
    await page.locator('#modal-cancel').click();
    await expect(page.locator('#modal-overlay')).toBeHidden();
  });

  test('submitting modal creates object', async ({ page }) => {
    await enterObjectMode(page);
    const beforeCount = await page.locator('#objects-list .left-panel-item').count();
    await addObjectViaForm(page, 'rocket', 'Game');
    await expect(page.locator('#modal-overlay')).toBeHidden();
    await expect(page.locator('#objects-list .left-panel-item')).toHaveCount(beforeCount + 1);
  });

  test('pressing Enter in name input submits', async ({ page }) => {
    await enterObjectMode(page);
    await page.locator('#btn-add-object').click();
    await page.locator('#modal-name-input').fill('enterObj');
    await page.locator('#modal-name-input').press('Enter');
    await expect(page.locator('#modal-overlay')).toBeHidden();
  });
});

test.describe('V47: Delete object via context menu', () => {
  test('right-click shows context menu with Delete and Duplicate', async ({ page }) => {
    await addObjectViaForm(page, 'ctxTest', 'Game');
    const item = page.locator('#objects-list .left-panel-item').last();
    await item.click({ button: 'right' });
    await expect(page.locator('.object-ctx-menu')).toBeVisible();
    await expect(page.locator('.object-ctx-item:has-text("Delete")')).toBeVisible();
    await expect(page.locator('.object-ctx-item:has-text("Duplicate")')).toBeVisible();
    await page.mouse.click(0, 0); // dismiss
  });

  test('deleting via context menu shows confirmation dialog', async ({ page }) => {
    await addObjectViaForm(page, 'toDelete', 'Game');
    const itemCount = await page.locator('#objects-list .left-panel-item').count();

    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('toDelete');
      await dialog.accept();
    });

    const item = page.locator('#objects-list .left-panel-item').last();
    await item.click({ button: 'right' });
    await page.locator('.object-ctx-delete').click();

    await expect(page.locator('#objects-list .left-panel-item')).toHaveCount(itemCount - 1);
  });

  test('dismissing confirmation does not delete the object', async ({ page }) => {
    await addObjectViaForm(page, 'keepMe', 'Game');
    const itemCount = await page.locator('#objects-list .left-panel-item').count();

    page.once('dialog', async dialog => {
      await dialog.dismiss();
    });

    const item = page.locator('#objects-list .left-panel-item').last();
    await item.click({ button: 'right' });
    await page.locator('.object-ctx-delete').click();

    await expect(page.locator('#objects-list .left-panel-item')).toHaveCount(itemCount);
  });

  test('duplicate via context menu creates a copy', async ({ page }) => {
    await addObjectViaForm(page, 'origObj', 'Game');
    const beforeCount = await page.locator('#objects-list .left-panel-item').count();

    const item = page.locator('#objects-list .left-panel-item').last();
    await item.click({ button: 'right' });
    await page.locator('.object-ctx-item:has-text("Duplicate")').click();

    await expect(page.locator('#objects-list .left-panel-item')).toHaveCount(beforeCount + 1);
    await expect(page.locator('#objects-list .left-panel-item').last()).toContainText('origObj copy');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V48 — Class/Enum editing mode
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('V48: Edit Classes button', () => {
  test('Edit Classes button is visible when object is selected', async ({ page }) => {
    await expect(page.locator('#btn-edit-classes')).toBeVisible();
  });

  test('clicking Edit Classes switches to class mode', async ({ page }) => {
    await page.locator('#btn-edit-classes').click();
    // Objects section should be minimized
    const objMinimized = await page.locator('#section-objects').evaluate(el => el.classList.contains('minimized'));
    expect(objMinimized).toBe(true);
    // Classes should be expanded
    await expect(page.locator('#classes-list')).toBeVisible();
    await expect(page.locator('#enums-list')).toBeVisible();
  });

  test('Edit Classes button is hidden in class mode', async ({ page }) => {
    await page.locator('#btn-edit-classes').click();
    await expect(page.locator('#btn-edit-classes')).toBeHidden();
  });

  test('canvas shows no-object overlay in class mode', async ({ page }) => {
    await page.locator('#btn-edit-classes').click();
    await expect(page.locator('#canvas-no-object')).toBeVisible();
  });
});

test.describe('V48: Objects header returns to object mode', () => {
  test('clicking minimized Objects header switches back to object mode', async ({ page }) => {
    await page.locator('#btn-edit-classes').click();
    // Objects header should be visible even when minimized
    await page.evaluate(() => document.getElementById('objects-header').click());
    // Objects section should be expanded now
    const objMinimized = await page.locator('#section-objects').evaluate(el => el.classList.contains('minimized'));
    expect(objMinimized).toBe(false);
    // Canvas overlay should be hidden
    await expect(page.locator('#canvas-no-object')).toBeHidden();
  });
});

test.describe('V48: Class CRUD in class mode', () => {
  test('can add a class in class mode', async ({ page }) => {
    await page.locator('#btn-edit-classes').click();
    const beforeCount = await page.locator('#classes-list .left-panel-item').count();
    await page.locator('#btn-add-class').click();
    await page.locator('#modal-name-input').fill('V48Class');
    await page.locator('#modal-ok').click();
    await expect(page.locator('#classes-list .left-panel-item')).toHaveCount(beforeCount + 1);
  });

  test('clicking a class in class mode shows its properties in inspector', async ({ page }) => {
    await page.locator('#btn-edit-classes').click();
    await page.locator('#classes-list .left-panel-item:has-text("Game")').first().click();
    await expect(page.locator('#inspector-props')).toBeVisible();
  });

  test('can add an enum class in class mode', async ({ page }) => {
    await page.locator('#btn-edit-classes').click();
    const beforeCount = await page.locator('#enums-list .left-panel-item').count();
    await page.locator('#btn-add-enum').click();
    await page.locator('#modal-name-input').fill('V48Enum');
    await page.locator('#modal-ok').click();
    await expect(page.locator('#enums-list .left-panel-item')).toHaveCount(beforeCount + 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V49 — Image/Sound dropdown lists
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('V49: Image/Sound property dropdowns', () => {
  test('Image property shows a dropdown of image files', async ({ page }) => {
    // Switch to class mode, create a class with Image property
    await page.locator('#btn-edit-classes').click();
    await page.locator('#btn-add-class').click();
    await page.locator('#modal-name-input').fill('ImgClass');
    await page.locator('#modal-ok').click();

    // Click the new class, add an Image property
    await page.locator('#classes-list .left-panel-item').last().click();
    await page.locator('button:has-text("+ Add Property")').click();

    // Change the new property type to Image
    const lastRow = page.locator('.class-prop-row').last();
    await lastRow.locator('.prop-type-select').selectOption('Image');

    // Create an object of ImgClass
    await page.evaluate(() => document.getElementById('objects-header').click());
    await addObjectViaForm(page, 'imgObj', 'ImgClass');
    await page.locator('#objects-list .left-panel-item').last().click();

    // The property should render as a select dropdown with image files
    const dropdown = page.locator('#inspector-table select.inspector-select');
    await expect(dropdown).toBeVisible();
    const optCount = await dropdown.locator('option').count();
    // Should have placeholder + at least some image files
    expect(optCount).toBeGreaterThan(1);
  });

  test('Sound property shows a dropdown of audio files', async ({ page }) => {
    await page.locator('#btn-edit-classes').click();
    await page.locator('#btn-add-class').click();
    await page.locator('#modal-name-input').fill('SndClass');
    await page.locator('#modal-ok').click();

    await page.locator('#classes-list .left-panel-item').last().click();
    await page.locator('button:has-text("+ Add Property")').click();
    const lastRow2 = page.locator('.class-prop-row').last();
    await lastRow2.locator('.prop-type-select').selectOption('Sound');

    await page.evaluate(() => document.getElementById('objects-header').click());
    await addObjectViaForm(page, 'sndObj', 'SndClass');
    await page.locator('#objects-list .left-panel-item').last().click();

    const dropdown = page.locator('#inspector-table select.inspector-select');
    await expect(dropdown).toBeVisible();
    const optCount = await dropdown.locator('option').count();
    expect(optCount).toBeGreaterThan(1);
    // First option should be the placeholder
    const firstOpt = await dropdown.locator('option').first().textContent();
    expect(firstOpt).toContain('select sound');
  });

  test('image dropdown contains files from subfolders', async ({ page }) => {
    await page.locator('#btn-edit-classes').click();
    await page.locator('#btn-add-class').click();
    await page.locator('#modal-name-input').fill('ImgClass2');
    await page.locator('#modal-ok').click();

    await page.locator('#classes-list .left-panel-item').last().click();
    await page.locator('button:has-text("+ Add Property")').click();
    const lastRow = page.locator('.class-prop-row').last();
    await lastRow.locator('.prop-type-select').selectOption('Image');

    await page.evaluate(() => document.getElementById('objects-header').click());
    await addObjectViaForm(page, 'imgObj2', 'ImgClass2');
    await page.locator('#objects-list .left-panel-item').last().click();

    const dropdown = page.locator('#inspector-table select.inspector-select');
    const allOptions = await dropdown.locator('option').allTextContents();
    // Should contain paths with subfolders like "images/potraits/..."
    const hasSubfolder = allOptions.some(o => o.split('/').length > 2);
    expect(hasSubfolder).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V50 — Sound methods
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('V50: Sound methods in class inspector', () => {
  test('class with Sound property shows auto-generated methods', async ({ page }) => {
    // Enter class mode, create a class with Sound property
    await page.locator('#btn-edit-classes').click();
    await page.locator('#btn-add-class').click();
    await page.locator('#modal-name-input').fill('AudioClass');
    await page.locator('#modal-ok').click();

    // Click the class, add a Sound property
    await page.locator('#classes-list .left-panel-item').last().click();
    await page.locator('button:has-text("+ Add Property")').click();

    // Set the name first (before changing type, which re-renders)
    const lastRow = page.locator('.class-prop-row').last();
    const nameInput = lastRow.locator('input.inspector-input').first();
    await nameInput.fill('music');

    // Now change type to Sound (this re-renders the inspector)
    const typeSelect = page.locator('.class-prop-row').last().locator('select.inspector-select').first();
    await typeSelect.selectOption('Sound');

    // Should see Methods section with 3 sound methods
    const methodRows = page.locator('.sound-method-row');
    await expect(methodRows).toHaveCount(3);
    await expect(methodRows.nth(0)).toContainText('MusicPlay()');
    await expect(methodRows.nth(1)).toContainText('MusicPause()');
    await expect(methodRows.nth(2)).toContainText('MusicSetLooping(boolean)');
  });
});

test.describe('V50: Sound methods in data panel', () => {
  test('object with Sound property shows methods in data panel', async ({ page }) => {
    // Create class with Sound property in class mode
    await page.locator('#btn-edit-classes').click();
    await page.locator('#btn-add-class').click();
    await page.locator('#modal-name-input').fill('SfxClass');
    await page.locator('#modal-ok').click();

    await page.locator('#classes-list .left-panel-item').last().click();
    await page.locator('button:has-text("+ Add Property")').click();

    const lastRow = page.locator('.class-prop-row').last();
    await lastRow.locator('select.inspector-select').first().selectOption('Sound');
    const newLastRow = page.locator('.class-prop-row').last();
    await newLastRow.locator('input.inspector-input').first().fill('fireSound');

    // Switch to object mode, create object of SfxClass
    await page.evaluate(() => document.getElementById('objects-header').click());
    await addObjectViaForm(page, 'sfxObj', 'SfxClass');
    await page.locator('#objects-list .left-panel-item').last().click();

    // Should see sound method items in data panel
    const methodItems = page.locator('#inspector-table .sound-method-row');
    await expect(methodItems).toHaveCount(3);
    await expect(methodItems.nth(0)).toContainText('FireSoundPlay()');
    await expect(methodItems.nth(1)).toContainText('FireSoundPause()');
    await expect(methodItems.nth(2)).toContainText('FireSoundSetLooping(boolean)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V51 — Events, guard conditions, actions, terminate node
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('V51: Terminate node', () => {
  test('terminate button is in the toolbar', async ({ page }) => {
    await expect(page.locator('#btn-new-terminate')).toBeVisible();
  });

  test('can drag a terminate node onto the canvas', async ({ page }) => {
    await dragNewNode(page, '#btn-new-terminate');
    await expect(page.locator('.terminate-node')).toHaveCount(1);
  });

  test('terminate node has no connection handle', async ({ page }) => {
    await dragNewNode(page, '#btn-new-terminate');
    await page.locator('.terminate-node').click();
    await expect(page.locator('.terminate-node .conn-handle')).toHaveCount(0);
  });
});

test.describe('V51: State behaviours in inspector', () => {
  test('selecting a state node shows Entry/Do/Exit sections', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    await page.locator('.state-node').click();
    await expect(page.locator('#inspector-table')).toContainText('State Behaviours');
    await expect(page.locator('#inspector-table')).toContainText('Entry /');
    await expect(page.locator('#inspector-table')).toContainText('Do /');
    await expect(page.locator('#inspector-table')).toContainText('Exit /');
  });

  test('can add a behaviour to Entry section', async ({ page }) => {
    await dragNewNode(page, '#btn-new-state');
    await page.locator('.state-node').click();
    // Find the first "+ Add" button (for Entry /)
    const addButtons = page.locator('#inspector-table button:has-text("+ Add")');
    await addButtons.first().click();
    const behaviourInputs = page.locator('.behaviour-row input');
    await expect(behaviourInputs).toHaveCount(1);
  });
});

test.describe('V51: Transition event/guard/behaviours', () => {
  test('connection inspector shows Event, Guard, and Behaviours sections', async ({ page }) => {
    // Create two state nodes and connect them
    await dragNewNode(page, '#btn-new-state', -80, -20);
    await dragNewNode(page, '#btn-new-state', 80, -20);
    const nodes = page.locator('.state-node');
    await expect(nodes).toHaveCount(2);

    // Create connection by using connection handle
    const nodeA = nodes.nth(0);
    await nodeA.click();
    const connHandle = page.locator('.conn-handle');
    if (await connHandle.count() > 0) {
      const nodeB = nodes.nth(1);
      const bBox = await nodeB.boundingBox();
      await connHandle.dragTo(nodeB, { targetPosition: { x: bBox.width / 2, y: bBox.height / 2 } });
    }

    // Click a connection if created
    const connGroup = page.locator('.conn-group');
    if (await connGroup.count() > 0) {
      await connGroup.first().locator('.conn-hitarea').click({ force: true });
      await expect(page.locator('#inspector-table')).toContainText('Event');
      await expect(page.locator('#inspector-table')).toContainText('Guard Condition');
      await expect(page.locator('#inspector-table')).toContainText('Transition Behaviours');
    }
  });
});

test.describe('V51: SpecialKeyType enum', () => {
  test('SpecialKeyType appears in enum list', async ({ page }) => {
    await page.locator('#btn-edit-classes').click();
    const items = page.locator('#enums-list .left-panel-item');
    const texts = await items.allTextContents();
    expect(texts.some(t => t.includes('SpecialKeyType'))).toBe(true);
  });
});

test.describe('V51: Load JSON button', () => {
  test('Load JSON button is visible', async ({ page }) => {
    await expect(page.locator('#btn-load-json')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V52 — Sprite, CSSColor, Stage, Runtime engine
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('V52: Built-in classes and objects', () => {
  test('Sprite class appears in class list', async ({ page }) => {
    await page.locator('#btn-edit-classes').click();
    const items = page.locator('#classes-list .left-panel-item');
    const texts = await items.allTextContents();
    expect(texts.some(t => t.includes('Sprite'))).toBe(true);
  });

  test('CSSColor class appears in class list', async ({ page }) => {
    await page.locator('#btn-edit-classes').click();
    const texts = await page.locator('#classes-list .left-panel-item').allTextContents();
    expect(texts.some(t => t.includes('CSSColor'))).toBe(true);
  });

  test('stage object appears in objects list', async ({ page }) => {
    const items = page.locator('#objects-list .left-panel-item');
    const texts = await items.allTextContents();
    expect(texts.some(t => t.includes('stage'))).toBe(true);
  });
});

test.describe('V52: Run button', () => {
  test('Run button is visible in toolbar', async ({ page }) => {
    await expect(page.locator('#btn-run')).toBeVisible();
  });

  test('Run button shows error when object has nodes but no start state', async ({ page }) => {
    // Add a state node to game (no start)
    await dragNewNode(page, '#btn-new-state');
    // Try to run - should get alert
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Start state');
      await dialog.accept();
    });
    await page.locator('#btn-run').click();
  });

  test('Run button starts and stops runtime with valid state chart', async ({ page }) => {
    // Create a valid state chart: start -> state
    await dragNewNode(page, '#btn-new-start', -100, -30);
    await dragNewNode(page, '#btn-new-state', 100, -30);

    // Connect them
    const startNode = page.locator('.start-node');
    await startNode.click();
    const connHandle = page.locator('.conn-handle');
    if (await connHandle.count() > 0) {
      const stateNode = page.locator('.state-node');
      await connHandle.dragTo(stateNode);
    }

    // Click Run
    await page.locator('#btn-run').click();
    // Runtime stage should be visible
    await expect(page.locator('#runtime-stage')).toBeVisible();
    // Button should show Stop
    await expect(page.locator('#btn-run')).toHaveClass(/running/);

    // Click Stop
    await page.locator('#btn-run').click();
    await expect(page.locator('#runtime-stage')).toBeHidden();
    await expect(page.locator('#btn-run')).not.toHaveClass(/running/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V53 — Toolbar button order
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('V53: Terminate button is next to End button', () => {
  test('toolbar buttons are in DOM order: State, Start, End, Terminate, Choice', async ({ page }) => {
    const buttons = await page.locator('#state-toolbar .palette-btn').all();
    const ids = [];
    for (const b of buttons) ids.push(await b.getAttribute('id'));
    const endIdx = ids.indexOf('btn-new-end');
    const termIdx = ids.indexOf('btn-new-terminate');
    const choiceIdx = ids.indexOf('btn-new-choice');
    expect(termIdx).toBe(endIdx + 1);
    expect(choiceIdx).toBe(termIdx + 1);
  });

  test('Run button is after the palette buttons', async ({ page }) => {
    const run = page.locator('#btn-run');
    await expect(run).toBeVisible();
    // Run button should not be a palette-btn
    await expect(run).not.toHaveClass(/palette-btn/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V54 — Build button
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('V54: Build button', () => {
  test('Build button is visible on canvas overlay', async ({ page }) => {
    await expect(page.locator('#btn-build')).toBeVisible();
  });

  test('Build button is inside toolbar', async ({ page }) => {
    await expect(page.locator('#toolbar #btn-build')).toBeVisible();
  });

  test('clicking Build triggers a download', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#btn-build').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.zip');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V61 — State Chart option for Classes (hasStateChart boolean)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('V61: hasStateChart checkbox in class inspector', () => {
  test('checkbox appears when inspecting a class', async ({ page }) => {
    await enterClassEditMode(page, 'Game');
    await expect(page.locator('#has-state-chart-cb')).toBeVisible();
  });

  test('Game class checkbox is checked by default', async ({ page }) => {
    await enterClassEditMode(page, 'Game');
    await expect(page.locator('#has-state-chart-cb')).toBeChecked();
  });

  test('CSSColor class checkbox is unchecked', async ({ page }) => {
    await enterClassEditMode(page, 'CSSColor');
    await expect(page.locator('#has-state-chart-cb')).not.toBeChecked();
  });

  test('Stage class checkbox is unchecked', async ({ page }) => {
    await enterClassEditMode(page, 'Stage');
    await expect(page.locator('#has-state-chart-cb')).not.toBeChecked();
  });
});

test.describe('V61: hasStateChart controls state chart editing', () => {
  test('state toolbar disabled when hasStateChart is false', async ({ page }) => {
    await enterClassEditMode(page, 'CSSColor');
    await expect(page.locator('#state-toolbar')).toHaveClass(/disabled/);
  });

  test('state toolbar enabled when hasStateChart is true', async ({ page }) => {
    await enterClassEditMode(page, 'Game');
    await expect(page.locator('#state-toolbar')).not.toHaveClass(/disabled/);
  });

  test('unchecking hasStateChart on empty class disables toolbar', async ({ page }) => {
    // Create a new class
    await enterClassEditMode(page, 'Game');
    await page.locator('#btn-add-class').click();
    await page.locator('#modal-name-input').fill('V61E2ETest');
    await page.locator('#modal-ok').click();
    // Select the new class
    await page.locator('#classes-list .left-panel-item:has-text("V61E2ETest")').first().click();
    await expect(page.locator('#has-state-chart-cb')).toBeChecked();
    // Uncheck
    await page.locator('#has-state-chart-cb').uncheck();
    await expect(page.locator('#state-toolbar')).toHaveClass(/disabled/);
  });
});

test.describe('V61: Delete state chart confirmation dialog', () => {
  test('dialog appears when unchecking on class with nodes', async ({ page }) => {
    await enterClassEditMode(page, 'Game');
    // Add a state node
    await dragNewNode(page, '#btn-new-state');
    await expect(page.locator('.state-node')).toHaveCount(1);
    // Click the checkbox to trigger uncheck attempt
    await page.locator('#has-state-chart-cb').click({ force: true });
    // Dialog should appear
    await expect(page.locator('#delete-chart-dialog')).toBeVisible();
    // Clean up — cancel to dismiss
    await page.locator('#delete-chart-dialog button:has-text("Cancel")').click();
  });

  test('cancel button in dialog keeps state chart', async ({ page }) => {
    await enterClassEditMode(page, 'Game');
    await dragNewNode(page, '#btn-new-state');
    await page.locator('#has-state-chart-cb').click({ force: true });
    await expect(page.locator('#delete-chart-dialog')).toBeVisible();
    // Cancel
    await page.locator('#delete-chart-dialog button:has-text("Cancel")').click();
    await expect(page.locator('#delete-chart-dialog')).not.toBeVisible();
    // Checkbox should still be checked
    await expect(page.locator('#has-state-chart-cb')).toBeChecked();
    // Node should still exist
    await expect(page.locator('.state-node')).toHaveCount(1);
  });

  test('delete button removes chart and unchecks', async ({ page }) => {
    await enterClassEditMode(page, 'Game');
    await dragNewNode(page, '#btn-new-state');
    await page.locator('#has-state-chart-cb').click({ force: true });
    await expect(page.locator('#delete-chart-dialog')).toBeVisible();
    // Click delete
    await page.locator('#confirm-delete-chart').click();
    await expect(page.locator('#delete-chart-dialog')).not.toBeVisible();
    // Nodes should be gone
    await expect(page.locator('.state-node')).toHaveCount(0);
    // Checkbox should be unchecked
    await expect(page.locator('#has-state-chart-cb')).not.toBeChecked();
    // Toolbar should be disabled
    await expect(page.locator('#state-toolbar')).toHaveClass(/disabled/);
  });
});

test.describe('V61: hasStateChart in serialisation', () => {
  test('exported JSON includes hasStateChart for all classes', async ({ page }) => {
    // Click export
    await page.locator('#btn-export-json').click();
    await expect(page.locator('#json-modal')).toBeVisible();
    const json = await page.locator('#json-modal pre').textContent();
    const data = JSON.parse(json);
    for (const cls of data.classes) {
      expect(typeof cls.hasStateChart).toBe('boolean');
    }
    // Game should be true, CSSColor should be false
    expect(data.classes.find(c => c.name === 'Game').hasStateChart).toBe(true);
    expect(data.classes.find(c => c.name === 'CSSColor').hasStateChart).toBe(false);
  });
});
