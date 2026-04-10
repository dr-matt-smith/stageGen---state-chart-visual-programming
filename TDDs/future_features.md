

Version X features - XXXX
==================

- [] (future state chart features go here)

- [] and add Vitest and Playwright tests for all features implemented



Version 51 features - Sprite built-in class
==================


- context/background to this version set of features:
    - this diagram tool is for creating interactive graphical applications, such as arcade and puzzle games, and interactive multiple language teaching books and quizzes
        - so when running there will be the visible 'stage'
        - sprites are objects with a graphical display and a position
            - they may be positions on or off the stage
            - they may be visible or not
    - so the state chart diagram for each object will determine changes in object properties, which in term will change what is visible / audible to the user


- [] add to the built-in Game class a property:
    - tickIntervalSeconds: Float
        - default value 0.1

- [] declare a built-in class "Sprite"
    - it has the following members
    - but user can CRUD members when editing a project
        - properties:
            - name: String
            - displayImage: Image
            - moveSound: Sound
            - visible: Boolean (default value = true)
            - xPosition: Float
            - yPosition: Float
            - dx: Float
            - dy: Float
            - tint: CSSColor
        - methods:
            - move() - this adds dx to xPosition, and dy to yPosition

- [] declare a built-in class "CSSColor"
    - objects of this class can store as CSS color & a level of transparency
        - methods
            - setColor(<CSS color name>)
            - setR(<redValue>)
            - setG(<redValue>)
            - setB(<redValue>)
            - setTransparency(<Float in range 0..1>)

- [] declare a built-in object "stage"
    - this refers to the screen at in run-mode
        - properties:
            - xMax: Float
            - yMax: Float
            - xMin: Float
            - yMax: Float
            - backgroundColour: CSSColor

- [] create a Run button
    - this will create each object, and trigger the 'Start' states for each object
    - popup an error, listing any objects whose state charts are missing a 'Start' state
    - [] in Run mode, when events occur, they can trigger transitions for objects from one state to another
    - [] each Sprite object will appear on (or off) stage based on its (xPosition, yPosition) values and 'visible' value

    - implement the runtime model using the functional approach (not the class state pattern approach) described on this page 
      - https://medium.com/@artemkhrenov/the-state-pattern-in-javascript-11446954a780

- [] and add Vitest and Playwright tests for all features implemented



Version X features - say and menu state
==================

- [] add a new say/menu state, which can have transitions out from it for each option offered
    - in Inspector user choses "Say" or "Menu"
      - for Say
        - user can write text to be shown on screen
        - can choose message category
          - ERROR / WARING / INFORMATION / Dialog
        - [] at run time, the running of the project is paused until closes the popup
        - [] at run time user can click an "OK" button or press ESC to close the popup
      - for Menu
        - user can CRUD the menu title / description  / list of options
        - [] at run time, the running of the project is paused until the user clicks a menu choice


- [] and add Vitest and Playwright tests for all features implemented

