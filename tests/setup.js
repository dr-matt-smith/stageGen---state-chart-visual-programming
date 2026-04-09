/**
 * DOM setup for tests. Must be called before importing main.js,
 * because modules grab DOM references at load time.
 */
export function setupDOM() {
  document.body.innerHTML = `
    <div id="toolbar">
      <button id="btn-new-state" class="toolbar-btn palette-btn" draggable="false">State</button>
      <button id="btn-new-start" class="toolbar-btn palette-btn" draggable="false"></button>
      <button id="btn-new-end" class="toolbar-btn palette-btn" draggable="false"></button>
      <button id="btn-new-choice" class="toolbar-btn palette-btn" draggable="false"></button>
    </div>
    <div id="main-area">
      <div id="left-panel">
        <div class="left-panel-section">
          <div class="left-panel-header"><span>Objects</span><button id="btn-add-object" class="left-panel-add-btn">+</button></div>
          <div id="objects-list" class="left-panel-list"></div>
        </div>
        <div class="left-panel-section">
          <div class="left-panel-header"><span>Classes</span><button id="btn-add-class" class="left-panel-add-btn">+</button></div>
          <div id="classes-list" class="left-panel-list"></div>
        </div>
        <div class="left-panel-section">
          <div class="left-panel-header"><span>Enum Classes</span><button id="btn-add-enum" class="left-panel-add-btn">+</button></div>
          <div id="enums-list" class="left-panel-list"></div>
        </div>
      </div>
      <div id="divider-left"></div>
      <div id="canvas-container" style="width:800px;height:600px;">
        <div id="canvas" style="width:4000px;height:3000px;">
          <svg id="connections-svg" xmlns="http://www.w3.org/2000/svg"></svg>
        </div>
        <div id="zoom-toolbar">
          <button id="btn-fit-all" class="toolbar-btn"></button>
          <button id="btn-zoom-out" class="toolbar-btn"></button>
          <input id="zoom-slider" type="range" min="8" max="500" value="100">
          <button id="btn-zoom-in" class="toolbar-btn"></button>
          <span id="zoom-label" class="zoom-label">100%</span>
          <button id="btn-hand-tool" class="toolbar-btn tool-btn"></button>
          <button id="btn-theme-toggle" class="toolbar-btn">&#9788; Light</button>
        </div>
        <div id="canvas-overlay-buttons">
          <button id="btn-export-json" class="toolbar-btn">Export JSON</button>
        </div>
        <div id="minimap" style="width:200px;height:150px;">
          <div id="minimap-states"></div>
          <div id="minimap-viewport"></div>
          <span id="minimap-label">MAP</span>
          <button id="minimap-minimize">_</button>
        </div>
        <button id="minimap-restore" style="display:none;">Minimap</button>
      </div>
      <div id="divider"></div>
      <div id="inspector">
        <div id="inspector-tabs">
          <button class="inspector-tab active" data-tab="inspector">Inspector</button>
        </div>
        <div id="inspector-panel" class="tab-panel">
          <div id="inspector-body">
            <p id="inspector-empty">No object selected</p>
            <div id="inspector-props" style="display:none;">
              <table id="inspector-table"><tbody></tbody></table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
