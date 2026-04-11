'use strict';

/**
 * Runtime engine using the functional state pattern.
 * Each object gets a runtime context that tracks its current state and property values.
 * States are represented as data (node references), not class instances.
 */

import { S } from './state.js';

// ── Runtime state ───────────────────────────────────────────────────────────

let running = false;
let tickTimer = null;
let contexts = [];       // runtime context per object
let keyState = new Set(); // currently pressed keys
let keyUpState = new Set(); // keys released since last tick
let startTime = 0;

export function isRunning() { return running; }

// ── Object runtime context (functional state pattern) ───────────────────────

function createContext(obj) {
  const cls = S.classes.find(c => c.id === obj.classId);
  const props = {};

  // Initialise properties from class defaults and object values
  if (cls) {
    for (const p of cls.properties) {
      props[p.name] = obj.propertyValues?.[p.name] ?? p.defaultValue ?? '';
    }
  }
  // Stage special properties
  if (obj.stageProperties) {
    for (const p of obj.stageProperties) {
      props[p.name] = obj.propertyValues?.[p.name] ?? '';
    }
  }

  return {
    objId: obj.id,
    objName: obj.name,
    classId: obj.classId,
    className: cls ? cls.name : null,
    props,
    currentNodeId: null, // will be set to start node's first transition target
    nodes: cls?.nodes || obj.nodes || [],
    connections: cls?.connections || obj.connections || [],
  };
}

// ── State transitions ───────────────────────────────────────────────────────

function findStartNode(ctx) {
  return ctx.nodes.find(n => n.type === 'start');
}

function getOutgoingConnections(ctx, nodeId) {
  return ctx.connections.filter(c => c.fromId === nodeId);
}

function enterState(ctx, nodeId) {
  const node = ctx.nodes.find(n => n.id === nodeId);
  if (!node) return;
  ctx.currentNodeId = nodeId;

  // Execute entry behaviours
  if (node.entryBehaviours) {
    for (const b of node.entryBehaviours) executeBehaviour(ctx, b);
  }
}

function exitState(ctx) {
  const node = ctx.nodes.find(n => n.id === ctx.currentNodeId);
  if (!node) return;
  // Execute exit behaviours
  if (node.exitBehaviours) {
    for (const b of node.exitBehaviours) executeBehaviour(ctx, b);
  }
}

function executeDoBehaviours(ctx) {
  const node = ctx.nodes.find(n => n.id === ctx.currentNodeId);
  if (!node) return;
  if (node.doBehaviours) {
    for (const b of node.doBehaviours) executeBehaviour(ctx, b);
  }
}

// ── Behaviour execution ─────────────────────────────────────────────────────

function executeBehaviour(ctx, behaviour) {
  if (!behaviour || !behaviour.trim()) return;
  const b = behaviour.trim();

  // Handle move() for Sprite objects
  if (b === 'move()' && ctx.className === 'Sprite') {
    const x = parseFloat(ctx.props.xPosition) || 0;
    const y = parseFloat(ctx.props.yPosition) || 0;
    const dx = parseFloat(ctx.props.dx) || 0;
    const dy = parseFloat(ctx.props.dy) || 0;
    ctx.props.xPosition = String(x + dx);
    ctx.props.yPosition = String(y + dy);
    return;
  }

  // Handle property assignment: propName = value
  const assignMatch = b.match(/^(\w+)\s*=\s*(.+)$/);
  if (assignMatch) {
    const [, prop, value] = assignMatch;
    ctx.props[prop] = evaluateExpression(ctx, value.trim());
    return;
  }

  // Handle method calls: MethodName(args)
  const callMatch = b.match(/^(\w+)\(([^)]*)\)$/);
  if (callMatch) {
    const [, method, args] = callMatch;
    executeMethod(ctx, method, args.trim());
    return;
  }
}

function executeMethod(ctx, method, args) {
  // Sound methods: <PropName>Play(), <PropName>Pause(), <PropName>SetLooping()
  // CSSColor methods: setColor(), setR(), etc.
  // For now these are recorded but don't produce real audio/visual effects
  // in the runtime — they set flags on the context
  if (!ctx._methodCalls) ctx._methodCalls = [];
  ctx._methodCalls.push({ method, args });
}

function evaluateExpression(ctx, expr) {
  // Simple expression evaluation
  if (expr === 'true') return 'true';
  if (expr === 'false') return 'false';
  if (!isNaN(expr)) return expr;
  // Property reference
  if (ctx.props.hasOwnProperty(expr)) return ctx.props[expr];
  // Simple arithmetic: prop + value, prop - value
  const arithMatch = expr.match(/^(\w+)\s*([+\-*/])\s*(.+)$/);
  if (arithMatch) {
    const [, left, op, right] = arithMatch;
    const l = parseFloat(ctx.props.hasOwnProperty(left) ? ctx.props[left] : left) || 0;
    const r = parseFloat(ctx.props.hasOwnProperty(right) ? ctx.props[right] : right) || 0;
    switch (op) {
      case '+': return String(l + r);
      case '-': return String(l - r);
      case '*': return String(l * r);
      case '/': return r !== 0 ? String(l / r) : '0';
    }
  }
  return expr;
}

// ── Event evaluation ────────────────────────────────────────────────────────

function evaluateEvent(conn, ctx) {
  if (!conn.event) return true; // no event = auto-transition (completion)
  const { type, value } = conn.event;
  switch (type) {
    case 'after': {
      const secs = parseFloat(value) || 0;
      const elapsed = (Date.now() - startTime) / 1000;
      return elapsed >= secs;
    }
    case 'when': {
      return evaluateCondition(ctx, value);
    }
    case 'keyDown': {
      return keyState.has(value);
    }
    case 'keyUp': {
      return keyUpState.has(value);
    }
    default:
      return false;
  }
}

