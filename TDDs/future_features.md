

Version X features - XXXX
==================

- [] (future state chart features go here)

- [] and add Vitest and Playwright tests for all features implemented


Version 46 features - object propepties in Data panel
==================

-[] let's call the left hand panel (objects/classes/eums) the 'Data Panel' 
- and the right hand panel the 'Inspector'

- [] correct current behaviour
  - when a Class or Enum Class is selected in the Data Panel
    - its values can be edited in the Inspector

- [] behaviour to fix
  - [] when an object is selected in the Data panel
    - [] we see the State Chart belonging to that objet on the stage
    - [] we see the properties of the selected state chart component in the Inspector
      - [] we see the properties for the object in the Data panel
        - so the Class and Enum Class rows of the Data panel are minimised when an object is selected, and we see a new row for the object's properties
  - [] each object has its own State Chart diagram
    - the state chart should be 'remembered' when different objects are selcted
      - [] for example, if I select an object 'game', and add a new state and transition to its state chart
      - then I select an object 'ship' and add a new Start State to the ship's state chart
      - then I select 'game' I should see the game's state chart just it was when I edited it previously

- [] (future state chart features go here)

- [] and add Vitest and Playwright tests for all features implemented