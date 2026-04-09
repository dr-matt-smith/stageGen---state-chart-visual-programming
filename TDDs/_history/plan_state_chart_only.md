# Plan: Remove Fungus Features - State Chart Only Project

## Overview

This document describes the plan to remove the Fungus FlowChart mode and related features from the stateGen project, making it a dedicated state chart diagram editor.

## Goal

Strip out all Fungus-specific functionality (execution engine, commands, events, block classification, auto-connections) while preserving and strengthening the core state chart diagramming capabilities (states, transitions, start/end/choice nodes, inspector, minimap, zoom, export).

---

## Features to Remove

### 1. Fungus Mode Toggle & Settings

- Remove the diagram mode setting (`S.diagramMode`) and all `'fungus'`/`'statechart'` branching logic
- Remove the Fungus/State Chart radio buttons from the Settings panel
- Remove the mode label shown at the top-left of the screen (e.g. "Fungus Mode (change in Settings tab)")
- The app should always behave as State Chart mode

**Files affected:**
- `src/js/state.js` - remove `diagramMode` from state
- `src/js/main.js` - remove mode-switching logic and mode label
- Settings panel UI (in `index.html` and related JS)

### 2. Fungus Mode Module

- Delete `src/js/fungus-mode.js` entirely
  - `enterFungusMode()` / `exitFungusMode()`
  - `classifyBlock()` (event/branching/standard classification)
  - `applyFungusStyles()` / `clearFungusStyles()`
  - `syncAutoConnections()` (auto-created connections from Call/Menu commands)
  - `updateEventAnnotation()` / `updateDescriptionLabel()`

- Delete `src/css/fungus-mode.css` entirely
  - Event block styles (blue rounded)
  - Standard block styles (yellow)
  - Branching block styles (orange hexagon)
  - Auto-connection styles
  - Hidden palette items overrides
  - Context menu styles

### 3. Execution Engine

- Delete `src/js/engine.js` entirely
  - `startExecution()` (Play All)
  - `startStepExecution()` / `stepNext()` (Play Step by Step / debugger)
  - All command execution logic (Say, Wait, Play Sound/Music, Send Message, Set Variable, Call, Menu)
  - Run log generation

- Remove from toolbar:
  - Play All button
  - Play Step by Step button
  - Run Log button

### 4. Commands System

- Delete `src/js/commands.js` entirely
  - `EVENT_TYPES` (gameStarted, messageReceived, keyPressed)
  - `COMMAND_TYPES` (say, menu, call, wait, playSound, playMusic, stopAudio, sendMessage, setVariable variants)

### 5. Audio System

- Delete `src/js/audio-manifest.js`
- Delete `/public/audio/` folder and all audio files

### 6. Inspector - Fungus-Specific Sections

- Remove from `src/js/inspector.js`:
  - Block command list display
  - Command editor section
  - "Execute on Event" dropdown
  - Block description field
  - Move up/down arrows for commands
  - Command summary rows
- Keep for state chart mode:
  - Object type, name, ID display
  - Size and position properties
  - Connection list

### 7. Tabs - Events, Variables, Enums

These tabs and their data models were introduced primarily for the Fungus execution model:

- **Events tab** (formerly "Messages") - Remove entirely
  - Remove user-defined event messages list
  - Remove `S.messages` from state

- **Variables tab** - Remove entirely
  - Remove global variables system
  - Remove `S.variables` from state
  - Remove variable types (Boolean, Integer, Float, String, Enum)

- **Enums tab** - Remove entirely
  - Remove enum set declarations
  - Remove `S.enums` from state

### 8. Node/Block Fungus Properties

- Remove from node data model (`src/js/nodes/node-model.js`):
  - `node.event` (event trigger)
  - `node.commands` (command sequence)
  - `node.description` (block description)