function evaluateGuard(conn, ctx) {
  if (!conn.guardCondition) return true;
  return evaluateCondition(ctx, conn.guardCondition);
}

function evaluateCondition(ctx, expr) {
  if (!expr) return true;
  const e = expr.trim();
  if (e === 'true') return true;
  if (e === 'false') return false;

  // Comparison: prop == value, prop != value, prop > value, etc.
  const compMatch = e.match(/^(\w+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (compMatch) {
    const [, left, op, right] = compMatch;
    const l = ctx.props.hasOwnProperty(left) ? ctx.props[left] : left;
    const r = ctx.props.hasOwnProperty(right.trim()) ? ctx.props[right.trim()] : right.trim();
    const ln = parseFloat(l), rn = parseFloat(r);
    const numeric = !isNaN(ln) && !isNaN(rn);
    switch (op) {
      case '==': return numeric ? ln === rn : l === r;
      case '!=': return numeric ? ln !== rn : l !== r;
      case '>':  return ln > rn;
      case '<':  return ln < rn;
      case '>=': return ln >= rn;
      case '<=': return ln <= rn;
    }
  }
  return false;
}

// ── Tick ─────────────────────────────────────────────────────────────────────

function tick() {
  for (const ctx of contexts) {
    if (ctx.currentNodeId == null) continue;
    const node = ctx.nodes.find(n => n.id === ctx.currentNodeId);
    if (!node) continue;

    // If in a terminate state, do nothing
    if (node.type === 'terminate') continue;

    // Execute do behaviours
    executeDoBehaviours(ctx);

    // Check outgoing transitions
    const outgoing = getOutgoingConnections(ctx, ctx.currentNodeId);
    for (const conn of outgoing) {
      if (evaluateEvent(conn, ctx) && evaluateGuard(conn, ctx)) {
        // Execute transition behaviours
        if (conn.behaviours) {
          for (const b of conn.behaviours) executeBehaviour(ctx, b);
        }
        // Exit current state, enter new state
        exitState(ctx);
        enterState(ctx, conn.toId);
        break; // only take first matching transition
      }
    }
  }

  // Clear keyUp state after processing all contexts
  keyUpState.clear();

  if (_onTick) _onTick(contexts);
}

// ── Start / Stop ────────────────────────────────────────────────────────────

let _onTick = null;
let _onStart = null;
let _onStop = null;
export function setRuntimeCallbacks(onStart, onTick, onStop) {
  _onStart = onStart;
  _onTick = onTick;
  _onStop = onStop;
}

export function startRuntime() {
  if (running) return { ok: false, errors: ['Already running'] };

  // Validate: each object (except stage) needs a start node
  const errors = [];
  for (const obj of S.objects) {
    if (obj.name === 'stage') continue;
    const cls = S.classes.find(c => c.id === obj.classId);
    const nodes = cls ? (cls.id === S.activeClassId ? S.nodes : (cls.nodes || [])) : [];
    const hasStart = nodes.some(n => n.type === 'start');
    if (!hasStart && nodes.length > 0) {
      errors.push(`Object "${obj.name}" is missing a Start state`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  running = true;
  startTime = Date.now();
  keyState.clear();
  keyUpState.clear();
  contexts = [];

  // Create runtime contexts for each object
  for (const obj of S.objects) {
    // Get state chart from the object's class (V59)
    const cls = S.classes.find(c => c.id === obj.classId);
    const liveNodes = cls && cls.id === S.activeClassId ? S.nodes : (cls?.nodes || []);
    const liveConns = cls && cls.id === S.activeClassId ? S.connections : (cls?.connections || []);
    const liveObj = { ...obj, nodes: liveNodes, connections: liveConns };
    const ctx = createContext(liveObj);

    // Find start node and follow its first transition
    const startNode = findStartNode(ctx);
    if (startNode) {
      const firstConn = getOutgoingConnections(ctx, startNode.id)[0];
      if (firstConn && firstConn.toId != null) {
        enterState(ctx, firstConn.toId);
      }
    }

    contexts.push(ctx);
  }

  // Get tick interval from game object
  const gameCtx = contexts.find(c => c.objName === 'game');
  const interval = gameCtx ? (parseFloat(gameCtx.props.tickIntervalSeconds) || 0.1) : 0.1;

  // Install keyboard listeners
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Start tick loop
  tickTimer = setInterval(tick, interval * 1000);

  if (_onStart) _onStart(contexts);
  return { ok: true, errors: [] };
}

export function stopRuntime() {
  if (!running) return;
  running = false;
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);
  keyState.clear();
  keyUpState.clear();
  if (_onStop) _onStop();
  contexts = [];
}

export function getRuntimeContexts() { return contexts; }

// ── Keyboard handlers ───────────────────────────────────────────────────────

const KEY_MAP = {
  ' ': 'SPACE', Escape: 'ESCAPE', Enter: 'ENTER', Control: 'CONTROL',
  Shift: 'LEFT_SHIFT', Meta: 'WINDOWS_COMMAND',
  Backspace: 'BACKSPACE', Delete: 'DELETE',
  ArrowLeft: 'ARROW_LEFT', ArrowRight: 'ARROW_RIGHT',
  ArrowUp: 'ARROW_UP', ArrowDown: 'ARROW_DOWN',
};

function normaliseKey(e) {
  if (KEY_MAP[e.key]) return KEY_MAP[e.key];
  if (e.key.length === 1) return e.key.toUpperCase();
  return e.key;
}

function onKeyDown(e) {
  if (!running) return;
  keyState.add(normaliseKey(e));
}

function onKeyUp(e) {
  if (!running) return;
  const key = normaliseKey(e);
  keyState.delete(key);
  keyUpState.add(key);
}
