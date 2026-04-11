# son-of-fungus-JS

(c) Matt Smith 2026

Vite project -

NOTES
- files in `/public` get added into the build in `/dist`
  - audio
  - images 
  - etc.

## 0. don't forget to install Node packages

```bash
npm install
```


## 1. run dev version

```bash
npm run dev
```

## 2. build dist(ribution) version in `dist`

```bash
npm run build 
```

and preview the build with:
```bash
 npm run preview
```


## Stage virtual co-ordinate system

The co-ordinates for sprites are mapped to a virtual stage:
- vertical (Y-axis)
  - 0 is bottom of screen
  - 100 is top of screen
- horizontal (X-axis)
  - 0 is centre of screen
  - -100 is left of screen
  - +100 is right of screen
