// Sunset City Cover Maker — the render engine.
// Draws a multi-panel GTA-style poster cover onto any canvas: several photo
// panels (each cropped and positioned on its own), a sunset / neon colour
// grade, halftone dots, a vignette, and big bold caption lettering in a
// sunset band along the foot. Pure canvas 2D, no network, no fonts to load:
// lettering uses the system sans-serif stack in its heaviest weight.

export const LAYOUTS = {
  strip: { label: 'Sunset Strip', panels: 4 },
  split: { label: 'Triple Split', panels: 3 },
  hero: { label: 'Big Hero', panels: 3 },
  quad: { label: 'Four Corners', panels: 4 },
};

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide · 1920 × 1080' },
};

export const GRADES = {
  sunset: { label: 'Sunset', top: 'rgba(255,140,60,0)', mid: 'rgba(255,80,120,0.28)', low: 'rgba(120,20,110,0.55)' },
  neon: { label: 'Neon Nights', top: 'rgba(0,240,255,0)', mid: 'rgba(255,0,180,0.30)', low: 'rgba(40,0,90,0.60)' },
  miami: { label: 'Miami Duotone', top: 'rgba(255,0,150,0.10)', mid: 'rgba(0,220,255,0.22)', low: 'rgba(255,0,150,0.45)' },
  noir: { label: 'Noir', top: 'rgba(0,0,0,0)', mid: 'rgba(0,0,0,0.25)', low: 'rgba(0,0,0,0.65)' },
};

/** Panel rectangles (fractions of the canvas) for a layout. Panels fill the
 *  top ~76% of the cover; the foot is the caption band. */
export function layoutPanels(layout, w, h) {
  const ph = h * 0.76; // panel area height
  const g = w * 0.008; // gutter
  if (layout === 'split') {
    const pw = (w - g * 4) / 3;
    return [0, 1, 2].map((i) => ({ x: g + i * (pw + g), y: g, w: pw, h: ph - g * 2 }));
  }
  if (layout === 'hero') {
    const left = w * 0.6;
    const rw = w - left - g * 3;
    return [
      { x: g, y: g, w: left - g, h: ph - g * 2 },
      { x: left + g, y: g, w: rw, h: (ph - g * 3) / 2 },
      { x: left + g, y: g * 2 + (ph - g * 3) / 2, w: rw, h: (ph - g * 3) / 2 },
    ];
  }
  if (layout === 'quad') {
    const pw = (w - g * 3) / 2;
    const phh = (ph - g * 3) / 2;
    return [
      { x: g, y: g, w: pw, h: phh },
      { x: g * 2 + pw, y: g, w: pw, h: phh },
      { x: g, y: g * 2 + phh, w: pw, h: phh },
      { x: g * 2 + pw, y: g * 2 + phh, w: pw, h: phh },
    ];
  }
  // strip (default): one big hero panel, three comic-strip panels beneath it.
  const heroH = ph * 0.58;
  const stripH = ph - heroH - g;
  const pw = (w - g * 4) / 3;
  return [
    { x: g, y: g, w: w - g * 2, h: heroH - g },
    { x: g, y: heroH + g, w: pw, h: stripH - g },
    { x: g * 2 + pw, y: heroH + g, w: pw, h: stripH - g },
    { x: g * 3 + pw * 2, y: heroH + g, w: pw, h: stripH - g },
  ];
}

/** Draws one photo into a panel rect, cover-fit, with per-panel zoom and pan.
 *  panX / panY are -1..1 fractions of the spare room; zoom is 1..2.5. */
