

Version X features - XXXX
==================

- [] (future state chart features go here)

- [] and add Vitest and Playwright tests for all features implemented



Version 51 features - Sprite built-in class
==================

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
