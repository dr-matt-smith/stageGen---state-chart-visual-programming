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


Version 46 - Object properties in Data panel and state chart per object
==================

- ✅ Renamed left panel to "Data" panel with visible title
  - ✅ Right panel remains "Inspector"

- ✅ Correct current behaviour retained
  - ✅ When a Class or Enum Class is selected in the Data Panel, its values can be edited in the Inspector

- ✅ Behaviour fixed
  - ✅ When an object is selected in the Data panel:
    - ✅ We see the State Chart belonging to that object on the stage
    - ✅ We see the properties of the selected state chart component in the Inspector
    - ✅ We see the properties for the object in the Data panel (new Properties section with editable values)
    - ✅ Class and Enum Class rows are minimised when an object is selected
  - ✅ Each object has its own State Chart diagram
    - ✅ State charts are remembered when switching between objects
    - ✅ e.g. selecting 'game', adding states, switching to 'ship', adding a start state, switching back to 'game' shows game's chart as it was
  - ✅ When a minimised Class or Enum Class header is clicked, the current object is deselected
    - ✅ Full Class and Enum Class lists are restored
    - ✅ Canvas shows "Select an object to view its state chart" overlay when no object selected
    - ✅ State chart cannot be edited when no object is selected
- ✅ Added 11 new Vitest unit tests (123 total)
- ✅ Added 12 new Playwright e2e tests (107 total)

Version 47 features - new object creation
==================

- ✅ New object creation uses a single inline form (not two separate prompts)
  - ✅ Class dropdown appears first, then object name text input (follows typical programming convention)
  - ✅ Form shows OK (✓) and Cancel (✗) buttons
  - ✅ Enter key submits, Escape key cancels
  - ✅ Form hides after successful submission or cancel

- ✅ Deleting an object shows a confirmation dialog ("Delete object 'name'?")
  - ✅ Dismissing the confirmation keeps the object
  - ✅ Accepting the confirmation deletes the object

- ✅ Added 8 new Vitest unit tests (131 total)
- ✅ Added 10 new Playwright e2e tests (117 total)


Version 48 - Editing classes and enum classes
==================

- ✅ "Edit Classes & Enums" button at bottom of Data panel switches to class/enum editing mode
  - ✅ When clicked, Objects section is minimized and Classes/Enums sections are expanded
  - ✅ Can CRUD classes and Enum Classes in this mode
  - ✅ Properties for selected Class/Enum Class appear in Inspector
  - ✅ Canvas shows "Select an object to view its state chart" overlay (no state chart editing in class mode)
  - ✅ Button is hidden while in class mode (no redundant action)
- ✅ Clicking minimized Objects header switches back to object mode (selects first object)
- ✅ Clicking minimized Classes/Enums headers also enters class mode (consistent with V46)
- ✅ Fixed CSS overlap issue where minimized sections intercepted pointer events on adjacent elements
- ✅ Added 7 new Vitest unit tests (138 total)
- ✅ Added 8 new Playwright e2e tests (125 total)


Version 49 - Image/Sound dropdown lists
==================

- ✅ Object properties of type Image render as a dropdown of files from public/images/ (including subfolders)
- ✅ Object properties of type Sound render as a dropdown of files from public/audio/ (including subfolders)
- ✅ File lists are built at compile time using Vite's import.meta.glob (src/js/asset-manifest.js)
- ✅ Dropdowns show a "-- select image/sound --" placeholder option
- ✅ Selected file path is stored in the object's propertyValues
- ✅ Added 7 new Vitest unit tests (145 total)
- ✅ Added 3 new Playwright e2e tests (128 total)


Version 50 - Play sound methods
==================

- ✅ For each Sound-type property on a class, auto-generated methods are shown:
  - ✅ `<PropName>Play()` — play from beginning of sound
  - ✅ `<PropName>Pause()` — pause sound playing
  - ✅ `<PropName>SetLooping(boolean)` — repeat (or not) when sound finishes
  - e.g. property 'music' → MusicPlay(), MusicPause(), MusicSetLooping(boolean)
  - e.g. property 'fireSound' → FireSoundPlay(), FireSoundPause(), FireSoundSetLooping(boolean)
- ✅ Sound Methods section displayed in class inspector (below properties)
- ✅ Sound Methods section displayed in object properties area of Data panel
- ✅ Methods are auto-derived — no manual creation needed; they update when properties change
- ✅ Added 7 new Vitest unit tests (152 total)
- ✅ Added 2 new Playwright e2e tests (130 total)

Version 51 features - events, guard conditions and actions
==================

- refer to these documents as a reference about state chart diagrams:
  - ![](/screenshots/stateChart_reference.pdf)
  - ![](/screenshots/stateMachineDiagrams_lecture.pdf)
    - [] note this project will require expressions that refer to object properties and methods, and a set of pre-defined events

- declare the following events:
  - after(<timeSecondsAsFloat>)
  - when(<expressionEvaluatingToTrueOrFalse>)
  - keyDown(<key>)
    - allow user to type a character (A-Z characters are forced to be upper case)
    - or can choose from a SpecialKeyType built-in enum class
      - SPACE, ESCAPE, ENTER, CONTROL, LEFT_SHIFT, RIGHT_SHIFT, WINDOWS_COMMAND, BACKSPACE, DELETE, ARROW_LEFT, ARROW, RIGHT, ARROW_UP, ARROW_DOWN

- add a new Terminate state "X" object that can be added to diagrams
  - [] note this type of state can only have transitions entering it
  - no transisition can have a terminate state as the source of the transition

- [] edit mode state behaviours
  - in Edit mode, when a state is selected, in the Inspector
    - hide size, position, connections
    - add 3 sections allowing the user to enter behaviours
      - these can be statements manipulating object properties, and/or calls to methods
        - main section title: "State Behaviours"
          - (section 1) Entry /
            - (allow user to CRUD multiple behaviours)
          - (section 2) Do /
            - (allow user to CRUD multiple behaviours)
          - (section 3) Exit /
            - (allow user to CRUD multiple behaviours)


- add a Load JSON button
  - [] popup a warning that the existing project will be replaced by the loaded project
    - [] if accepted, allow the user to paste in JSON for a new project

- [] edit mode transition event
  - in Edit mode, when a transition is selected, in the Inspector
    - provide a section allowing the user to enter an event
      - section title: "[ guard condition ] "
      - NOTE - this should appear above the transitions actions

- [] edit mode transition guard condition
  - in Edit mode, when a transition is selected, in the Inspector
    - provide a section allowing the user to enter a condition expression
      - section title: "[ guard condition ] "
      - NOTE - this should appear above the transitions actions
      - NOTE - a transition event MUST be declared before a guard condition can be defined
        - a transition event cannot be deleted if there is guard condition
        - (popup a warning to the user if either of these situations occur, and popup an error when loading a JSON project if this situation occurs)

- [] edit mode transition behaviours
  - in Edit mode, when a transition is selected, in the Inspector
    - provide a section allowing the user to enter one or more transition behaviours
      - section title: "/ Transition Behaviours "
        - (allow user to CRUD multiple behaviours)


- [] and add Vitest and Playwright tests for all features implemented


