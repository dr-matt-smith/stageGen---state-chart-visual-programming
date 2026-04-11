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

Version 51 - Events, guard conditions and actions
==================

- ✅ SpecialKeyType built-in enum class with values:
  - SPACE, ESCAPE, ENTER, CONTROL, LEFT_SHIFT, RIGHT_SHIFT, WINDOWS_COMMAND, BACKSPACE, DELETE, ARROW_LEFT, ARROW_RIGHT, ARROW_UP, ARROW_DOWN

- ✅ Terminate state "X" node added to toolbar and canvas
  - ✅ Only transitions entering it allowed (no outgoing connection handle)
  - ✅ Cannot be a connection source via reconnect drag
  - ✅ Red X styling with light/dark mode support

- ✅ State behaviours (Entry / Do / Exit)
  - ✅ When a state node is selected, Inspector shows "State Behaviours" with 3 subsections
  - ✅ Size, Position, Connections hidden — replaced by behaviour editing
  - ✅ Each subsection (Entry /, Do /, Exit /) supports CRUD of multiple behaviour strings

- ✅ Load JSON button
  - ✅ Shown next to Export JSON on canvas overlay
  - ✅ Confirms that current project will be replaced
  - ✅ Provides textarea to paste JSON, with validation
  - ✅ Validates guard conditions require events on load

- ✅ Transition events
  - ✅ Event section in connection inspector with type dropdown: after(seconds), when(expression), keyDown(key)
  - ✅ keyDown supports single character (forced uppercase) or SpecialKeyType dropdown
  - ✅ Shown above guard condition section

- ✅ Transition guard conditions
  - ✅ Guard condition section with editable expression
  - ✅ Requires an event — shows "Set an event first" hint when no event
  - ✅ Event cannot be removed while guard condition exists (alert shown)

- ✅ Transition behaviours
  - ✅ "/ Transition Behaviours" section with CRUD for multiple behaviour strings

- ✅ Serialisation updated to include behaviours, events, guards
- ✅ Added 10 new Vitest unit tests (162 total)
- ✅ Added 8 new Playwright e2e tests (138 total)



Version 52 - Sprite built-in class, runtime engine
==================

- ✅ Game class updated with tickIntervalSeconds property (Real, default 0.1)

- ✅ Built-in Sprite class with properties:
  - name, displayImage (Image), moveSound (Sound), visible (Boolean, default true),
  - xPosition, yPosition, dx, dy (Real), tint (Object/CSSColor)
  - ✅ move() method: adds dx to xPosition, dy to yPosition

- ✅ Built-in CSSColor class with methods:
  - setColor(colorName), setR(redValue), setG(greenValue), setB(blueValue), setTransparency(alpha)

- ✅ Built-in "stage" object with properties:
  - xMin, yMin, xMax, yMax (Real), backgroundColour (String)

- ✅ Runtime engine (src/js/runtime.js) using functional state pattern
  - ✅ Each object gets a runtime context with current state and property values
  - ✅ Handles state transitions: entry behaviours → do behaviours → check events → exit → transition → enter new state
  - ✅ Event evaluation: after(seconds), when(expression), keyDown(key)
  - ✅ Guard condition evaluation with comparison operators
  - ✅ Behaviour execution: property assignment, method calls, move() for sprites
  - ✅ Simple expression evaluator for arithmetic and comparisons
  - ✅ Keyboard event handling with key normalisation and SpecialKeyType mapping

- ✅ Run/Stop button in toolbar
  - ✅ Validates all objects (except stage) have Start states
  - ✅ Shows error listing objects missing Start states
  - ✅ Runtime stage overlay renders Sprite objects based on xPosition/yPosition/visible
  - ✅ Stage background colour from stage object
  - ✅ Tick interval from Game object's tickIntervalSeconds property
  - ✅ Button toggles between Run (green play icon) and Stop (red square icon)

- ✅ Inspector and Data panel show explicit class methods alongside auto-generated sound methods
- ✅ Added 8 new Vitest unit tests (170 total)
- ✅ Added 6 new Playwright e2e tests (144 total)


Version 53 features - move Terminate state to left of Play
==================

- ✅ add a keyUp() event for transitions

- ✅add a Load button, that offers a list of saved JSON files from: /public/examples

