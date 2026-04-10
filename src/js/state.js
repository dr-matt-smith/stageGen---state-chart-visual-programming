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

  const specialKeyEnum = {
    id: S.nextEnumId++,
    name: 'SpecialKeyType',
    values: [
      'SPACE', 'ESCAPE', 'ENTER', 'CONTROL',
      'LEFT_SHIFT', 'RIGHT_SHIFT', 'WINDOWS_COMMAND',
      'BACKSPACE', 'DELETE',
      'ARROW_LEFT', 'ARROW_RIGHT', 'ARROW_UP', 'ARROW_DOWN',
    ],
    builtIn: true,
  };
  S.enumClasses.push(specialKeyEnum);

  const gameTypeEnum = {
    id: S.nextEnumId++,
    name: 'GameType',
    values: ['ARCADE', 'PLATFORMER', 'SHOOTER', 'PUZZLE', 'OTHER'],
    builtIn: true,
  };
  S.enumClasses.push(gameTypeEnum);

  // ── CSSColor class ──
  const cssColorClass = {
    id: S.nextClassId++,
    name: 'CSSColor',
    properties: [],
    methods: [
      { name: 'setColor', signature: 'setColor(colorName)', description: 'Set CSS color by name' },
      { name: 'setR', signature: 'setR(redValue)', description: 'Set red channel (0-255)' },
      { name: 'setG', signature: 'setG(greenValue)', description: 'Set green channel (0-255)' },
      { name: 'setB', signature: 'setB(blueValue)', description: 'Set blue channel (0-255)' },
      { name: 'setTransparency', signature: 'setTransparency(alpha)', description: 'Set transparency (0..1)' },
    ],
    builtIn: true,
  };
  S.classes.push(cssColorClass);

  // ── Game class ──
  const gameClass = {
    id: S.nextClassId++,
    name: 'Game',
    properties: [
      { name: 'name', type: 'String' },
      { name: 'description', type: 'String' },
      { name: 'category', type: 'EnumClass', enumClassId: gameTypeEnum.id },
      { name: 'tickIntervalSeconds', type: 'Real', defaultValue: '0.1' },
    ],
    builtIn: true,
  };
  S.classes.push(gameClass);

  // ── Sprite class ──
  const spriteClass = {
    id: S.nextClassId++,
    name: 'Sprite',
    properties: [
      { name: 'name', type: 'String' },
      { name: 'displayImage', type: 'Image' },
      { name: 'moveSound', type: 'Sound' },
      { name: 'visible', type: 'Boolean', defaultValue: 'true' },
      { name: 'xPosition', type: 'Real' },
      { name: 'yPosition', type: 'Real' },
      { name: 'dx', type: 'Real' },
      { name: 'dy', type: 'Real' },
      { name: 'tint', type: 'Object', objectClassId: cssColorClass.id },
    ],
    methods: [
      { name: 'move', signature: 'move()', description: 'Add dx to xPosition, dy to yPosition' },
    ],
    builtIn: true,
  };
  S.classes.push(spriteClass);

  // ── Built-in objects ──
  const gameObj = {
    id: S.nextObjId++,
    name: 'game',
    classId: gameClass.id,
    builtIn: true,
    nodes: [],
    connections: [],
    nextId: 1,
    nextConnId: 1,
    propertyValues: { tickIntervalSeconds: '0.1' },
  };
  S.objects.push(gameObj);

  const stageObj = {
    id: S.nextObjId++,
    name: 'stage',
    classId: null, // special built-in, no class
    builtIn: true,
    nodes: [],
    connections: [],
    nextId: 1,
    nextConnId: 1,
    propertyValues: { xMin: '0', yMin: '0', xMax: '800', yMax: '600', backgroundColour: 'white' },
    stageProperties: [
      { name: 'xMin', type: 'Real' },
      { name: 'yMin', type: 'Real' },
      { name: 'xMax', type: 'Real' },
      { name: 'yMax', type: 'Real' },
      { name: 'backgroundColour', type: 'String' },
    ],
  };
  S.objects.push(stageObj);

  S.activeObjectId = gameObj.id;
}
