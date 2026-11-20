// Sunset City Cover Maker — wires the page: load up to three photos from the
// machine (never uploaded), pick a layout and a post size, crop and position
// each panel, grade it, write the caption, and export a PNG. A `?shot=`
// query sets up a fixed scene for a screenshot instead (./shots.js).

import { drawCover, renderExport, LAYOUTS, SIZES, GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const captionInput = document.getElementById('caption');
const taglineInput = document.getElementById('tagline');
const sizeSelect = document.getElementById('size');
const gradeSelect = document.getElementById('grade');
const halftoneInput = document.getElementById('halftone');
const panelBar = document.getElementById('panelBar');
const panelPhoto = document.getElementById('panelPhoto');
const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('panX');
const panYInput = document.getElementById('panY');

// The whole poster, in one object: three photo slots, one crop per panel.
const state = {
  photos: [null, null, null],
  layout: 'strip',
  grade: 'sunset',
  halftone: true,
  caption: 'SUNSET CITY CALLED',
  tagline: 'It wants its neon back',
  panels: [
    { photo: 0, zoom: 1.15, panX: 0, panY: 0 },
    { photo: 1, zoom: 1.2, panX: 0, panY: 0 },
    { photo: 0, zoom: 1.4, panX: 0.2, panY: 0 },
    { photo: 1, zoom: 1.3, panX: -0.2, panY: 0 },
  ],
};
let selectedPanel = 0;

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function redraw() {
  drawCover(canvas, state);
  syncPanelControls();
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadFileIntoSlot(slot, file) {
  if (!file) return;
  state.photos[slot] = await loadImage(URL.createObjectURL(file));
  redraw();
  status.textContent = `Photo ${slot + 1} loaded — drag it into place below.`;
}

for (let slot = 0; slot < 3; slot++) {
  document.getElementById(`photo${slot + 1}`).addEventListener('change', (e) => {
    loadFileIntoSlot(slot, e.target.files[0]);
  });
}

document.getElementById('samples').addEventListener('click', async () => {
  state.photos[0] = await loadImage('samples/boulevard.jpg');
  state.photos[1] = await loadImage('samples/pier.jpg');
  redraw();
  status.textContent = 'Sample photos loaded — swap in your own any time.';
});

// Layout switcher: one button per poster layout.
document.querySelectorAll('[data-layout]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.layout = btn.dataset.layout;
    selectedPanel = 0;
    document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b === btn));
    buildPanelBar();
    redraw();
  });
});

sizeSelect.addEventListener('change', () => {
  const s = SIZES[sizeSelect.value];
  canvas.width = s.w;
  canvas.height = s.h;
  redraw();
});
gradeSelect.addEventListener('change', () => { state.grade = gradeSelect.value; redraw(); });
halftoneInput.addEventListener('change', () => { state.halftone = halftoneInput.checked; redraw(); });
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
taglineInput.addEventListener('input', () => { state.tagline = taglineInput.value; redraw(); });

function buildPanelBar() {
  panelBar.innerHTML = '';
  for (let i = 0; i < panelCount(); i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'panelBtn' + (i === selectedPanel ? ' active' : '');
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => { selectedPanel = i; buildPanelBar(); syncPanelControls(); });
    panelBar.appendChild(b);
  }
}

function syncPanelControls() {
  const p = state.panels[selectedPanel] ?? state.panels[0];
  panelPhoto.value = String(p.photo);
  zoomInput.value = String(p.zoom);
  panXInput.value = String(Math.round(p.panX * 100));
  panYInput.value = String(Math.round(p.panY * 100));
  document.getElementById('zoomVal').textContent = `${p.zoom.toFixed(2)}×`;
  document.getElementById('panXVal').textContent = `${Math.round(p.panX * 100)}`;
  document.getElementById('panYVal').textContent = `${Math.round(p.panY * 100)}`;
}

panelPhoto.addEventListener('change', () => {
  state.panels[selectedPanel].photo = Number(panelPhoto.value);
  redraw();
});
zoomInput.addEventListener('input', () => { state.panels[selectedPanel].zoom = Number(zoomInput.value); redraw(); });
panXInput.addEventListener('input', () => { state.panels[selectedPanel].panX = Number(panXInput.value) / 100; redraw(); });
panYInput.addEventListener('input', () => { state.panels[selectedPanel].panY = Number(panYInput.value) / 100; redraw(); });

// Click a panel in the live preview to crop that one.
canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  if (y > 0.76) return; // the caption band is not a panel
  const n = panelCount();
  let hit = 0;
  if (state.layout === 'split') hit = Math.min(n - 1, Math.floor(x * 3));
  else if (state.layout === 'hero') hit = x < 0.6 ? 0 : (y < 0.38 ? 1 : 2);
  else if (state.layout === 'quad') hit = (y < 0.38 ? 0 : 2) + (x < 0.5 ? 0 : 1);
  else hit = y < 0.44 ? 0 : 1 + Math.min(2, Math.floor(x * 3));
  selectedPanel = hit;
  buildPanelBar();
  syncPanelControls();
});

// Drag on the preview to pan the selected panel's photo.
let dragging = null;
canvas.addEventListener('pointerdown', (e) => { dragging = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = state.panels[selectedPanel];
  const r = canvas.getBoundingClientRect();
  p.panX = Math.max(-1, Math.min(1, p.panX + ((e.clientX - dragging.x) / r.width) * 2));
  p.panY = Math.max(-1, Math.min(1, p.panY + ((e.clientY - dragging.y) / r.height) * 2));
  dragging = { x: e.clientX, y: e.clientY };
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });

document.getElementById('export').addEventListener('click', () => {
  const out = renderExport(state, sizeSelect.value);
  const s = SIZES[sizeSelect.value];
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sunset-city-cover-${s.w}x${s.h}.png`;
    a.click();
    status.textContent = `Saved sunset-city-cover-${s.w}x${s.h}.png — post it anywhere.`;
  }, 'image/png');
});

// Fill the size and grade menus from the engine's own tables.
for (const [key, s] of Object.entries(SIZES)) {
  const o = document.createElement('option');
  o.value = key;
  o.textContent = s.label;
  sizeSelect.appendChild(o);
}
for (const [key, g] of Object.entries(GRADES)) {
  const o = document.createElement('option');
  o.value = key;
  o.textContent = g.label;
  gradeSelect.appendChild(o);
}
sizeSelect.value = '1080x1080';
gradeSelect.value = 'sunset';
buildPanelBar();
syncPanelControls();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    async loadSample(name) { return loadImage(`samples/${name}.jpg`); },
    apply(patch) {
      Object.assign(state, patch);
      if (patch.size) {
        const s = SIZES[patch.size];
        canvas.width = s.w;
        canvas.height = s.h;
        sizeSelect.value = patch.size;
      }
      if (patch.layout) {
        document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === patch.layout));
      }
      if (patch.grade) gradeSelect.value = patch.grade;
      if (patch.caption !== undefined) captionInput.value = patch.caption;
      if (patch.tagline !== undefined) taglineInput.value = patch.tagline;
      if (patch.halftone !== undefined) halftoneInput.checked = patch.halftone;
      buildPanelBar();
    },
    redraw,
  });
} else {
  redraw();
}
