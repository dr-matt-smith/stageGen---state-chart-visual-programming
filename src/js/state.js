/**
 * Central mutable state store.
 * All app state lives here — import and mutate directly.
 */
export const S = {
  zoom: 1,
  panX: 0,
  panY: 0,
  activeTool: 'select',
  nextId: 1,
  nextConnId: 1,

  nodes: [],
  connections: [],

  // V44: project-level collections
  nextObjId: 1,
  nextClassId: 1,
  nextEnumId: 1,
  objects: [],          // { id, name, classId, builtIn, nodes, connections, nextId, nextConnId }
  classes: [],          // { id, name, properties: [{ name, type, enumClassId? }], builtIn }
  enumClasses: [],      // { id, name, values: [string], builtIn }
  activeObjectId: null,
  selectedLeftPanelItem: null, // { kind: 'object'|'class'|'enum', id }

  // Currently active / selected
  activeNode: null,
  selectedConn: null,
  selectedNodes: [],

  // Editing
  editingNode: null,
  editingConn: null,
  connLabelInput: null,

  // Interaction flags
  isPanning: false,
  panOrigin: null,

  draggingNode: null,
  didDragNode: false,

  creatingNode: false,
  creatingNodeType: null,
  ghostEl: null,

  draggingMinimapVP: false,
  mmVPGrabOffset: { x: 0, y: 0 },

  resizingNode: null,

  selectionRect: null,
  selectionBoxEl: null,
  draggingGroup: null,

  drawingConn: null,
  reconnDrag: null,

  // Callbacks (set by main.js)
  onSelectionChange: null,
};

/** Initialise built-in classes, enums and the default game object. */
export function initDefaults() {
  if (S.enumClasses.length > 0) return; // already initialised

  const gameTypeEnum = {
    id: S.nextEnumId++,
    name: 'GameType',
    values: ['ARCADE', 'PLATFORMER', 'SHOOTER', 'PUZZLE', 'OTHER'],
    builtIn: true,
  };
  S.enumClasses.push(gameTypeEnum);

  const gameClass = {
    id: S.nextClassId++,
    name: 'Game',
    properties: [
      { name: 'name', type: 'String' },
      { name: 'description', type: 'String' },
      { name: 'category', type: 'EnumClass', enumClassId: gameTypeEnum.id },
    ],
    builtIn: true,
  };
  S.classes.push(gameClass);

  const gameObj = {
    id: S.nextObjId++,
    name: 'game',
    classId: gameClass.id,
    builtIn: true,
    nodes: [],
    connections: [],
    nextId: 1,
    nextConnId: 1,
  };
  S.objects.push(gameObj);
  S.activeObjectId = gameObj.id;
}
