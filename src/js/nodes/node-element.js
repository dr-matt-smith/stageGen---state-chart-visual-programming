/**
 * DOM element construction and font sizing for nodes.
 */

export function buildNodeElement(type, id) {
  const el = document.createElement('div');
  el.className = `diagram-node ${type}-node`;
  el.dataset.id   = String(id);
  el.dataset.type = type;
  el.dataset.testid = `node-${type}-${id}`;

  if (type === 'choice') {
    el.innerHTML =
      '<svg class="choice-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
        '<polygon points="50,2 98,50 50,98 2,50"/>' +
      '</svg>' +
      '<span class="node-label">?</span>';
  } else if (type === 'state') {
    el.innerHTML = `<span class="node-label">State ${id}</span>`;
  } else if (type === 'start') {
    el.innerHTML = '<span class="node-label-fixed">start</span>';
  } else if (type === 'end') {
    el.innerHTML = '<span class="node-label-fixed">end</span>';
  } else if (type === 'terminate') {
    el.innerHTML =
      '<svg class="terminate-svg" viewBox="0 0 28 28" aria-hidden="true">' +
        '<line x1="4" y1="4" x2="24" y2="24" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '<line x1="24" y1="4" x2="4" y2="24" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
      '</svg>';
  }

  // ID label at top-right inside the node
  const idSpan = document.createElement('span');
  idSpan.className = 'node-id-label';
  idSpan.textContent = `id: ${id}`;
  el.appendChild(idSpan);

  if (type === 'state' || type === 'choice') {
    const btn = document.createElement('button');
    btn.className = 'node-reset-btn';
    btn.title     = 'Reset to default size';
    btn.textContent = '↺';
    btn.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); });
    el.appendChild(btn);
  }

  return el;
}

export function fitLabelFontSize(node) {
  if (node.type !== 'state' && node.type !== 'choice') return;
  const labelEl = node.el.querySelector('.node-label');
  if (!labelEl) return;

  const MAX_FONT = 200;
  const MIN_FONT = 6;

  let availH, availW;
  if (node.type === 'choice') {
    availH = node.h * 0.48 - 4;
    availW = node.w * 0.48 - 4;
  } else {
    availH = node.h - 8;
    availW = node.w - 12;
  }

  let lo = MIN_FONT, hi = MAX_FONT, best = MIN_FONT;
  while (lo <= hi) {
    const mid = (lo + hi) / 2;
    labelEl.style.fontSize = `${mid}px`;
    if (labelEl.scrollHeight <= availH && labelEl.scrollWidth <= availW) {
      best = mid;
      lo = mid + 0.5;
    } else {
      hi = mid - 0.5;
    }
  }
  labelEl.style.fontSize = `${best}px`;
}
