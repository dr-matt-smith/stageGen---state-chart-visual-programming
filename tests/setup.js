/**
 * DOM setup for tests. Must be called before importing main.js,
 * because modules grab DOM references at load time.
 */
export function setupDOM() {
  document.body.innerHTML = `
    <div id="toolbar">
      <button id="btn-run" class="toolbar-btn run-btn"><svg width="14" height="14" viewBox="0 0 14 14"><polygon points="2,1 12,7 2,13" fill="currentColor"/></svg> Run</button>
      <button id="btn-export-json" class="toolbar-btn">Export JSON</button>
      <button id="btn-load-json" class="toolbar-btn">Load JSON</button>
      <button id="btn-load-example" class="toolbar-btn">Load Example</button>
      <button id="btn-build" class="toolbar-btn">Build</button>
      <button id="btn-theme-toggle" class="toolbar-btn">&#9788; Light</button>
    </div>
    <div id="main-area">
      <div id="left-panel">
        <div id="data-panel-title" class="left-panel-title">Data</div>
        <div id="section-objects" class="left-panel-section">
          <div class="left-panel-header" id="objects-header"><span>Objects</span><button id="btn-add-object" class="left-panel-add-btn">+</button></div>
          <div id="objects-list" class="left-panel-list"></div>
        </div>
        <div id="section-object-props" class="left-panel-section" style="display:none;">
          <div class="left-panel-header"><span id="object-props-title">Properties</span></div>
          <div id="object-props-list" class="left-panel-list"></div>
        </div>
        <div id="section-classes" class="left-panel-section">
          <div class="left-panel-header" id="classes-header"><span>Classes</span><button id="btn-add-class" class="left-panel-add-btn">+</button></div>
          <div id="classes-list" class="left-panel-list"></div>
        </div>
        <div id="section-enums" class="left-panel-section">
          <div class="left-panel-header" id="enums-header"><span>Enum Classes</span><button id="btn-add-enum" class="left-panel-add-btn">+</button></div>
          <div id="enums-list" class="left-panel-list"></div>
        </div>
        <div id="btn-edit-classes" class="left-panel-mode-btn">Edit Classes &amp; Enums</div>
      </div>
      <div id="divider-left"></div>
      <div id="canvas-container" style="width:800px;height:600px;">
        <div id="canvas" style="width:4000px;height:3000px;">
          <svg id="connections-svg" xmlns="http://www.w3.org/2000/svg"></svg>
        </div>
        <div id="canvas-no-object" style="display:none;">Select an object or class to view its state chart</div>
        <div id="runtime-stage" style="display:none;"></div>
        <div id="state-toolbar">
          <button id="btn-new-state" class="toolbar-btn palette-btn" draggable="false">State</button>
          <button id="btn-new-start" class="toolbar-btn palette-btn" draggable="false"></button>
          <button id="btn-new-end" class="toolbar-btn palette-btn" draggable="false"></button>
          <button id="btn-new-terminate" class="toolbar-btn palette-btn" draggable="false"></button>
          <button id="btn-new-choice" class="toolbar-btn palette-btn" draggable="false"></button>
        </div>
        <div id="zoom-toolbar">
          <button id="btn-fit-all" class="toolbar-btn"></button>
          <button id="btn-zoom-out" class="toolbar-btn"></button>
          <input id="zoom-slider" type="range" min="8" max="500" value="100">
          <button id="btn-zoom-in" class="toolbar-btn"></button>
          <span id="zoom-label" class="zoom-label">100%</span>
          <button id="btn-hand-tool" class="toolbar-btn tool-btn"></button>
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
    <div id="modal-overlay" style="display:none;">
      <div id="modal-dialog">
        <div id="modal-header"><span id="modal-title">New Item</span><button id="modal-close" class="json-modal-btn">&times;</button></div>
        <div id="modal-body"></div>
        <div id="modal-footer">
          <button id="modal-ok" class="toolbar-btn">Create</button>
          <button id="modal-cancel" class="toolbar-btn">Cancel</button>
        </div>
      </div>
    </div>
  `;
}
