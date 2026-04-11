

Version X features - XXXX
==================

- [] (future state chart features go here)

- [] and add Vitest and Playwright tests for all features implemented




Version X features - say and menu state
==================

- [] add a new say/menu state, which can have transitions out from it for each option offered
    - in Inspector user chooses "Say" or "Menu"
      - for Say
        - user can write text to be shown on screen
        - can choose message category
          - ERROR / WARNING / INFORMATION / Dialog
        - [] at run time, the running of the project is paused until closes the popup
        - [] at run time user can click an "OK" button or press ESC to close the popup
      - for Menu
        - user can CRUD the menu title / description  / list of options
        - [] at run time, the running of the project is paused until the user clicks a menu choice


- [] and add Vitest and Playwright tests for all features implemented




Version X features - state chart defined for Class, not individual objects
==================

- [] each Class can have a State Chart
  - [] each object inherits its State Chart from its parent Class
    - [] objects cannot change the state chart they inherit from their Class
    - [] but each object can have different property values, so at runtime, each object maintains its own state chart settings

- [] so when a Class is selected, its State Chart Diagram can be edited
  - [] and we see the state templates acros the top rightr of the screen, that can be dragged into the diagram
- [] when an Object is selected, we can see its State Chart, and select objects to see their properties, but cannot edit the state chart for the individual object

- [] and add Vitest and Playwright tests for all features implemented

