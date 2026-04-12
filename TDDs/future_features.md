

Version X features - XXXX
==================

- [] (future state chart features go here)

- [] and add Vitest and Playwright tests for all features implemented




Version X features - Class Diagram look-and-feel for editing class members
==================

- [] when a Class is being CRUDed, make the Inspector look like a class diagram rectangle
  - [] see /screenshots/class_diagram.png
    - row 1: class name
    - row 2: properties
    - row 3: methods
  - [] NOTE: Ignore visibility (assume all members are public, but you don't need to add the "+" visibility modifier to the editor
  - [] except the data type is a dropdown menu,
  - [] the user only needs to add a default value if the default value checkbox is clicked, likewise for method return value

- [] and add Vitest and Playwright tests for all features implemented


Version X features - more build-in classes
==================

- [] declare read-nly built-in classes for Sound and Image
  - [] user still given drop down from /public/audio and /public/images folders when choosing
  - [] but allow user to see properties and methods for these built-in classes
    - Sound
      - properties
        - String filePath (relative to /public) 
        - Boolean looping (default to False)
        - Float duration
        - Float playHead (from 0 to duration - where Resume would begin playing from if play has been paused)
        - Float volume - in range 0..1 (0 silent, 1 max volume), default to 0.5
      - methods: 
        - Play() - play from playHead location 
        - Pause() - stop playing and leave playHead where it is
        - Stop() 0- stop playing and reset playHead to 0
        - SetLooping(Boolean) - determines whether Play() restarts from 0, or stops when playHead reaches the dend
        - IsPlaying(): Boolean - returns true/false depending on whether sound is currently playing
        - SetVolume(Float)
        - GetVolume(Float)
        - GetPlayHead(): Float
      

- [] and add Vitest and Playwright tests for all features implemented


Version X features - say and menu states
==================

- [] add pauseGame() and resumeGame() methods to the Game class

- [] add a new  Menu state
    - user can CRUD the dialog title / (character name - default to blank) / text
    - [] at run time, the running of the project is paused until closes the popup
    - [] at run time user can click an "OK" button or press ESC to close the popup
      - 

- [] add a new Menu state
  - user can CRUD the menu title / description  / list of options
  - [] at run time, the running of the project is paused until the user clicks a menu choice

- [] and add Vitest and Playwright tests for all features implemented





