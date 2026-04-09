[project_design_document.md](project_design_document.md)I want to create a prototype of a simple state chart style tool, for a visual programming langauge


Version 43 - State Chart Only (Fungus Removal)
==================

- ✅ Removed Fungus FlowChart mode and all related features
  - ✅ Removed diagram mode toggle (app is now always in State Chart mode)
  - ✅ Removed mode label from top-left of screen
  - ✅ Deleted fungus-mode.js, fungus-mode.css, engine.js, commands.js, audio-manifest.js
  - ✅ Removed Play All, Play Step by Step, Stop, Run Log buttons
  - ✅ Removed Events tab, Variables tab, Enums tab
  - ✅ Removed command system (Say, Wait, Call, Menu, etc.)
  - ✅ Removed execution engine and step-by-step debugger
  - ✅ Removed node.event, node.commands, node.description from data model
  - ✅ Removed S.messages, S.variables, S.enums from state
  - ✅ Removed auto-connections (createAutoConnection)
  - ✅ Removed Fungus-specific inspector sections
  - ✅ Removed public/audio/ and Fungus screenshots
  - ✅ Context menu (right-click Delete/Duplicate) now works for all nodes
  - ✅ Resize handles and connection handles always show when a node is active
  - ✅ Simplified JSON export (no variables, events, or commands)
  - ✅ Updated all Vitest and Playwright tests
  - ✅ Settings panel retained for Theme toggle only

Version 43.5 - Settings cog removal, theme toggle in toolbar
==================

- ✅ Removed settings cog button from inspector tabs
- ✅ Removed settings panel (radio buttons for theme)
- ✅ Added light/dark theme toggle button to top-right of toolbar (always visible)
- ✅ Made light mode the default theme
- ✅ Updated all Vitest and Playwright tests

Version 44 - Add Class, Enum Class, Object list panel
==================

- ✅ When an object is selected in the left panel, its State Chart is displayed
  - ✅ Each state chart is associated with an object
  - ✅ Switching objects saves/restores canvas state (nodes, connections, DOM elements)

- ✅ Every project has one default object "game" of the class Game
  - ✅ This object cannot be deleted (builtIn flag)
  - ✅ Class Game has properties:
    - name: String
    - description: String
    - category: GameType
  - ✅ GameType is a built-in Enum Class with editable values:
    - ARCADE, PLATFORMER, SHOOTER, PUZZLE, OTHER

- ✅ Left panel on the left of the screen with resizable divider
  - ✅ Objects list (top row) with "+" button
  - ✅ Classes list (middle row) with "+" button
  - ✅ Enum Classes list (bottom row) with "+" button
  - ✅ Active object highlighted with blue left border
  - ✅ Non-built-in items show delete button on hover

- ✅ Each Object is an instance of a class
  - e.g. Object "ship" is an object of the "Sprite" class
    - Sprites have properties:
      - name: String
      - xPosition: Integer
      - yPosition: Integer
      - image: Image (link to file /public/images/ship.png)
      - moveSound: Sound (link to file /public/audio/shipMove.wav)
      - explosionSound: Sound (link to file /public/audio/explosion.wav)

- ✅ A selected class shows its properties in the Inspector panel on the right
  - ✅ Editable class name
  - ✅ Editable property names
  - ✅ Property type dropdown with supported data types:
    - Integer, Real, Character, String, Boolean, Enum Class, Image, Sound, Object
  - ✅ Add Property button
  - ✅ Delete property button per row

- ✅ For Enum Classes:
  - ✅ Values listed (not variables) in the Inspector
  - ✅ All enum values forced to CAPS CASE (auto-uppercase on input)
  - ✅ e.g. Enum Class 'Fruits' with values: APPLE, ORANGE, GRAPE
  - ✅ Enum Class is a permitted data type for class properties
    - ✅ When a property's type is set to Enum Class, a sub-dropdown of all declared Enum Classes appears

- ✅ JSON export updated to include objects, classes, and enumClasses
- ✅ Added 26 new Vitest unit tests (110 total)
- ✅ Added 23 new Playwright e2e tests (91 total)

Version 45 - Move zoom toolbar into the diagram stage
==================

- ✅ Moved zoom toolbar from fixed viewport position to inside the canvas container
  - ✅ Positioned at top-left of the diagram stage area (absolute, top: 10px, left: 10px)
  - ✅ No longer overlaps the left objects/classes panel
  - ✅ Toolbar is fully inside the diagram 'stage' rectangle area
- ✅ Added 2 new Vitest unit tests (112 total)
- ✅ Added 4 new Playwright e2e tests (95 total)