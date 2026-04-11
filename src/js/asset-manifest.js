/**
 * Asset file manifests built at compile time via Vite's import.meta.glob.
 * Each entry is a relative path from the public/ folder (e.g. "images/foo.png").
 * We only need the file paths for dropdown lists, not the actual file contents.
 */

const imageGlob = import.meta.glob('/public/images/**/*.{png,jpg,jpeg,gif,svg,webp}');
const audioGlob = import.meta.glob('/public/audio/**/*.{wav,mp3,ogg,flac,aac}');

function extractPaths(glob) {
  return Object.keys(glob)
    .map(p => p.replace(/^\/public\//, ''))
    .sort();
}

export const imageFiles = extractPaths(imageGlob);
export const audioFiles = extractPaths(audioGlob);

const exampleGlob = import.meta.glob('/public/examples/**/*.json');
export const exampleFiles = extractPaths(exampleGlob);