- Remove Fungus-specific node behaviours:
  - Context menu (right-click Delete/Duplicate) - or keep if useful for state chart mode
  - Hidden resize handles in Fungus mode (resize handles should always show)
  - Block naming convention ("New Block N") - keep only "State N"

### 9. State Properties Cleanup

- Remove from `src/js/state.js`:
  - `S.diagramMode`
  - `S.messages` (event messages)
  - `S.variables` (global variables)
  - `S.enums` (enum sets)
  - Any execution-related state (current block, step mode, run log)

---

## Features to Keep

- State, Start, End, and Choice node types (with full palette)
- Manual transition connectors with labels and arrows
- Node resize handles
- Inspector panel showing selected object properties (type, name, size, position, connections)
- Minimap
- Pan, zoom, fit-all
- Export to JSON
- Settings panel (retain for theme toggle light/dark, and any future settings)
- All CSS for state chart styling (`styles.css`, `theme.css`, `toolbar.css`, `zoom-toolbar.css`, `choice-node.css`, `connectors.css`, `minimap.css`, `inspector.css`, `settings.css`)

---

## Implementation Order

### Phase 1: Remove Mode Toggle
1. Remove the mode radio buttons from Settings
2. Remove `S.diagramMode` and all conditional checks for `'fungus'` vs `'statechart'`
3. Remove the mode label from the top-left of the screen
4. Ensure the app always runs in state chart behaviour

### Phase 2: Remove Fungus Modules
5. Delete `src/js/fungus-mode.js`
6. Delete `src/css/fungus-mode.css`
7. Delete `src/js/engine.js`
8. Delete `src/js/commands.js`
9. Delete `src/js/audio-manifest.js`
10. Remove all imports of these deleted modules from `main.js` and any other files

### Phase 3: Remove Fungus UI
11. Remove Play All, Play Step by Step, Run Log buttons from toolbar
12. Remove Events tab, Variables tab, Enums tab
13. Strip Fungus-specific sections from the Inspector (commands list, command editor, event trigger, description)
14. Remove context menu if it was Fungus-only (or keep if useful)

### Phase 4: Clean Up Data Model
15. Remove `node.event`, `node.commands`, `node.description` from node creation
16. Remove `S.messages`, `S.variables`, `S.enums`, and execution state from `state.js`
17. Clean up `config.js` if it has Fungus-specific constants

### Phase 5: Clean Up Assets
18. Delete `/public/audio/` folder
19. Delete `/public/images/` if only used by Fungus features (verify first)
20. Remove any Fungus-related screenshots from `/screenshots/`

### Phase 6: Update Tests
21. Remove or rewrite Vitest unit tests that test Fungus functionality
22. Remove or rewrite Playwright e2e tests that test Fungus functionality
23. Ensure all remaining state chart tests pass
24. Add any new tests needed for areas where Fungus removal changed behaviour

### Phase 7: Documentation & Cleanup
25. Update `TDDs/project_design_document.md` to note the Fungus removal
26. Update `TDDs/future_features.md` to remove the design document TODO
27. Remove any dead code, unused imports, or orphaned CSS selectors
28. Final manual smoke test of all state chart features

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Shared code accidentally removed | Review each shared module (nodes, connections, inspector, state) carefully before deleting Fungus-specific parts |
| Broken imports after module deletion | Search all JS files for imports of deleted modules; run the app and check console for errors |
| CSS selectors left orphaned | Search for class names used only in deleted CSS; remove from HTML/JS |
| Tests referencing removed features | Run full test suite after each phase; fix broken tests immediately |
| Export JSON format changes | Verify JSON export still works and produces valid state chart JSON |

---

## Estimated Scope

- ~5 files to delete entirely (`fungus-mode.js`, `fungus-mode.css`, `engine.js`, `commands.js`, `audio-manifest.js`)
- ~5 files requiring significant edits (`state.js`, `main.js`, `inspector.js`, `index.html`, node modules)
- ~10+ test files to update
- Asset folders to clean up (`/public/audio/`)