export function drawPanelPhoto(ctx, photo, rect, zoom, panX, panY, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (photo) {
    if (grade === 'noir') ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.02)';
    else if (grade === 'miami') ctx.filter = 'saturate(1.35) contrast(1.08)';
    else ctx.filter = 'saturate(1.25) contrast(1.06)';
    const base = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight);
    const s = base * zoom;
    const pw = photo.naturalWidth * s;
    const ph = photo.naturalHeight * s;
    const spareX = Math.max(0, (pw - rect.w) / 2);
    const spareY = Math.max(0, (ph - rect.h) / 2);
    ctx.drawImage(photo, rect.x + (rect.w - pw) / 2 - panX * spareX, rect.y + (rect.h - ph) / 2 - panY * spareY, pw, ph);
    ctx.filter = 'none';
  } else {
    // Empty panel: a sunset placeholder so the poster still reads as art.
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    g.addColorStop(0, '#ff9a3d');
    g.addColorStop(0.55, '#ff2e88');
    g.addColorStop(1, '#3b0a54');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold ${Math.round(rect.h * 0.09)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('YOUR PHOTO HERE', rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
  // Colour grade wash.
  const gradeDef = GRADES[grade] ?? GRADES.sunset;
  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, gradeDef.top);
  wash.addColorStop(0.55, gradeDef.mid);
  wash.addColorStop(1, gradeDef.low);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Halftone comic dots over a rect, denser toward the bottom. */
export function drawHalftone(ctx, rect) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const step = Math.max(9, rect.w * 0.014);
  ctx.fillStyle = 'rgba(20,0,40,0.16)';
  for (let y = rect.y + step / 2; y < rect.y + rect.h; y += step) {
    const depth = (y - rect.y) / rect.h; // 0 top .. 1 bottom
    const r = step * (0.10 + depth * 0.22);
    for (let x = rect.x + step / 2; x < rect.x + rect.w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  }
  return size;
}

/** Draws the whole cover: panels, grades, halftone, vignette, caption band.
 *  `state` = { photos, layout, grade, halftone, caption, tagline, panels }.
 *  panels[i] = { photo, zoom, panX, panY } — photo is an index into photos. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = state.grade ?? 'sunset';
  ctx.fillStyle = '#14061f';
  ctx.fillRect(0, 0, w, h);

  const rects = layoutPanels(state.layout ?? 'strip', w, h);
  rects.forEach((rect, i) => {
    const p = (state.panels ?? [])[i] ?? { photo: 0, zoom: 1, panX: 0, panY: 0 };
    const photo = (state.photos ?? [])[p.photo] ?? null;
    drawPanelPhoto(ctx, photo, rect, p.zoom ?? 1, p.panX ?? 0, p.panY ?? 0, grade);
    if (state.halftone) drawHalftone(ctx, rect);
    // Crisp white comic frame around every panel.
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  // Vignette: pulls the eye to the middle of the poster.
  const vig = ctx.createRadialGradient(w / 2, h * 0.38, Math.min(w, h) * 0.35, w / 2, h * 0.45, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,0,25,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Caption band: sunset gradient with a hard neon edge.
  const bandY = h * 0.76;
  const band = ctx.createLinearGradient(0, bandY, 0, h);
  band.addColorStop(0, '#2a0a4a');
  band.addColorStop(0.45, '#c2187a');
  band.addColorStop(1, '#ff7a2f');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, h - bandY);
  ctx.fillStyle = '#00e5ff';
  ctx.fillRect(0, bandY, w, Math.max(3, h * 0.006));

  const caption = (state.caption ?? '').trim().toUpperCase();
  const tagline = (state.tagline ?? '').trim();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (caption) {
    const size = fitFont(ctx, caption, w * 0.92, h * 0.085);
    const cy = tagline ? bandY + (h - bandY) * 0.38 : bandY + (h - bandY) * 0.52;
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.14;
    ctx.strokeStyle = '#16041f';
    ctx.strokeText(caption, w / 2, cy);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,229,255,0.8)';
    ctx.shadowBlur = size * 0.18;
    ctx.fillText(caption, w / 2, cy);
    ctx.shadowBlur = 0;
  }
  if (tagline) {
    const tSize = fitFont(ctx, tagline.toUpperCase(), w * 0.8, h * 0.028);
    ctx.font = `800 ${tSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ffe14d';
    ctx.fillText(tagline.toUpperCase(), w / 2, bandY + (h - bandY) * 0.78);
  }
}

/** Renders the cover at full export size on a fresh canvas and returns it. */
export function renderExport(state, sizeKey) {
  const size = SIZES[sizeKey] ?? SIZES['1080x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state);
  return canvas;
}