- ✅ Moved Terminate button in toolbar to be next to End (order: State, Start, End, Terminate, Choice, | Run)
- ✅ Added 2 new Vitest unit tests (172 total)
- ✅ Added 2 new Playwright e2e tests (148 total)


Version 54 - Build button to export runnable ZIP
==================

- ✅ "Build" button added to canvas overlay (next to Export/Load JSON)
- ✅ Generates a runnable ZIP containing:
  - ✅ index.html — standalone HTML with embedded CSS link and JavaScript runtime + project data
  - ✅ /images — referenced image files from the project
  - ✅ /sounds — referenced sound files from the project
  - ✅ /css/style.css — CSS rules for the runtime stage and sprites
- ✅ Standalone runtime includes: state machine engine, event handling, sprite rendering, tick loop
- ✅ ZIP downloads automatically with project name as filename
- ✅ Added 2 new Vitest unit tests (174 total)
- ✅ Added 3 new Playwright e2e tests (151 total)

Version 55 features - relative stage coordinate system
==================

- ✅ Virtual coordinate system mapped to actual screen space:                                  
  - ✅ X: -100 (left) to 100 (right), center = 0                                               
  - ✅ Y: 0 (bottom) to 100 (top)                                                              
  - ✅ Formula: screenX = (vx + 100) / 200 * stageWidth, screenY = (1 - vy / 100) * stageHeight
- ✅ Sprites with values exceeding limits are positioned off-screen (partially or fully invisible)                                                                                            
- ✅ Applied to both editor runtime and standalone build runtime                               
- ✅ Added 7 new Vitest unit tests (181 total)                                                 
- ✅ 151 Playwright e2e tests passing  


Version 56 - Scaling of sprites to virtual stage coordinates
==================

- ✅ Added 3 new properties to Sprite class:
  - ✅ scaleToStage (Boolean, default false)
  - ✅ widthStagePixels (Real) — width in virtual stage units (out of 200)
  - ✅ heightStagePixels (Real) — height in virtual stage units (out of 100)
- ✅ When scaleToStage is true, sprite rendered at scaled size:
  - width = widthStagePixels / 200 * stageWidth pixels
  - height = heightStagePixels / 100 * stageHeight pixels
  - e.g. heightStagePixels=10 on a 600px stage = 60px (10% of stage height)
- ✅ Applied to both editor runtime and standalone build runtime
- ✅ Images scale to fill the computed dimensions when scaleToStage is true
- ✅ Added 4 new Vitest unit tests (185 total)
- ✅ 151 Playwright e2e tests passing



Version 57 - Stage class and stage object
==================

- ✅ Built-in Stage class with properties:
  - ✅ bgTint (CSSColor) — stage background tint
  - ✅ bgImage (Image) — stage background image
  - ✅ xMinVirtual (Real, default -100), xMaxVirtual (Real, default 100)
  - ✅ yMinVirtual (Real, default 0), yMaxVirtual (Real, default 100)
  - ✅ minYAtBottomOfScreen (Boolean, default true) — Y=0 at bottom when true
- ✅ Stage object now uses Stage class (replaced old hardcoded stageProperties)
- ✅ Virtual coordinate system uses configurable bounds from Stage class
  - ✅ Both editor runtime and standalone build use the Stage object's virtual dimensions
  - ✅ Sprite scaling uses dynamic xRange/yRange from Stage bounds
- ✅ bgImage included in Build ZIP when set
- ✅ bgTint and bgImage applied to runtime stage background
- ✅ Sprite tint property changed from Object to CSSColor type
- ✅ Added 8 new Vitest unit tests (193 total)
- ✅ 151 Playwright e2e tests passing

Version 58 - Options to stretch bg image to fit stage
==================

- ✅ Built-in BgImageFit enum with values: FIT_TO_STAGE, FIT_WIDTH, FIT_HEIGHT, CENTRE
- ✅ Stage class has bgImageFit property (EnumClass, default FIT_TO_STAGE)
  - ✅ FIT_TO_STAGE — stretches image to fill stage (100% 100%)
  - ✅ FIT_WIDTH — fits width, auto height (100% auto)
  - ✅ FIT_HEIGHT — fits height, auto width (auto 100%)
  - ✅ CENTRE — natural size, centered on stage
- ✅ Applied to both editor runtime and standalone build runtime
- ✅ Added 7 new Vitest unit tests (200 total)
- ✅ 151 Playwright e2e tests passing




